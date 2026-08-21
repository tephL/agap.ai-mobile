import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import colors from "@/constants/colors";
import NotificationsTabToggle from "@/components/notifications/NotificationsTabToggle";
import NotificationsTimeline from "@/components/notifications/NotificationsTimeline";
import AiTipsView from "@/components/notifications/AiTipsView";

function tabFromParams(tab) {
  return tab === "tips" ? "tips" : "notifications";
}

export default function NotificationsScreen() {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState(tabFromParams(params.tab));

  useEffect(() => {
    setActiveTab(tabFromParams(params.tab));
  }, [params.tab]);

  return (
    <View style={styles.container}>
      <NotificationsTabToggle activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === "tips" ? <AiTipsView /> : <NotificationsTimeline />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
