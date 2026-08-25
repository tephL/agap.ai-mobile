import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COUNTDOWN_SECONDS = 5;
const RING_SIZE = 132;
const SWEEP_MS = 1000; // one full sweep per remaining second

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
  },
  prepared: {
    title: "Your SOS message is ready",
    sub: "Tap Send in Messages if you haven't — help is on the way.",
  },
  active: {
    title: "Your SOS is active",
    sub: "Help is on the way.",
  },
};

/**
 * Rotating arc that sweeps the ring once per second while the number counts
 * down — a progress ring built without SVG (no new deps): a half-circle clip
 * of a bordered circle, spun by an Animated transform.
 */
function SweepRing({ children }) {
  // State initializer keeps one stable Animated.Value without touching refs
  // during render (react-hooks/refs).
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: SWEEP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.ringWrap}>
      {/* track */}
      <View style={styles.ringTrack} />
      {/* sweeping arc */}
      <Animated.View style={[styles.sweepWrap, { transform: [{ rotate }] }]}>
        <View style={styles.sweepClip}>
          <View style={styles.sweepArc} />
        </View>
      </Animated.View>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

export default function SosReceivedOverlay({ variant = "received", onDone }) {
  const copy = COPY[variant] ?? COPY.received;
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onDone?.();
          return 0;
        }
        return prev - 1;
      });
    }, SWEEP_MS);
    return () => clearInterval(id);
  }, [onDone]);

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <SweepRing>
          <Ionicons name="checkmark" size={44} color="#16A34A" />
          <Text style={styles.seconds}>{secondsLeft}</Text>
        </SweepRing>

        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Back to map"
        >
          <Text style={styles.backButtonText}>Back to map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    elevation: 60,
  },
  card: {
    width: "85%",
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringTrack: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 8,
    borderColor: "#E5E7EB",
  },
  sweepWrap: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
  },
  sweepClip: {
    position: "absolute",
    right: 0,
    width: RING_SIZE / 2,
    height: RING_SIZE,
    overflow: "hidden",
  },
  sweepArc: {
    position: "absolute",
    left: 0,
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 8,
    borderColor: "#208AEF",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  seconds: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: -2,
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
  backButton: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: "#208AEF",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
