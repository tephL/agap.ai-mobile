import React from "react";
import { StyleSheet, View } from "react-native";

/**
 * Bottom-left container that stacks any number of legend chips/cards
 * vertically. Unlike the legends themselves (whose wrappers are plain flex
 * children), this is the one absolute-positioned element, so multiple legend
 * pills stack on top of each other instead of overlapping whenever several
 * overlays are toggled at once.
 */
export default function LegendStack({ children }) {
  return <View style={styles.stack}>{children}</View>;
}

const styles = StyleSheet.create({
  stack: {
    position: "absolute",
    left: 16,
    // sits above the bottom-left "Monitor" pill (which is 48px tall at
    // bottom:34 → top ≈ 82) so the legend pills never overlap it
    bottom: 96,
    alignItems: "flex-start",
    gap: 8,
    zIndex: 15,
    elevation: 15,
  },
});
