import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DamsTab from "./DamsTab";
import TabPlaceholder from "./TabPlaceholder";

const TABS = [
  {
    key: "nearYou",
    label: "Near You",
    icon: "location-outline",
    placeholder: {
      icon: "location-outline",
      title: "Near You",
      subtitle: "A combined view of every hazard near your location is coming soon.",
    },
  },
  { key: "dams", label: "Dams", icon: "water-outline" },
  {
    key: "faultLines",
    label: "Fault Lines",
    icon: "map-outline",
    placeholder: {
      icon: "map-outline",
      title: "Fault Lines",
      subtitle: "Active fault data from PHIVOLCS is coming soon.",
    },
  },
  {
    key: "volcanoes",
    label: "Volcanoes",
    icon: "flame-outline",
    placeholder: {
      icon: "flame-outline",
      title: "Volcanoes",
      subtitle: "Volcano alert levels from PHIVOLCS are coming soon.",
    },
  },
  {
    key: "typhoons",
    label: "Typhoons",
    icon: "thunderstorm-outline",
    placeholder: {
      icon: "thunderstorm-outline",
      title: "Typhoons",
      subtitle: "Live tropical cyclone bulletins from PAGASA are coming soon.",
    },
  },
  {
    key: "weatherBulletins",
    label: "Weather Bulletins",
    icon: "newspaper-outline",
    placeholder: {
      icon: "newspaper-outline",
      title: "Weather Bulletins",
      subtitle: "General weather advisories from PAGASA are coming soon.",
    },
  },
];

export default function HazardTabs({
  activeTab,
  onChangeTab,
  dams,
  userLocation,
  nearestSlug,
<<<<<<< HEAD
  influencingSlugs = [],
=======
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
  onSelectDam,
}) {
  const active = TABS.find((tab) => tab.key === activeTab);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => onChangeTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? "#E32F31" : "#737B8C"}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              <View
                style={[styles.tabUnderline, isActive && styles.tabUnderlineActive]}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.content}>
        {activeTab === "dams" ? (
          <DamsTab
            dams={dams}
            userLocation={userLocation}
            nearestSlug={nearestSlug}
<<<<<<< HEAD
            influencingSlugs={influencingSlugs}
=======
>>>>>>> fd7be6e (feat(monitoring) working frotnend for dams dev build jp)
            onSelect={onSelectDam}
          />
        ) : (
          <TabPlaceholder {...(active?.placeholder ?? {})} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  tabRow: {
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingHorizontal: 10,
    paddingTop: 6,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#737B8C",
    marginTop: 3,
  },
  tabLabelActive: {
    color: "#E32F31",
  },
  tabUnderline: {
    height: 2,
    alignSelf: "stretch",
    marginTop: 5,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  tabUnderlineActive: {
    backgroundColor: "#E32F31",
  },
  content: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: "#E0E2E7",
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});
