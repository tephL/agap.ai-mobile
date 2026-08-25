import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";

const RESPONSE_TYPES = {
  tip: {
    icon: "bulb",
    iconColor: "#D97706",
    bgColor: "#FFFBEB",
    borderColor: "#FDE68A",
    accentColor: "#F59E0B",
    label: "Tip",
    labelColor: "#92400E",
  },
  warning: {
    icon: "warning",
    iconColor: "#DC2626",
    bgColor: "#FEF2F2",
    borderColor: "#FECACA",
    accentColor: "#EF4444",
    label: "Warning",
    labelColor: "#991B1B",
  },
  info: {
    icon: "information-circle",
    iconColor: "#2563EB",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    accentColor: "#3B82F6",
    label: "Info",
    labelColor: "#1E40AF",
  },
  emergency: {
    icon: "alert-circle",
    iconColor: "#B91C1C",
    bgColor: "#FEF2F2",
    borderColor: "#FECACA",
    accentColor: "#DC2626",
    label: "Emergency",
    labelColor: "#7F1D1D",
  },
  success: {
    icon: "checkmark-circle",
    iconColor: "#15803D",
    bgColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    accentColor: "#22C55E",
    label: "Success",
    labelColor: "#166534",
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
      <Text style={styles.normalText}>
        {block.text}
      </Text>
    );
  }

  const config = RESPONSE_TYPES[block.type];

  return (
    <View
      style={[
        styles.highlightBlock,
        { backgroundColor: config.bgColor, borderLeftColor: config.accentColor },
      ]}
    >
      <View style={styles.highlightHeader}>
        <View style={[styles.highlightIconWrap, { backgroundColor: config.accentColor + "18" }]}>
          <Ionicons name={config.icon} size={13} color={config.accentColor} />
        </View>
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
        <Ionicons name="sparkles" size={12} color={colors.white} />
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
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingLeft: 48,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    maxWidth: "85%",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  userText: {
    color: colors.white,
    fontSize: 15,
    lineHeight: 21,
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingRight: 48,
  },
  avatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 4,
  },
  assistantBubble: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: "85%",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  normalText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  highlightBlock: {
    borderRadius: 12,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  highlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  highlightIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
