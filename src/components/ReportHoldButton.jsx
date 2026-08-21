import { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";

const HOLD_MS = 3000;
const RING_SIZE = 76;
const BUTTON_SIZE = 60;

export default function ReportHoldButton({ onComplete }) {
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef(null);
  const completed = useRef(false);

  const rightRotate = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-180deg", "0deg", "0deg"],
  });
  const leftRotate = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-180deg", "-180deg", "0deg"],
  });
  const leftOpacity = progress.interpolate({
    inputRange: [0, 0.499, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const stopHold = () => {
    animation.current?.stop();
    animation.current = null;
  };

  const onPressIn = () => {
    completed.current = false;
    progress.setValue(0);
    animation.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_MS,
      useNativeDriver: true,
    });
    animation.current.start(({ finished }) => {
      if (!finished) return;
      completed.current = true;
      onComplete?.();
    });
  };

  const onPressOut = () => {
    if (!completed.current) {
      stopHold();
      progress.setValue(0);
      return;
    }
    stopHold();
    progress.setValue(0);
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="Hold to open report"
    >
      <View style={styles.track} />

      <View style={styles.rightClip} pointerEvents="none">
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
        pointerEvents="none"
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

      <View style={styles.button}>
        <Ionicons name="megaphone" size={28} color={colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    top: -36,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.border,
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
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
});
