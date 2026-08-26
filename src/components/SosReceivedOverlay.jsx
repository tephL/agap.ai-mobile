import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Copy variants:
 *   received — online submit succeeded
 *   prepared — offline: SMS composer was opened, user still taps Send there
 *   active   — user skipped the details form (nothing new submitted)
 */
const COPY = {
  received: {
    title: "We have received your report",
    sub: "Help is on the way.",
    icon: "checkmark",
    iconColor: "#16A34A",
  },
  prepared: {
    title: "Your SOS message is ready",
    sub: "Tap Send in Messages if you haven't. Help is on the way.",
    icon: "checkmark",
    iconColor: "#16A34A",
  },
  active: {
    title: "You cancelled your offline SOS report",
    sub: "No report was sent.",
    icon: "close",
    iconColor: "#DC2626",
  },
};

export default function SosReceivedOverlay({ variant = "received", onDone }) {
  const copy = COPY[variant] ?? COPY.received;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.checkCircle}>
          <Ionicons name={copy.icon} size={44} color={copy.iconColor} />
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={onDone}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "85%",
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 20,
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  closeButton: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 64,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#182033",
  },
});
