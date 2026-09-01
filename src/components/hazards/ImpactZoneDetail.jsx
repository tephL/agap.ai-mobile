import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { IMPACT_TIERS, getImpactTier } from "../../data/hydrology";
import HazardDisclaimer from "./HazardDisclaimer";

const TIER_ORDER = ["catastrophic", "severe", "high", "moderate", "watch"];

/**
 * Full-screen explainer for the impact-zone system. Opens from the
 * HazardSheet impact card; shows where the user's dam sits on the tier
 * ladder and exactly why each tier exists.
 */
export default function ImpactZoneDetail({
  visible,
  onClose,
  damName,
  tierKey,
  minor = false,
  distanceText,
}) {
  const current = getImpactTier(tierKey) ?? IMPACT_TIERS[IMPACT_TIERS.length - 1];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Understanding your risk</Text>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#5A6273" />
            </Pressable>
          </View>

          <ScrollView bounces={false} contentContainerStyle={styles.scrollBody}>
            <View style={[styles.currentCard, { borderColor: `${current.color}59` }]}>
              <View style={styles.currentHead}>
                <View style={[styles.currentChip, { backgroundColor: current.color }]}>
                  <Text style={styles.currentChipText}>{current.label}</Text>
                </View>
                {minor && (
                  <View style={styles.minorChip}>
                    <Text style={styles.minorChipText}>Minor structure</Text>
                  </View>
                )}
              </View>
              <Text style={styles.currentDam}>{damName ?? "This dam"}</Text>
              <Text style={styles.currentSummary}>{current.plainSummary}</Text>
            </View>

            <Text style={styles.sectionTitle}>How zones are decided</Text>
            <View style={styles.ladder}>
              {TIER_ORDER.map((key, index) => {
                const tier = getImpactTier(key);
                const isCurrent = key === current.key;
                return (
                  <View key={key} style={styles.tierBlockWrap}>
                    <View
                      style={[
                        styles.tierRow,
                        isCurrent && { backgroundColor: `${tier.color}14` },
                      ]}
                    >
                      <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                      <View style={styles.tierMain}>
                        <View style={styles.tierLabelRow}>
                          <Text style={[styles.tierLabel, { color: tier.color }]}>
                            {tier.label}
                          </Text>
                          <Text style={styles.tierBand}>
                            {index === 0
                              ? "0–5 km of dam"
                              : index === TIER_ORDER.length - 1
                                ? "60+ km"
                                : `${IMPACT_TIERS[index].maxKm}–${tier.maxKm} km`}
                            {isCurrent ? " · you" : ""}
                          </Text>
                        </View>
                        <Text style={styles.tierPlain}>{tier.plainSummary}</Text>
                        {isCurrent &&
                          tier.criteria.map((line) => (
                            <Text key={line} style={styles.criteriaLine}>
                              {"• "}
                              {line}
                            </Text>
                          ))}
                      </View>
                    </View>
                    {index < TIER_ORDER.length - 1 && (
                      <View style={styles.tierConnector}>
                        <View style={[styles.connectorLine, { backgroundColor: getImpactTier(TIER_ORDER[index + 1]).color }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Why is this dam listed?</Text>
            <Text style={styles.explainText}>
              Three things decide what you see:
            </Text>
            <Text style={styles.explainBullet}>
              <Text style={styles.explainBold}>{"Reservoir status — "}</Text>
              how full the dam is right now compared with its safety levels
              (Normal / Caution / Danger).
            </Text>
            <Text style={styles.explainBullet}>
              <Text style={styles.explainBold}>{"River connection — "}</Text>
              whether the dam&apos;s water actually flows toward your area.
              Dams on other river systems never claim to affect you.
            </Text>
            <Text style={styles.explainBullet}>
              <Text style={styles.explainBold}>{"Structure size — "}</Text>
              a few dams (like Ipo) mainly redirect water rather than store it.
              They share their river&apos;s zone but are tagged{" "}
              <Text style={styles.explainBold}>Minor</Text> because they can
              hold very little water compared with a main dam like Angat.
            </Text>

            <Text style={styles.glossaryNote}>
              {"NHWL = normal high water level, the maximum safe water height for a reservoir. "}
              {"A spillway is the structure that releases excess water to prevent overtopping."}
            </Text>

            <HazardDisclaimer style={styles.disclaimer} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(24, 32, 51, 0.45)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#182033",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1F5",
  },
  scrollBody: {
    paddingHorizontal: 16,
  },
  currentCard: {
    borderWidth: 2,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 4,
  },
  currentHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentChip: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  currentChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  minorChip: {
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#EEF1F5",
  },
  minorChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#737B8C",
  },
  currentDam: {
    fontSize: 15,
    fontWeight: "700",
    color: "#182033",
  },
  currentSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5A6273",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#737B8C",
    marginBottom: 8,
  },
  ladder: {
    marginBottom: 16,
  },
  tierBlockWrap: {},
  tierRow: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 10,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  tierMain: {
    flex: 1,
    gap: 3,
  },
  tierLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  tierBand: {
    fontSize: 11,
    fontWeight: "600",
    color: "#737B8C",
  },
  tierPlain: {
    fontSize: 12,
    lineHeight: 16,
    color: "#5A6273",
  },
  criteriaLine: {
    fontSize: 11,
    lineHeight: 15,
    color: "#737B8C",
    marginTop: 1,
  },
  tierConnector: {
    paddingLeft: 15,
    height: 10,
  },
  connectorLine: {
    width: 2,
    height: "100%",
    opacity: 0.35,
  },
  explainText: {
    fontSize: 13,
    color: "#5A6273",
    marginBottom: 6,
  },
  explainBullet: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5A6273",
    marginBottom: 6,
    paddingLeft: 8,
  },
  explainBold: {
    fontWeight: "700",
    color: "#182033",
  },
  glossaryNote: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 15,
    color: "#9AA1B0",
    fontStyle: "italic",
  },
  disclaimer: {
    marginTop: 12,
    textAlign: "center",
  },
});
