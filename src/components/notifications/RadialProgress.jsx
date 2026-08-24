import { View } from "react-native";

const DOT_COUNT = 12;

/**
 * Simple radial progress indicator made of dots arranged in a circle,
 * lighting up clockwise from the top as `progress` goes from 0 to 1.
 * Used to give visual feedback while the robot avatar is being held down.
 *
 * Props:
 * - progress (number, 0-1, required): how much of the ring is filled.
 * - size (number, optional): outer diameter in px. Default 68.
 * - dotSize (number, optional): diameter of each dot in px. Default 5.
 * - color (string, optional): color of "lit" dots. Default white.
 * - trackColor (string, optional): color of "unlit" dots.
 */
export default function RadialProgress({
  progress,
  size = 68,
  dotSize = 5,
  color = "#ffffff",
  trackColor = "rgba(255,255,255,0.35)",
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const litCount = Math.round(clamped * DOT_COUNT);
  const radius = size / 2 - dotSize;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        // -90deg offset so dot 0 starts at 12 o'clock, then sweeps clockwise.
        const angle = (i / DOT_COUNT) * 2 * Math.PI - Math.PI / 2;
        const x = size / 2 + radius * Math.cos(angle) - dotSize / 2;
        const y = size / 2 + radius * Math.sin(angle) - dotSize / 2;
        const lit = i < litCount;

        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: lit ? color : trackColor,
            }}
          />
        );
      })}
    </View>
  );
}
