import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { INTENSITY_COLORS, statusKeyFromWindspeed } from "@/lib/typhoonTracks/trackJson";
import { colors, radius, spacing, type as typeTokens } from "@/theme";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function intensityFor(t) {
  const key = statusKeyFromWindspeed(t.current?.windspeed ?? t.overallWindspeed);
  return key && INTENSITY_COLORS[key] ? key : "unknown";
}

const DIR_DEG = {
  N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135,
  SSE: 157, S: 180, SSW: 202, SW: 225, WSW: 247, W: 270,
  WNW: 292, NW: 315, NNW: 337,
};

function directionDeg(dir) {
  if (!dir) return 0;
  return DIR_DEG[String(dir).toUpperCase()] ?? 0;
}

/** Detail rows shown only when the card is expanded. */
function expandedDetailRows(t) {
  const rows = [];
  if (t.extentKm != null) {
    rows.push({ icon: "radio-outline", label: "Wind field", value: `Destructive winds extend ~${t.extentKm} km` });
  }
  if (t.signalsSummary) {
    rows.push({ icon: "warning-outline", label: "Signals", value: t.signalsSummary });
  }
  if (t.bulletinNumber != null || t.issuedAtText) {
    rows.push({
      icon: "document-text-outline",
      label: "Bulletin",
      value: `${t.bulletinNumber != null ? `No. ${t.bulletinNumber}` : ""}${t.issuedAtText ? ` · ${t.issuedAtText}` : ""}`,
    });
  }
  const outlook = (t.forecast ?? []).filter((f) => f.isForecast && f.hours != null).slice(0, 3);
  for (const f of outlook) {
    const where = f.location?.trim() || f.label || "next position";
    const strength = f.windspeed != null ? `${f.windspeed} km/h` : null;
    rows.push({
      icon: "location-outline",
      label: `+${f.hours}h`,
      value: `${where}${strength ? ` · ${strength}` : ""}`,
    });
  }
  return rows;
}

/* ── sub-components ──────────────────────────────────────────────────────── */

function WindHero({ wind }) {
  if (wind == null) return null;
  return (
    <View style={s.heroStat}>
      <View style={s.heroStatIcon}>
        <Ionicons name="speedometer-outline" size={16} color={colors.danger} />
      </View>
      <Text style={s.heroStatValue}>{Math.round(wind)}</Text>
      <Text style={s.heroStatUnit}>km/h</Text>
      <Text style={s.heroStatLabel}>Winds</Text>
    </View>
  );
}

function StatCell({ icon, iconColor, value, unit, label }) {
  return (
    <View style={s.statCell}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
      {unit ? <Text style={s.statUnit}>{unit}</Text> : null}
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function SignalChip({ text }) {
  if (!text) return null;
  const isSevere = /signal\s*[2-5]/i.test(text);
  return (
    <View style={[s.signalChip, isSevere && s.signalChipSevere]}>
      <Ionicons name="warning-outline" size={12} color={isSevere ? "#FFFFFF" : colors.warning} />
      <Text style={[s.signalChipText, isSevere && s.signalChipTextSevere]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

/* ── main component ──────────────────────────────────────────────────────── */

export default function TyphoonsTab({
  typhoons,
  typhoonsLoading = false,
  overlayVisible = false,
  selectedTyphoonEventId = null,
  onSelectTyphoon,
  lpas,
  lpasLoading = false,
  selectedLpaId = null,
  onSelectLpa,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [expandedLpaId, setExpandedLpaId] = useState(null);

  const lpaList = Array.isArray(lpas?.lpas) ? lpas.lpas : [];

  const toggleTyphoon = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((cur) => (cur === id ? null : id));
  };

  const toggleLpa = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLpaId((cur) => (cur === id ? null : id));
  };

  /* ── loading / error states ──────────────────────────────────────────── */

  if (typhoonsLoading && !typhoons) {
    return (
      <View style={s.statusWrap}>
        <ActivityIndicator size="small" color={colors.info} />
        <Text style={s.statusText}>Checking tropical cyclones…</Text>
      </View>
    );
  }

  if (typhoons?.unavailable) {
    return (
      <View style={s.statusWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.muted} />
        <Text style={s.statusTitle}>{"Couldn't reach PAGASA"}</Text>
        <Text style={s.statusText}>
          Typhoon track data is unavailable right now. Please try again later.
        </Text>
      </View>
    );
  }

  /* ── normalised list ─────────────────────────────────────────────────── */

  const input = Array.isArray(typhoons?.typhoons) ? typhoons.typhoons : [];
  const list = [...input].sort(
    (a, b) =>
      (b.current?.windspeed ?? b.overallWindspeed ?? 0) -
      (a.current?.windspeed ?? a.overallWindspeed ?? 0)
  );

  const dateStr = typhoons?.generatedAt
    ? new Date(typhoons.generatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <View>
      {/* ── section header ────────────────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Tropical Cyclones</Text>
        <Text style={s.sectionMeta}>
          {list.length} active{dateStr ? ` · PAGASA · ${dateStr}` : ""}
        </Text>
      </View>

      {!overlayVisible && (
        <Text style={s.hintText}>
          Tap a storm to view its track on the map, or expand for details.
        </Text>
      )}

      {/* ── storm list / empty ────────────────────────────────────────── */}
      {list.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="sunny-outline" size={28} color={colors.muted} />
          <Text style={s.emptyTitle}>No active tropical cyclones</Text>
          <Text style={s.emptyText}>
            There are currently no tropical cyclones in or near the Philippine Area of Responsibility.
          </Text>
        </View>
      ) : (
        <View style={s.list}>
          {list.map((t) => {
            const key = intensityFor(t);
            const color = INTENSITY_COLORS[key] ?? INTENSITY_COLORS.unknown;
            const statusText =
              t.current?.status?.trim() || t.overallStormstatus?.trim() || "Tropical cyclone";
            const selected = t.eventId != null && t.eventId === selectedTyphoonEventId;
            const expanded = t.eventId != null && t.eventId === expandedId;

            const displayName = t.internationalName
              ? `${t.name ?? "Tropical cyclone"} (${t.internationalName})`
              : t.name ?? `Tropical cyclone (${t.bulletinFile || t.eventId})`;

            const wind = t.current?.windspeed ?? t.overallWindspeed;
            const pressure = t.current?.pressure;
            const mov = t.movement;
            const movLabel = mov?.direction || (mov?.directionName ? mov.directionName.split(" ")[0] : null);
            const movSpeed = mov?.speed;
            const detailRows = expandedDetailRows(t);

            return (
              <TouchableOpacity
                key={t.eventId}
                activeOpacity={0.7}
                onPress={() => onSelectTyphoon?.(t)}
                accessibilityRole="button"
              >
                <View style={[s.card, selected && { borderColor: color, borderWidth: 2 }]}>
                  {/* color bar */}
                  <View style={[s.cardBar, { backgroundColor: color }]} />

                  <View style={s.cardBody}>
                    {/* name + chevron */}
                    <View style={s.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.cardName} numberOfLines={1}>{displayName}</Text>
                        <View style={[s.categoryPill, { backgroundColor: color }]}>
                          <Ionicons name="thunderstorm-outline" size={10} color="#FFFFFF" />
                          <Text style={s.categoryPillText}>{statusText}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={s.expandBtn}
                        onPress={() => toggleTyphoon(t.eventId)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityRole="button"
                      >
                        {selected && <Ionicons name="eye" size={14} color={color} style={{ marginRight: 6 }} />}
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={colors.muted}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* hero stat: wind speed */}
                    <WindHero wind={wind} />

                    {/* secondary stats: pressure + movement */}
                    <View style={s.secondaryStats}>
                      {pressure != null && (
                        <StatCell
                          icon="pulse-outline"
                          iconColor={colors.caution}
                          value={pressure}
                          unit="hPa"
                          label="Pressure"
                        />
                      )}
                      {movLabel && (
                        <StatCell
                          icon="navigate-outline"
                          iconColor={colors.info}
                          value={movLabel}
                          unit={movSpeed != null ? `${movSpeed} km/h` : null}
                          label="Movement"
                          rotation={directionDeg(mov?.direction)}
                        />
                      )}
                    </View>

                    {/* signals */}
                    {t.signalsSummary ? (
                      <SignalChip text={t.signalsSummary} />
                    ) : null}

                    {/* expanded details */}
                    {expanded && detailRows.length > 0 && (
                      <View style={s.detailBlock}>
                        {detailRows.map((row) => (
                          <View key={row.label + row.value} style={s.detailRow}>
                            <Ionicons name={row.icon} size={13} color={colors.muted} style={{ width: 18, marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.detailLabel}>{row.label}</Text>
                              <Text style={s.detailValue}>{row.value}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── LPA section ───────────────────────────────────────────────── */}
      {lpasLoading && lpaList.length === 0 && (
        <View style={s.lpaLoadingRow}>
          <ActivityIndicator size="small" color={colors.info} />
          <Text style={s.lpaLoadingText}>Checking for low pressure areas…</Text>
        </View>
      )}

      {!lpasLoading && lpaList.length > 0 && (
        <View style={s.lpaSection}>
          <Text style={s.sectionLabel}>LOW PRESSURE AREAS</Text>
          {lpaList.map((lpa) => {
            const expanded = lpa.id === expandedLpaId;
            const selected = lpa.id === selectedLpaId;
            return (
              <TouchableOpacity
                key={lpa.id}
                activeOpacity={0.7}
                onPress={() => onSelectLpa?.(lpa)}
                accessibilityRole="button"
              >
                <View style={[s.lpaCard, selected && s.lpaCardSelected]}>
                  <View style={s.lpaHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.lpaName} numberOfLines={1}>{lpa.name}</Text>
                      {lpa.type ? <Text style={s.lpaType}>{lpa.type}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={s.expandBtn}
                      onPress={() => toggleLpa(lpa.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={colors.muted}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={s.lpaMetaRow}>
                    {lpa.pressure != null && (
                      <View style={s.lpaMetaChip}>
                        <Text style={s.lpaMetaChipText}>{lpa.pressure} hPa</Text>
                      </View>
                    )}
                    {lpa.windSpeed != null && (
                      <View style={s.lpaMetaChip}>
                        <Text style={s.lpaMetaChipText}>{lpa.windSpeed} km/h</Text>
                      </View>
                    )}
                    {lpa.lat != null && lpa.lon != null && (
                      <Text style={s.lpaCenter}>{lpa.lat.toFixed(1)}°N, {lpa.lon.toFixed(1)}°E</Text>
                    )}
                  </View>
                  {lpa.movement?.text ? (
                    <Text style={s.lpaMove}>{lpa.movement.text}</Text>
                  ) : null}
                  {expanded && lpa.note ? (
                    <View style={s.lpaDetail}>
                      <Text style={s.lpaNote}>{lpa.note}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ── styles ─────────────────────────────────────────────────────────────── */

const s = StyleSheet.create({
  /* status / empty */
  statusWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: 28,
  },
  statusTitle: {
    marginTop: 8,
    ...typeTokens.body,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  statusText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: 32,
  },
  emptyTitle: {
    marginTop: 8,
    ...typeTokens.body,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: "center",
  },

  /* section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typeTokens.body,
    fontWeight: "800",
    color: colors.text,
  },
  sectionMeta: {
    ...typeTokens.caption,
    color: colors.muted,
  },

  /* hint */
  hintText: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    fontSize: 11,
    lineHeight: 15,
    color: colors.placeholder,
  },

  /* storm list */
  list: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.md,
  },

  /* storm card */
  card: {
    flexDirection: "row",
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardBar: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  categoryPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },

  /* hero stat (wind) */
  heroStat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroStatIcon: {
    marginRight: 2,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  heroStatUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  heroStatLabel: {
    marginLeft: "auto",
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* secondary stats */
  secondaryStats: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  statUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.muted,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  /* signals */
  signalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  signalChipSevere: {
    backgroundColor: colors.warning,
  },
  signalChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    maxWidth: 240,
  },
  signalChipTextSevere: {
    color: "#FFFFFF",
  },

  /* expanded details */
  detailBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  detailValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: colors.text,
  },

  /* LPA section */
  lpaLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  lpaLoadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  lpaSection: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.muted,
  },
  lpaCard: {
    borderRadius: radius.md,
    backgroundColor: "#FDF8E7",
    borderWidth: 1,
    borderColor: "#F3E4B8",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  lpaCardSelected: {
    borderColor: "#FACC15",
    borderWidth: 2,
  },
  lpaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lpaName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#78350F",
  },
  lpaType: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#A16207",
  },
  lpaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  lpaMetaChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  lpaMetaChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  lpaCenter: {
    fontSize: 11,
    color: "#5A6273",
  },
  lpaMove: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#78350F",
  },
  lpaDetail: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3E4B8",
    paddingTop: 8,
  },
  lpaNote: {
    fontSize: 12,
    lineHeight: 17,
    color: "#553C0A",
  },
});
