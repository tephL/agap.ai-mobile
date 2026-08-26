import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatETA } from "../../services/routeService";
import { haversineMeters, formatDistance } from "../../utils/haversine";
import colors from "../../constants/colors";

const PULSE_DURATION_MS = 2000;

/**
 * Persistent bottom notification bar shown on the citizen map when
 * a response team has been dispatched to one of the user's clusters.
 *
 * Props:
 * - dispatches: Array<{
 *     assignment_id, team: { name, lat, lng },
 *     cluster: { lat, lng }, etaSeconds, status
 *   }>
 * - onDismiss(assignmentId)
 */
export default function DispatchNotificationBar({ dispatches, onDismiss, style }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (dispatches.length === 0) return;
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
  }, [dispatches.length, pulse]);

  if (dispatches.length === 0) return null;

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <View style={[styles.container, style]}>
      {dispatches.map((d) => (
        <DispatchCard
          key={d.assignment_id}
          dispatch={d}
          opacity={opacity}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}

function DispatchCard({ dispatch, opacity, onDismiss }) {
  const { assignment_id, team, cluster, etaSeconds, status } = dispatch;

  const distanceMeters = haversineMeters(
    { lat: team?.lat, lng: team?.lng },
    { lat: cluster?.lat, lng: cluster?.lng }
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.pulseDot, { opacity }]}>
            <View style={styles.pulseInner} />
          </Animated.View>
          <Text style={styles.title}>Help is on the way!</Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => onDismiss(assignment_id)}
          style={styles.dismissBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="people" size={14} color={colors.primary} />
          <Text style={styles.teamName} numberOfLines={1}>
            {team?.name ?? "Response Team"}
          </Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {status === "dispatched" ? "En route" : "Dispatching"}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="navigate" size={14} color={colors.muted} />
          <Text style={styles.etaText}>{formatETA(etaSeconds)}</Text>
          {distanceMeters != null && (
            <Text style={styles.distanceText}>
              {formatDistance(distanceMeters)}
            </Text>
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
    zIndex: 20,
    gap: 8,
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
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
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
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  etaText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
  },
  distanceText: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 4,
  },
});
