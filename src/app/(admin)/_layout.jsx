import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import colors from "../../constants/colors";
import { getDispatcherSession } from "../../services/dispatcherService";

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
    </Stack>
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
