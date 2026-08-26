import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

export default function TyphoonAlertBanner({ typhoon, onDismiss, onViewDetails, onAskPreparedness }) {
  const [expanded, setExpanded] = useState(false);

  if (!typhoon) return null;

  const signalLabel = typhoon.signal_number
    ? `Signal No. ${typhoon.signal_number}`
    : "";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Ionicons name="thunderstorm" size={18} color={colors.white} />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Typhoon Alert</Text>
              {signalLabel ? (
                <Text style={styles.subtitle}>{signalLabel}</Text>
              ) : null}
            </View>
          </View>
          <Pressable
            hitSlop={8}
            onPress={onDismiss}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss typhoon alert"
          >
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.typhoonName}>{typhoon.name}</Text>

          {!expanded ? (
            <View style={styles.buttonRow}>
              <Pressable
                style={styles.button}
                onPress={() => {
                  setExpanded(true);
                  onViewDetails?.();
                }}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.buttonText}>View Details</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.primaryButton]}
                onPress={onAskPreparedness}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>Ask for Preparedness</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <Ionicons name="name-outline" size={14} color={colors.muted} />
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{typhoon.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="signal" size={14} color={colors.muted} />
                <Text style={styles.detailLabel}>Signal Level</Text>
                <Text style={styles.detailValue}>{signalLabel || "N/A"}</Text>
              </View>
              {typhoon.created_at ? (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={14} color={colors.muted} />
                  <Text style={styles.detailLabel}>Posted</Text>
                  <Text style={styles.detailValue}>
                    {new Date(typhoon.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}

              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.button}
                  onPress={() => setExpanded(false)}
                >
                  <Ionicons name="chevron-up" size={16} color={colors.primary} />
                  <Text style={styles.buttonText}>Collapse</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.primaryButton]}
                  onPress={onAskPreparedness}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
                  <Text style={[styles.buttonText, styles.primaryButtonText]}>Ask for Preparedness</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 25,
  },
  card: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#991B1B",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
    marginTop: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  typhoonName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
  },
  detailsSection: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
  },
});
