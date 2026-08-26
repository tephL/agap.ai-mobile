import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

const ASSUMED_SIGNAL = 3;

export default function TyphoonAlertBanner({ typhoon, onDismiss, onViewDetails, onAskPreparedness }) {
  const [expanded, setExpanded] = useState(false);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  if (!typhoon) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.iconWrap, pulseStyle]}>
              <Ionicons name="thunderstorm" size={18} color={colors.white} />
            </Animated.View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>Typhoon Alert</Text>
              <Text style={styles.subtitle}>Signal No. {ASSUMED_SIGNAL}</Text>
              <Text style={styles.typhoonName}>{typhoon.name}</Text>
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
          {expanded && (
            <Animated.View
              entering={FadeInDown.duration(250)}
              exiting={FadeOutUp.duration(150)}
              style={styles.detailsSection}
            >
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCapsule}>
                  <Ionicons name="warning-outline" size={12} color="#B91C1C" />
                  <Text style={styles.detailLabel}>NAME</Text>
                </View>
                <Text style={styles.detailValue}>{typhoon.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCapsule}>
                  <Ionicons name="pricetag-outline" size={12} color="#B91C1C" />
                  <Text style={styles.detailLabel}>CATEGORY</Text>
                </View>
                <Text style={styles.detailValue}>{typhoon.category ?? "N/A"}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.detailLabelCapsule}>
                  <Ionicons name="speedometer-outline" size={12} color="#B91C1C" />
                  <Text style={styles.detailLabel}>SIGNAL</Text>
                </View>
                <Text style={styles.detailValue}>No. {ASSUMED_SIGNAL} (your area)</Text>
              </View>
              {typhoon.source ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelCapsule}>
                    <Ionicons name="information-circle-outline" size={12} color="#B91C1C" />
                    <Text style={styles.detailLabel}>SOURCE</Text>
                  </View>
                  <Text style={styles.detailValue}>{typhoon.source}</Text>
                </View>
              ) : null}
              {typhoon.created_at ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelCapsule}>
                    <Ionicons name="time-outline" size={12} color="#B91C1C" />
                    <Text style={styles.detailLabel}>POSTED</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {new Date(typhoon.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          )}

          <View style={styles.buttonRow}>
            {!expanded ? (
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
            ) : (
              <Pressable
                style={styles.button}
                onPress={() => setExpanded(false)}
              >
                <Ionicons name="chevron-up" size={16} color={colors.primary} />
                <Text style={styles.buttonText}>Collapse</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={onAskPreparedness}
            >
              <Ionicons name="sparkles-outline" size={16} color={colors.white} />
              <Text style={[styles.buttonText, styles.primaryButtonText]}>AI Tips</Text>
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
    top: 30,
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
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
    marginTop: 2,
  },
  detailsSection: {
    gap: 0,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  detailLabelCapsule: {
    width: 100,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B91C1C",
  },
  detailValue: {
    flex: 1,
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
