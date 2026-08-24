import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import colors from "@/constants/colors";
import {
  PLACEHOLDER_FIRST_NAME,
  PLACEHOLDER_LIVE_NOTIFICATION,
} from "@/data/notificationsPlaceholders";
import LiveGreeting from "./LiveGreeting";
import RadialProgress from "./RadialProgress";
import useCurrentUserFirstName from "./useCurrentUserFirstName";

const AVATAR_SIZE = 56;
const RING_PADDING = 8;
const HOLD_DURATION_MS = 1000;

/**
 * Collapsible "live notification" widget.
 *
 * Behavior:
 * - Chevron: collapses the whole card, leaving only the robot avatar button.
 * - Robot avatar (tap): reopens the card if collapsed, closes it if open.
 * - Robot avatar (press & hold ~1s): shows a radial progress ring, then
 *   navigates to the full Notifications screen.
 * - "View All": navigates to the Notifications screen.
 * - "View Tips": navigates to the AI Tips tab.
 * - Notification card: calls onNotificationPress(notification).
 * - "X": dismisses the notification and swaps in a friendly
 *   "no new notifications" state.
 *
 * Props:
 * - notification ({ id, title, description, sentLabel }, optional):
 *   falls back to a placeholder so the component still renders with no
 *   real data wired up yet.
 * - firstName (string, optional): overrides the greeting name. When
 *   omitted, the component resolves the signed-in user's first name itself
 *   (via useCurrentUserFirstName, which works offline off the cached
 *   profile), falling back to a placeholder name until that resolves.
 * - onNotificationPress(notification) (function, optional): called when the
 *   notification card itself is tapped.
 * - onDismiss(notification) (function, optional): called when the user
 *   dismisses the notification via the X button, in addition to the
 *   component's own built-in "no new notifications" state.
 */
export default function LiveNotificationDropdown({
  notification = PLACEHOLDER_LIVE_NOTIFICATION,
  firstName,
  onNotificationPress,
  onDismiss,
}) {
  const router = useRouter();
  const currentUserFirstName = useCurrentUserFirstName();
  const resolvedFirstName = firstName ?? currentUserFirstName ?? PLACEHOLDER_FIRST_NAME;

  const [isOpen, setIsOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const holdTimerRef = useRef(null);
  const holdIntervalRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const clearHoldTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  // Make sure timers don't keep firing after unmount.
  useEffect(() => clearHoldTimers, []);

  const openNotificationsTab = () => {
    router.push({ pathname: "/notifications", params: { tab: "notifications" } });
  };

  const openAiTipsTab = () => {
    router.push({ pathname: "/notifications", params: { tab: "tips" } });
  };

  const handleAvatarPressIn = () => {
    longPressFiredRef.current = false;
    const startedAt = Date.now();
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(Math.min((Date.now() - startedAt) / HOLD_DURATION_MS, 1));
    }, 16);
    holdTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      clearHoldTimers();
      setHoldProgress(0);
      openNotificationsTab();
    }, HOLD_DURATION_MS);
  };

  const handleAvatarPressOut = () => {
    clearHoldTimers();
    setHoldProgress(0);
  };

  const handleAvatarPress = () => {
    // Skip the toggle if this press just completed a long-press navigation.
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleCollapse = () => setIsOpen(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.(notification);
  };

  const handleNotificationPress = () => {
    onNotificationPress?.(notification);
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.avatarTouchable}
        onPressIn={handleAvatarPressIn}
        onPressOut={handleAvatarPressOut}
        onPress={handleAvatarPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          isOpen ? "Collapse live notifications" : "Expand live notifications"
        }
      >
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="robot" size={28} color={colors.white} />
        </View>

        {holdProgress > 0 && (
          <View style={styles.holdRing}>
            <RadialProgress
              progress={holdProgress}
              size={AVATAR_SIZE + RING_PADDING * 2}
              dotSize={4}
              color={colors.white}
              trackColor="rgba(255,255,255,0.35)"
            />
          </View>
        )}
      </Pressable>

      {isOpen && (
        <View style={styles.card}>
          <View style={styles.headerBox}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>LIVE NOTIFICATIONS</Text>
              <LiveGreeting firstName={resolvedFirstName} style={styles.brand} />
            </View>
            <Pressable
              hitSlop={8}
              onPress={handleCollapse}
              accessibilityRole="button"
              accessibilityLabel="Collapse live notifications"
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.contentBox}>
            {dismissed ? (
              <>
                <View style={styles.dismissedRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={styles.dismissedText}>
                    You're all caught up — no new notifications.
                  </Text>
                </View>
                <View style={styles.footer}>
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.actionPill}
                      onPress={openNotificationsTab}
                      accessibilityRole="button"
                      accessibilityLabel="View all notifications"
                    >
                      <Ionicons name="notifications" size={14} color={colors.primary} />
                      <Text style={styles.actionLabel}>View All</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionPill}
                      onPress={openAiTipsTab}
                      accessibilityRole="button"
                      accessibilityLabel="View tips"
                    >
                      <Ionicons name="bulb" size={14} color={colors.primary} />
                      <Text style={styles.actionLabel}>View Tips</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Pressable
                  onPress={handleNotificationPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Open notification: ${notification.title}`}
                >
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                      {notification.title}
                    </Text>
                    {!!notification.sentLabel && (
                      <Text style={styles.timestamp} numberOfLines={1}>
                        {notification.sentLabel}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
                    {notification.description}
                  </Text>
                </Pressable>

                <View style={styles.footer}>
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.actionPill}
                      onPress={openNotificationsTab}
                      accessibilityRole="button"
                      accessibilityLabel="View all notifications"
                    >
                      <Ionicons name="notifications" size={14} color={colors.primary} />
                      <Text style={styles.actionLabel}>View All</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionPill}
                      onPress={openAiTipsTab}
                      accessibilityRole="button"
                      accessibilityLabel="View tips"
                    >
                      <Ionicons name="bulb" size={14} color={colors.primary} />
                      <Text style={styles.actionLabel}>View Tips</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.dismissBtn}
                    hitSlop={8}
                    onPress={handleDismiss}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss notification"
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginLeft: 22,
  },
  avatarTouchable: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginLeft: -30,
    marginRight: 10,
    marginTop: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  holdRing: {
    position: "absolute",
    top: -RING_PADDING,
    left: -RING_PADDING,
    width: AVATAR_SIZE + RING_PADDING * 2,
    height: AVATAR_SIZE + RING_PADDING * 2,
  },
  card: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: "hidden",
  },
  headerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  brand: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  contentBox: {
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    paddingRight: 8,
  },
  timestamp: {
    color: colors.muted,
    fontSize: 11,
  },
  description: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  dismissedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dismissedText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  actionLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  dismissBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
});
