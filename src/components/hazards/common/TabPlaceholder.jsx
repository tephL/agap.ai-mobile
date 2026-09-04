import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabPlaceholder({ icon, title, subtitle }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={34} color="#9AA2B1" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#182033",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#737B8C",
    textAlign: "center",
    lineHeight: 18,
  },
});
