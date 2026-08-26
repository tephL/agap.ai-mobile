import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";

const COPY = {
  received: {
    title: "We have received your report",
    sub: "Help will be on its way.",
    icon: "checkmark",
    iconBg: "#ECFDF5",
    iconColor: "#16A34A",
  },
  prepared: {
    title: "Your SOS message is ready",
    sub: "Tap Send in Messages if you haven't. Help is on the way.",
    icon: "checkmark",
    iconBg: "#ECFDF5",
    iconColor: "#16A34A",
  },
  active: {
    title: "You cancelled your offline SOS report",
    sub: "No report was sent.",
    icon: "close",
    iconBg: "#FEF2F2",
    iconColor: "#DC2626",
  },
};

const AUTO_CLOSE_MS = 10000;
const RING_SIZE = 90;
const ICON_BG_SIZE = 68;

export default function SosReceivedOverlay({ variant = "received", onDone }) {
  const copy = COPY[variant] ?? COPY.received;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.95)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const ringAnim = Animated.sequence([
      Animated.delay(300),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: AUTO_CLOSE_MS - 300,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]);

    const cardAnim = Animated.timing(popupScale, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    Animated.parallel([cardAnim, ringAnim]).start(({ finished }) => {
      if (finished) onDoneRef.current?.();
    });

    return () => {
      progressAnim.stopAnimation();
      popupScale.stopAnimation();
    };
  }, []);

  const handleDismiss = () => {
    progressAnim.stopAnimation();
    popupScale.stopAnimation();
    onDoneRef.current?.();
  };

  const rightRotate = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-180deg", "0deg", "0deg"],
  });
  const leftRotate = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-180deg", "-180deg", "0deg"],
  });
  const leftOpacity = progressAnim.interpolate({
    inputRange: [0, 0.499, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={styles.backdrop}>
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: popupScale }] },
        ]}
      >
        <View style={styles.ringWrap}>
          <View style={styles.ringTrack} />

          <View style={styles.rightClip}>
            <Animated.View
              style={[
                styles.spinner,
                styles.spinnerRight,
                { transform: [{ rotate: rightRotate }] },
              ]}
            >
              <View style={styles.rightFill} />
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.leftClip, { opacity: leftOpacity }]}
          >
            <Animated.View
              style={[
                styles.spinner,
                styles.spinnerLeft,
                { transform: [{ rotate: leftRotate }] },
              ]}
            >
              <View style={styles.leftFill} />
            </Animated.View>
          </Animated.View>

          <View
            style={[
              styles.iconBg,
              { backgroundColor: copy.iconBg },
            ]}
          >
            <Ionicons name={copy.icon} size={32} color={copy.iconColor} />
          </View>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          activeOpacity={0.85}
        >
          <Text style={styles.closeButtonText}>CLOSE</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(24, 32, 51, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "85%",
    maxWidth: 340,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  ringTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RING_SIZE / 2,
    backgroundColor: "#E5E7EB",
  },
  rightClip: {
    position: "absolute",
    width: RING_SIZE / 2,
    height: RING_SIZE,
    right: 0,
    overflow: "hidden",
  },
  leftClip: {
    position: "absolute",
    width: RING_SIZE / 2,
    height: RING_SIZE,
    left: 0,
    overflow: "hidden",
  },
  spinner: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: "absolute",
    top: 0,
  },
  spinnerRight: {
    left: -RING_SIZE / 2,
  },
  spinnerLeft: {
    left: 0,
  },
  rightFill: {
    width: RING_SIZE / 2,
    height: RING_SIZE,
    position: "absolute",
    right: 0,
    backgroundColor: colors.primary,
    borderTopRightRadius: RING_SIZE / 2,
    borderBottomRightRadius: RING_SIZE / 2,
  },
  leftFill: {
    width: RING_SIZE / 2,
    height: RING_SIZE,
    position: "absolute",
    left: 0,
    backgroundColor: colors.primary,
    borderTopLeftRadius: RING_SIZE / 2,
    borderBottomLeftRadius: RING_SIZE / 2,
  },
  iconBg: {
    width: ICON_BG_SIZE,
    height: ICON_BG_SIZE,
    borderRadius: ICON_BG_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  sub: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 22,
  },
  closeButton: {
    width: "100%",
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.8,
  },
});
