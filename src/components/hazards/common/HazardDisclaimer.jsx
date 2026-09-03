import React from "react";
import { StyleSheet, Text } from "react-native";

export default function HazardDisclaimer({ style }) {
  return (
    <Text style={[styles.text, style]}>
      Hazard zones are approximate/illustrative estimates pending official
      flood maps (PHIVOLCS · MGB · PDRRMO).
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    lineHeight: 15,
    color: "#9AA1B0",
    fontStyle: "italic",
  },
});
