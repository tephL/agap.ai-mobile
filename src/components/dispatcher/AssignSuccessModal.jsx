import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";

/**
 * Confirmation popup shown right after a team is assigned to a cluster.
 *
 *   <AssignSuccessModal
 *     visible={assignOpen}
 *     teamName="Rescue Alpha"
 *     clusterLabel="Cluster #12 · Cebu City"
 *     onClose={() => setAssignOpen(false)}
 *   />
 */
export default function AssignSuccessModal({
  visible,
  teamName,
  clusterLabel,
  onClose,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.checkWrap}>
            <Ionicons name="checkmark" size={30} color={colors.white} />
          </View>
          <Text style={styles.title}>Team Assigned</Text>
          <Text style={styles.copy}>
            {teamName ?? "The team"} is dispatching to{" "}
            {clusterLabel ?? "the cluster"}.
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            activeOpacity={0.85}
            onPress={onClose}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(24, 32, 51, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  checkWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  copy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
  doneButton: {
    alignSelf: "stretch",
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
});
