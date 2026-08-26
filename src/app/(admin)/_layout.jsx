import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import { getDispatcherSession } from "../../services/dispatcherService";

const TAB_ICONS = {
  reports: "document-text",
  map: "map",
  team: "people",
};

export default function AdminLayout() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function guard() {
      const session = await getDispatcherSession();
      if (!active) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    }

    guard();

    return () => {
      active = false;
    };
  }, [router]);

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.reports} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.map} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS.team} size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
