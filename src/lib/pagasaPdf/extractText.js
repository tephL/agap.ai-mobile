// Minimal PDF text extractor tuned for PAGASA Tropical Cyclone Bulletins.
// These bulletins are 2-page PDFs whose body text splits into two font kinds:
//   - TrueType fonts using /WinAnsiEncoding  -> string bytes decode directly
//     (the digits, names, and "Forecast" labels use these).
//   - Type0 / Identity-H fonts               -> hex strings whose glyph CIDs are
//     mapped to Unicode via each font's /ToUnicode CMap.
// This module decompresses the Flate content streams, walks the operator stream,
// decodes text runs with the right font encoding, and assembles lines from the
// Tm / Td vertical positions. It is intentionally narrow (pure JS, no deps) so
// it can run inside React Native; it is not a general PDF engine.

// ---------------------------------------------------------------------------
// Low-level PDF object scanning
// ---------------------------------------------------------------------------

// Build a map of object-id -> { start, end } covering ONLY top-level objects,
// skipping `stream ... endstream` binary payloads (which would otherwise match
// spurious "N 0 obj" byte sequences when decoded as latin-1).
function buildObjectIndex(pdf) {
  const index = new Map();
  const idNameRe = /(\d+)\s+0\s+obj/g;
  let m;
  while ((m = idNameRe.exec(pdf))) {
    // A clean object header starts at a non-alphanumeric boundary
    const before = m.index > 0 ? pdf[m.index - 1] : " ";
    if (/[0-9]/.test(before)) continue;
    const id = parseInt(m[1], 10);
    // find the matching endobj (must come after the header and any stream)
    const bodyStart = m.index;
    const headerEnd = m.index + m[0].length;
    // scan forward from headerEnd for endobj
    const streamLook = /stream\r?\n/.exec(pdf.slice(headerEnd));
    let bodyEnd = pdf.indexOf("endobj", headerEnd);
    if (streamLook) {
      const streamAt = headerEnd + streamLook.index;
      // skip to the matching endstream then find endobj after it
      const endstreamAt = pdf.indexOf("endstream", streamAt);
      const after = endstreamAt > -1 ? endstreamAt + "endstream".length : headerEnd;
      const endobjAt = pdf.indexOf("endobj", after);
      bodyEnd = endobjAt;
    }
    // take the first occurrence of each id in document order
    if (!index.has(id)) {
      index.set(id, { start: bodyStart, end: bodyEnd });
    }
  }
  return index;
}

// Return the raw body bytes of object <id> (from "<id> 0 obj" to "endobj").
function objectBody(pdf, id) {
  const index = buildObjectIndex(pdf);
  const range = index.get(id);
  if (!range) return null;
  if (range.end === -1) return null;
  return pdf.slice(range.start, range.end);
}

// Extract the raw (compressed) stream bytes of object <id> directly from the
// original Uint8Array, using byte offsets located by the structural scan.
// Returns null on missing/corrupt/non-flate objects.
function rawStreamBytes(pdfU8, id) {
  const pdfStr = latin1(pdfU8);
  const index = buildObjectIndex(pdfStr);
  const range = index.get(id);
  if (!range || range.end === -1) return null;
  const bodyStr = pdfStr.slice(range.start, range.end);
  const sm = /stream\r?\n/.exec(bodyStr);
  if (!sm) return null;
  if (/\bFilter\b/.test(bodyStr) && !/FlateDecode\b/.test(bodyStr)) return null;
  const streamStart = range.start + sm.index + sm[0].length;
  const esRel = bodyStr.indexOf("endstream", sm.index);
  if (esRel === -1) return null;
  const streamEnd = range.start + esRel;
  // clip any trailing \r\n before endstream
  return pdfU8.subarray(streamStart, streamEnd);
}

// Build a 1:1 ISO-8859-1 string (byte value == code unit value). This is the
// safe inverse of what TextDecoder("latin1") wrongly does (it speaks 1252).
function latin1(u8) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    const sub = u8.subarray(i, i + chunk);
    let part = "";
    for (let j = 0; j < sub.length; j++) part += String.fromCharCode(sub[j]);
    s += part;
  }
  return s;
}

// Try to decode a FlateDecode stream object by its id, given the full PDF as a
// Uint8Array. Returns null when absent, non-flate, or corrupt.
async function streamDataFromObject(pdfU8, id) {
  const bytes = rawStreamBytes(pdfU8, id);
  if (!bytes) return null;
  try {
    return await inflateRaw(bytes);
  } catch (_) {
    return null;
  }
}

async function inflateRaw(bytes) {
  // bytes is a Uint8Array of the compressed stream
  try {
    // Use DecompressionStream when available (modern hosts), else fall back to
    // the bundled synchronous inflate implementation.
    if (typeof DecompressionStream !== "undefined") {
      return await inflateViaStream(bytes);
    }
  } catch (_) {
    // fall through to fallback
  }
  return inflateSyncFallback(bytes);
}

async function inflateViaStream(bytes) {
  // PDF FlateDecode streams are zlib-wrapped; DecompressionStream("deflate")
  // expects exactly that, so pass the bytes through as-is.
  const ds = new DecompressionStream("deflate");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// Minimal synchronous inflate (raw DEFLATE) fallback for environments without
// DecompressionStream. Pure-JS, handles stored + fixed + dynamic Huffman blocks.
// Implemented here so extraction still works on hosts without web streams.
function inflateSyncFallback(input) {
  // Skip an optional zlib header (PDF FlateDecode streams are zlib-wrapped).
  // A zlib header starts with CMF=0x78 (compression method 8).
  if (input.length >= 2 && input[0] === 0x78) {
    const flg = input[1];
    let hdrLen = 2;
    if ((flg & 0x20) !== 0) hdrLen += 4; // FCHECK FDICT preset
    input = input.subarray(hdrLen);
  }
  // Bit reader (LSB-first)
  let bitBuf = 0;
  let bitCnt = 0;
  let pos = 0;
  function bits(n) {
    while (bitCnt < n) {
      bitBuf |= input[pos++] << bitCnt;
      bitCnt += 8;
    }
    const v = bitBuf & ((1 << n) - 1);
    bitBuf >>>= n;
    bitCnt -= n;
    return v;
  }
  const out = [];
  // canonical huffman decode table
  function buildTable(lengths) {
    const max = Math.max(0, ...lengths);
    const blCount = new Array(max + 1).fill(0);
    for (const l of lengths) if (l > 0) blCount[l]++;
    const nextCode = new Array(max + 1).fill(0);
    let code = 0;
    for (let l = 1; l <= max; l++) {
      code = (code + blCount[l - 1]) << 1;
      nextCode[l] = code;
    }
    const table = [];
    for (let i = 0; i < lengths.length; i++) {
      const l = lengths[i];
      if (l === 0) continue;
      let c = nextCode[l]++;
      // reverse bits of c to l bits (deflate is LSB-first for codes too)
      let rev = 0;
      for (let b = 0; b < l; b++) {
        rev = (rev << 1) | (c & 1);
        c >>= 1;
      }
      table.push({ bits: l, code: rev, symbol: i });
    }
    return table;
  }
  function decodeSymbol(table, maxBits) {
    let code = 0;
    for (let len = 1; len <= maxBits; len++) {
      code |= bits(1) << (len - 1);
      for (const e of table) {
        if (e.bits === len && e.code === code) return e.symbol;
      }
    }
    throw new Error("bad huffman");
  }
  const LENGTH_BASE = [
    3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,
  ];
  const LENGTH_EXTRA = [
    0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,
  ];
  const DIST_BASE = [
    1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,
  ];
  const DIST_EXTRA = [
    0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,
  ];
  const CLEN_ORDER = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  let litTable = null;
  let distTable = null;
  let litMax = 0;
  let distMax = 0;

  while (true) {
    const bfinal = bits(1);
    const btype = bits(2);
    if (btype === 0) {
      // stored — byte aligned
      bitBuf = 0;
      bitCnt = 0;
      const len = input[pos] | (input[pos + 1] << 8);
      pos += 4;
      for (let i = 0; i < len; i++) out.push(input[pos++]);
    } else if (btype === 1) {
      // fixed — build literal and distance tables
      const litLengths = new Array(288);
      for (let i = 0; i <= 143; i++) litLengths[i] = 8;
      for (let i = 144; i <= 255; i++) litLengths[i] = 9;
      for (let i = 256; i <= 279; i++) litLengths[i] = 7;
      for (let i = 280; i <= 287; i++) litLengths[i] = 8;
      const distLengths = new Array(30).fill(5);
      litTable = buildTable(litLengths);
      litMax = 9;
      distTable = buildTable(distLengths);
      distMax = 5;
    } else if (btype === 2) {
      // dynamic
      const hlit = bits(5) + 257;
      const hdist = bits(5) + 1;
      const hclen = bits(4) + 4;
      const clenLengths = new Array(19).fill(0);
      for (let i = 0; i < hclen; i++) clenLengths[CLEN_ORDER[i]] = bits(3);
      const clenTable = buildTable(clenLengths);
      const clenMax = Math.max(0, ...clenLengths);
      const lenCodes = [];
      while (lenCodes.length < hlit + hdist) {
        let sym = decodeSymbol(clenTable, clenMax);
        if (sym < 16) {
          lenCodes.push(sym);
        } else if (sym === 16) {
          const prev = lenCodes[lenCodes.length - 1];
          const rep = 3 + bits(2);
          for (let i = 0; i < rep; i++) lenCodes.push(prev);
        } else if (sym === 17) {
          const rep = 3 + bits(3);
          for (let i = 0; i < rep; i++) lenCodes.push(0);
        } else {
          const rep = 11 + bits(7);
          for (let i = 0; i < rep; i++) lenCodes.push(0);
        }
      }
      const litLengths = lenCodes.slice(0, hlit);
      const distLengths = lenCodes.slice(hlit, hlit + hdist);
      litTable = buildTable(litLengths);
      litMax = Math.max(0, ...litLengths);
      distTable = buildTable(distLengths);
      distMax = Math.max(0, ...distLengths);
    }
    // decode symbols
    while (true) {
      const sym = decodeSymbol(litTable, litMax);
      if (sym < 256) {
        out.push(sym);
      } else if (sym === 256) {
        break;
      } else {
        const lenIdx = sym - 257;
        const length = LENGTH_BASE[lenIdx] + bits(LENGTH_EXTRA[lenIdx]);
        const distSym = decodeSymbol(distTable, distMax);
        const dist = DIST_BASE[distSym] + bits(DIST_EXTRA[distSym]);
        for (let i = 0; i < length; i++) {
          out.push(out[out.length - dist]);
        }
      }
    }
    if (bfinal) break;
  }
  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// ToUnicode CMap parsing
// ---------------------------------------------------------------------------
function parseToUnicode(text) {
  const map = new Map();
  const bf = /beginbfchar\s+([\s\S]*?)endbfchar/g;
  const br = /beginbfrange\s+([\s\S]*?)endbfrange/g;
  let m;
  while ((m = bf.exec(text))) {
    for (const token of m[1].match(/<[0-9a-fA-F\s]*>/g) || []) {
      const hex = token.replace(/[<>]/g, "").replace(/\s+/g, "");
      const pair = hex.match(/^([0-9a-fA-F]+) *([0-9a-fA-F]+)$/);
      if (pair) {
        const cid = parseInt(pair[1], 16);
        const uniHex = pair[2];
        map.set(cid, hexToStr(uniHex));
      }
    }
  }
  while ((m = br.exec(text))) {
    const block = m[1];
    const lines = block.split("\n");
    for (const line of lines) {
      const mm = line.match(
        /^\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*$/i
      );
      if (!mm) continue;
      const start = parseInt(mm[1], 16);
      const end = parseInt(mm[2], 16);
      let code = parseInt(mm[3], 16);
      for (let cid = start; cid <= end; cid++, code++) {
        map.set(cid, strFromCodePoint(code));
      }
    }
  }
  return map;
}

function hexToStr(hex) {
  let s = "";
  for (let i = 0; i < hex.length; i += 4) {
    s += String.fromCodePoint(parseInt(hex.slice(i, i + 4), 16));
  }
  return s;
}

function strFromCodePoint(cp) {
  return String.fromCodePoint(cp);
}

// ---------------------------------------------------------------------------
// Content stream text analysis
// ---------------------------------------------------------------------------

const WIN_ANSI_HIGH = {
  0x80: "\u20AC", 0x82: "\u201A", 0x83: "\u0192", 0x84: "\u201E",
  0x85: "\u2026", 0x86: "\u2020", 0x87: "\u2021", 0x88: "\u02C6",
  0x89: "\u2030", 0x8A: "\u0160", 0x8B: "\u2039", 0x8C: "\u0152",
  0x8E: "\u017D", 0x91: "\u2018", 0x92: "\u2019", 0x93: "\u201C",
  0x94: "\u201D", 0x95: "\u2022", 0x96: "\u2013", 0x97: "\u2014",
  0x98: "\u02DC", 0x99: "\u2122", 0x9A: "\u0161", 0x9B: "\u203A",
  0x9C: "\u0153", 0x9E: "\u017E", 0x9F: "\u0178",
};

// Split a page's content stream into text runs, decoding with the active font.
// Returns an array of { y, x, text } where y is the baseline rise (PDF coords,
// larger = higher on page; we invert later) and x is the left start.
function analyzeContent(content, fontEncodings) {
  const runs = [];
  const tokens = tokenize(content);
  let font = "F1";
  let tx = 0;
  let ty = 0;
  let lineY = 0;

  const setTextMatrix = (f) => {
    // f = [a,b,c,d,e,f]; x=e, y=f
    if (f.length >= 6) {
      tx = f[4];
      ty = f[5];
    }
  };

  for (const t of tokens) {
    const op = t.op;
    if (op === "Tf") {
      font = t.args[0];
    } else if (op === "Tm") {
      setTextMatrix(t.args);
      lineY = ty;
    } else if (op === "Td" || op === "TD") {
      const txOff = t.args[0] ?? 0;
      const tyOff = t.args[1] ?? 0;
      tx += txOff;
      ty += tyOff;
      lineY = ty;
    } else if (op === "T*") {
      tx = 0;
      ty -= 14 * 0.75;
      lineY = ty;
    } else if (op === "Tj" || op === "TJ") {
      const text = decodeRun(t.args, font, fontEncodings);
      // For TJ arrays, approximate x by advancing tx per string; simpler: use
      // cumulative string text into one run at lineY/tx.
      runs.push({ y: ty !== 0 ? ty : lineY, x: tx, text });
      // advance tx crudely by text length (for subsequent runs on same line)
      tx += text.length * 5;
    }
  }
  return runs;
}

function decodeRun(args, fontName, fontEncodings) {
  const enc = fontEncodings[fontName];
  let out = "";
  for (const a of args) {
    if (a == null) continue;
    if (typeof a === "number") {
      // kerning offset; treat large negative offsets as a space-like gap
      continue;
    }
    out += decodeBytes(a, enc);
  }
  return out;
}

function decodeBytes(bytes, enc) {
  let out = "";
  if (enc && enc.kind === "toUnicode") {
    // Type0: each byte is a CID in a 1-byte codespace
    for (let i = 0; i < bytes.length; i++) {
      const ch = enc.map.get(bytes[i]);
      out += ch != null ? ch : "\uFFFD";
    }
    return out;
  }
  // WinAnsi / direct: byte == char
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (WIN_ANSI_HIGH[b] != null) {
      out += WIN_ANSI_HIGH[b];
    } else {
      out += String.fromCharCode(b);
    }
  }
  return out;
}

// Minimal content-stream tokenizer producing {op, args:[...]} for the
// operators we care about. Values: numbers -> number, strings -> Uint8Array.
function tokenize(content) {
  const tokens = [];
  let i = 0;
  const n = content.length;
  const readNumber = () => {
    let s = "";
    while (i < n && /[0-9+eE.+\-]/.test(content[i])) {
      s += content[i];
      i++;
    }
    return parseFloat(s);
  };
  const readString = () => {
    // bytes between parentheses with balanced parens / escapes
    i++; // (
    const bytes = [];
    let depth = 0;
    while (i < n) {
      const ch = content[i];
      if (ch === "\\") {
        const nxt = content[i + 1];
        if (nxt === "n") { bytes.push(10); i += 2; }
        else if (nxt === "r") { bytes.push(13); i += 2; }
        else if (nxt === "t") { bytes.push(9); i += 2; }
        else if (nxt === "b") { bytes.push(8); i += 2; }
        else if (nxt === "f") { bytes.push(12); i += 2; }
        else if (nxt === "(") { bytes.push(40); i += 2; }
        else if (nxt === ")") { bytes.push(41); i += 2; }
        else if (nxt === "\\") { bytes.push(92); i += 2; }
        else if (/\d/.test(nxt)) {
          const oct = content.slice(i + 1, i + 4);
          const m = /^(\d{3})/.exec(oct);
          bytes.push(parseInt(m[1], 8));
          i += 4;
        } else {
          bytes.push(nxt.charCodeAt(0));
          i += 2;
        }
        continue;
      }
      if (ch === "(") { depth++; i++; continue; }
      if (ch === ")") {
        if (depth === 0) { i++; break; }
        depth--;
        i++;
        continue;
      }
      bytes.push(content.charCodeAt(i));
      i++;
    }
    return new Uint8Array(bytes);
  };
  const readHexString = () => {
    i++; // <
    let hex = "";
    while (i < n && content[i] !== ">") {
      hex += content[i];
      i++;
    }
    i++; // >
    hex = hex.replace(/\s+/g, "");
    if (hex.length % 2) hex += "0";
    const bytes = new Uint8Array(hex.length / 2);
    for (let k = 0; k < bytes.length; k++) {
      bytes[k] = parseInt(hex.slice(k * 2, k * 2 + 2), 16);
    }
    return bytes;
  };

  const readOp = () => {
    while (i < n && /\s/.test(content[i])) i++;
    let op = "";
    while (i < n && /[A-Za-z*]/.test(content[i])) { op += content[i]; i++; }
    return op;
  };

  while (i < n) {
    const ch = content[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "/") { i++; continue; } // name operand — ignore
    if (ch === "[") {
      // array — gather operands until ]
      i++;
      const args = [];
      while (i < n && content[i] !== "]") {
        const c = content[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === "(") { args.push(readString()); }
        else if (c === "<") { args.push(readHexString()); }
        else if (/[0-9+eE.+\-]/.test(c)) { args.push(readNumber()); }
        else { i++; }
      }
      i++; // ]
      const op = readOp();
      tokens.push({ op, args });
      continue;
    }
    if (ch === "(") {
      const bytes = readString();
      const op = readOp();
      tokens.push({ op, args: [bytes] });
      continue;
    }
    if (ch === "<") {
      const bytes = readHexString();
      const op = readOp();
      tokens.push({ op, args: [bytes] });
      continue;
    }
    if (/[A-Za-z*]/.test(ch)) {
      let op = "";
      while (i < n && /[A-Za-z*]/.test(content[i])) { op += content[i]; i++; }
      tokens.push({ op, args: [] });
      continue;
    }
    // number operand before an op (e.g. "1 0 0 1 99.02 748.18 Tm")
    if (/[0-9+eE.+\-]/.test(ch)) {
      const num = readNumber();
      const args = [num];
      while (i < n && /\s/.test(content[i])) i++;
      while (i < n && /[0-9+eE.+\-]/.test(content[i])) {
        args.push(readNumber());
        while (i < n && /\s/.test(content[i])) i++;
      }
      const op = readOp();
      tokens.push({ op, args });
      continue;
    }
    i++;
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Assemble lines from runs
// ---------------------------------------------------------------------------
// PDF y grows upward; we bucket runs by rounded y (they come top-to-bottom on
// the physical page). Bulletins are single-column body text, so a simple
// y-bucket approach reproduces readable lines.
function assembleLines(runs) {
  const buckets = new Map();
  for (const r of runs) {
    if (!r.text) continue;
    const key = Math.round(r.y * 2) / 2; // bucket to half-point
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r);
  }
  const ys = [...buckets.keys()].sort((a, b) => b - a); // top to bottom
  const lines = [];
  for (const y of ys) {
    const row = buckets.get(y).slice().sort((a, b) => a.x - b.x);
    lines.push({
      y,
      text: row
        .map((r) => r.text)
        .join("")
        // collapse the inter-run spacing introduced by separate Tm runs
        .replace(/\s{2,}/g, " ")
        .trim(),
    });
  }
  return lines.filter((l) => l.text.length > 0);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract readable text from a PAGASA Tropical Cyclone Bulletin PDF.
 * @param {Uint8Array|ArrayBuffer|number[]} pdfBytes raw PDF file bytes
 * @returns {string} extracted text, pages separated by form-feeds
 */
export async function extractBulletinText(pdfBytes) {
  const data = normalizeToUint8(pdfBytes);
  const pdf = latin1(data);

  // 1) parse each font object -> its encoding (WinAnsi direct or ToUnicode map)
  const fontEncodings = {};
  // find /Font dictionaries -> map of names to object ids
  const fontRefs = {};
  for (const m of pdf.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
    const dict = m[1];
    for (const nm of dict.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      fontRefs[nm[1]] = nm[2];
    }
  }
  for (const [name, idStr] of Object.entries(fontRefs)) {
    const id = parseInt(idStr, 10);
    const body = objectBody(pdf, id) || "";
    const tun = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(body);
    if (tun) {
      const cmapStream = await streamDataFromObject(data, parseInt(tun[1], 10));
      const cmapText = cmapStream ? latin1(cmapStream) : "";
      fontEncodings[name] = { kind: "toUnicode", map: parseToUnicode(cmapText) };
    } else {
      fontEncodings[name] = { kind: "winAnsi" };
    }
  }

  // 2) walk all content streams (each page's content) and analyze
  const pageTexts = [];
  for (const m of pdf.matchAll(/\/(Content|Contents)\s+(\d+)\s+0\s+R/g)) {
    const stream = await streamDataFromObject(data, parseInt(m[2], 10));
    if (!stream) continue;
    const content = latin1(stream);
    const runs = analyzeContent(content, fontEncodings);
    const lines = assembleLines(runs);
    pageTexts.push(lines.map((l) => l.text).join("\n"));
  }

  if (pageTexts.length === 0) return "";
  return pageTexts.join("\n\f\n");
}

function normalizeToUint8(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (Array.isArray(input)) return new Uint8Array(input);
  throw new Error("Unsupported PDF input type");
}
