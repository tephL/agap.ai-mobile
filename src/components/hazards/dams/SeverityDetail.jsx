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

import { SEVERITY_CRITERIA } from "./damSeverity";
import HazardDisclaimer from "../common/HazardDisclaimer";

const SEVERITY_ORDER = ["danger", "caution", "normal", "unknown"];

export default function SeverityDetail({
  visible,
  onClose,
  damName,
  severityLevel,
}) {
  const current = SEVERITY_CRITERIA[severityLevel] ?? SEVERITY_CRITERIA.unknown;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>How reservoir status is decided</Text>
            <Pressable hitSlop={12} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#5A6273" />
            </Pressable>
          </View>

          <ScrollView bounces={false} contentContainerStyle={styles.scrollBody}>
            {/* Current status card */}
            <View style={[styles.currentCard, { borderColor: `${current.color}59` }]}>
              <View style={styles.currentHead}>
                <View style={[styles.currentChip, { backgroundColor: current.color }]}>
                  <Text style={styles.currentChipText}>{current.label}</Text>
                </View>
              </View>
              <Text style={styles.currentDam}>{damName ?? "This dam"}</Text>
              <Text style={styles.currentSummary}>{current.summary}</Text>
            </View>

            {/* Decision ladder */}
            <Text style={styles.sectionTitle}>How status is determined</Text>
            <View style={styles.ladder}>
              {SEVERITY_ORDER.map((key, index) => {
                const tier = SEVERITY_CRITERIA[key];
                const isCurrent = key === severityLevel;
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
                          {isCurrent && (
                            <Text style={styles.youBadge}>you</Text>
                          )}
                        </View>
                        <Text style={styles.tierPlain}>{tier.summary}</Text>
                        {isCurrent &&
                          tier.criteria.map((line) => (
                            <Text key={line} style={styles.criteriaLine}>
                              {"\u2022 "}
                              {line}
                            </Text>
                          ))}
                      </View>
                    </View>
                    {index < SEVERITY_ORDER.length - 1 && (
                      <View style={styles.tierConnector}>
                        <View style={[styles.connectorLine, { backgroundColor: SEVERITY_CRITERIA[SEVERITY_ORDER[index + 1]].color }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* What do these numbers mean */}
            <Text style={styles.sectionTitle}>What do these numbers mean?</Text>
            <Text style={styles.explainBullet}>
              <Text style={styles.explainBold}>{"NHWL (normal high water level) \u2014 "}</Text>
              the maximum safe water height for a reservoir. When water reaches
              this level, the dam&apos;s spillway may activate to release excess water.
            </Text>
            <Text style={styles.explainBullet}>
              <Text style={styles.explainBold}>{"Rule curve \u2014 "}</Text>
              a target water level set by dam operators for each month. Staying
              near the rule curve leaves enough flood-storage capacity for the
              rainy season.
            </Text>
            <Text style={styles.explainBullet}>
              <Text style={styles.explainBold}>{"Spillway \u2014 "}</Text>
              a structure that safely releases excess water to prevent the dam
              from overtopping. A spillway release is a normal operational
              procedure, not an emergency.
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
    gap: 8,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  youBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#737B8C",
    backgroundColor: "#EEF1F5",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
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
  disclaimer: {
    marginTop: 12,
    textAlign: "center",
  },
});
