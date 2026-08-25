import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

const RESPONSE_TYPES = {
  tip: {
    icon: "bulb",
    iconColor: "#F59E0B",
    bgColor: "#FFFBEB",
    borderColor: "#FDE68A",
    label: "Tip",
    labelColor: "#B45309",
  },
  warning: {
    icon: "warning",
    iconColor: "#EF4444",
    bgColor: "#FEF2F2",
    borderColor: "#FECACA",
    label: "Warning",
    labelColor: "#B91C1C",
  },
  info: {
    icon: "information-circle",
    iconColor: "#3B82F6",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    label: "Info",
    labelColor: "#1D4ED8",
  },
  emergency: {
    icon: "alert-circle",
    iconColor: "#DC2626",
    bgColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    label: "Emergency",
    labelColor: "#991B1B",
  },
  success: {
    icon: "checkmark-circle",
    iconColor: "#16A34A",
    bgColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    label: "Success",
    labelColor: "#15803D",
  },
};

function parseResponseBlocks(text) {
  const blocks = [];
  const tagPattern = /\[(TIP|WARNING|INFO|EMERGENCY|SUCCESS)\]\s*/gi;
  const parts = text.split(tagPattern);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part || !part.trim()) continue;

    const upper = part.toUpperCase();
    if (["TIP", "WARNING", "INFO", "EMERGENCY", "SUCCESS"].includes(upper)) {
      const nextPart = parts[i + 1];
      if (nextPart && nextPart.trim()) {
        blocks.push({ type: upper.toLowerCase(), text: nextPart.trim() });
        i++;
      } else {
        blocks.push({ type: "normal", text: part });
      }
    } else {
      blocks.push({ type: "normal", text: part });
    }
  }

  return blocks.length > 0 ? blocks : [{ type: "normal", text }];
}

function HighlightedBlock({ block }) {
  if (block.type === "normal") {
    return (
      <Text style={styles.userText}>
        {block.text}
      </Text>
    );
  }

  const config = RESPONSE_TYPES[block.type];

  return (
    <View style={[styles.highlightBlock, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      <View style={styles.highlightHeader}>
        <Ionicons name={config.icon} size={16} color={config.iconColor} />
        <Text style={[styles.highlightLabel, { color: config.labelColor }]}>
          {config.label}
        </Text>
      </View>
      <Text style={[styles.highlightText, { color: config.labelColor }]}>
        {block.text}
      </Text>
    </View>
  );
}

export default function ChatBubble({ message, isUser }) {
  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const blocks = parseResponseBlocks(message.content);

  return (
    <View style={styles.assistantRow}>
      <View style={styles.avatarWrap}>
        <Ionicons name="sparkles" size={14} color={colors.white} />
      </View>
      <View style={styles.assistantBubble}>
        {blocks.map((block, idx) => (
          <HighlightedBlock key={idx} block={block} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "80%",
  },
  userText: {
    color: colors.white,
    fontSize: 14,
    lineHeight: 20,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "82%",
    gap: 8,
  },
  highlightBlock: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  highlightText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
