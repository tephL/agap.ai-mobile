import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import colors from "../constants/colors";
import { cameraStore, useCameraStore } from "../store/cameraStore";
import ReportHoldButton from "./ReportHoldButton";

const ICONS = {
  index: "map",
  assistant: "sparkles",
  family: "people",
  profile: "person",
};

const primaryColor = colors.primary;

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { reportExpiresAt } = useCameraStore();

  const centerIndex = state.routes.findIndex((r) => r.name === "report");
  const centerRoute = centerIndex !== -1 ? state.routes[centerIndex] : null;
  const isReportFocused = centerIndex !== -1 && state.index === centerIndex;

  useEffect(() => {
    if (!reportExpiresAt) return;
    const delay = Math.max(0, reportExpiresAt - Date.now());
    const id = setTimeout(() => {
      cameraStore.discardReport();
      if (typeof router.canDismiss === "function" && router.canDismiss()) {
        router.dismissAll();
      }
      navigation.navigate("index");
      Alert.alert(
        "Report closed",
        "It's been over 5 minutes, so this report was closed and your extra details weren't saved. You can start a new one anytime.",
        [{ text: "Confirm" }]
      );
    }, delay);
    return () => clearTimeout(id);
  }, [reportExpiresAt, navigation]);

  const onHoldComplete = () => {
    cameraStore.startReport();
    navigation.navigate("report");
  };

  return (
    <View
      style={isReportFocused ? styles.hidden : styles.wrapper}
      pointerEvents={isReportFocused ? "none" : "auto"}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}>
        {state.routes.map((route) => {
          const isCenter = route.name === "report";

          if (isCenter) {
            return (
              <View key={route.key} style={styles.tabItem} pointerEvents="none" />
            );
          }

          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === routeIndex;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons
                name={ICONS[route.name] || "ellipse"}
                size={24}
                color={isFocused ? primaryColor : "#9AA0A6"}
              />
              <Text style={[styles.label, { color: isFocused ? primaryColor : "#9AA0A6" }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {centerRoute && <ReportHoldButton onComplete={onHoldComplete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  hidden: { height: 0, overflow: "hidden" },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#ffffff",
    height: 74,
    borderTopWidth: 1,
    borderTopColor: "#eeeeee",
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, marginTop: 2, fontWeight: "500" },
});
