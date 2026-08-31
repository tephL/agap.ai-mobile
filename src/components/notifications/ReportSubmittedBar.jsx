import { useEffect, useRef } from "react";
import { Alert, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

const PULSE_DURATION_MS = 2000;

/**
 * Persistent floating notification bar shown on the citizen map after they
 * submit a report. Confirms the report was received and offers two actions:
 * view the report details, or cancel their SOS help.
 *
 * Cancel is disabled (server rejects it too) once a team is already en route
 * to the citizen's cluster.
 *
 * Props:
 * - report: { reportId, createdAt (ms|ISO), clusterId }
 * - dispatched: boolean — whether a team is already en route to the cluster
 * - onViewDetails(reportId)
 * - onCancel(reportId)
 * - onDismiss()
 */
export default function ReportSubmittedBar({
  report,
  dispatched = false,
  onViewDetails,
  onCancel,
  onDismiss,
  style,
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!report) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: PULSE_DURATION_MS,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [report, pulse]);

  if (!report) return null;

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  const handleCancelPress = () => {
    Alert.alert(
      "Cancel SOS help?",
      "This will cancel your report so help is no longer dispatched to you.",
      [
        { text: "Keep report", style: "cancel" },
        {
          text: "Cancel help",
          style: "destructive",
          onPress: () => onCancel?.(report.reportId),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.pulseDot, { opacity }]}>
              <View style={styles.pulseInner} />
            </Animated.View>
            <View>
              <Text style={styles.title}>Report received</Text>
              <Text style={styles.subtitle}>
                Your SOS report has been submitted successfully.
              </Text>
            </View>
          </View>
          <Pressable
            hitSlop={8}
            onPress={onDismiss}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
          >
            <Ionicons name="close" size={16} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          {dispatched ? (
            <Text style={styles.dispatchedNote}>
              A team is already on the way — your report can no longer be cancelled.
            </Text>
          ) : (
            <Text style={styles.cancelNote}>
              You can still cancel this report if you no longer need help.
            </Text>
          )}

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.viewBtn]}
              onPress={() => onViewDetails?.(report.reportId)}
              accessibilityRole="button"
            >
              <Ionicons name="eye" size={14} color={colors.primary} />
              <Text style={styles.viewBtnText}>View details</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, dispatched ? styles.cancelDisabled : styles.cancelBtn]}
              onPress={handleCancelPress}
              disabled={dispatched}
              accessibilityRole="button"
            >
              <Ionicons
                name="close-circle"
                size={14}
                color={dispatched ? colors.muted : "#DC2626"}
              />
              <Text
                style={[
                  styles.cancelBtnText,
                  dispatched && styles.cancelBtnTextDisabled,
                ]}
              >
                Cancel help
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 35,
    left: 12,
    right: 12,
    zIndex: 20,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderBottomColor: colors.border,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  cancelNote: {
    fontSize: 12,
    color: colors.muted,
  },
  dispatchedNote: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 9,
  },
  viewBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  cancelBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  cancelDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnTextDisabled: {
    color: colors.muted,
  },
});
