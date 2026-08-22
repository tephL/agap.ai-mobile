import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import colors from "../constants/colors";
import { cameraStore, useCameraStore } from "../store/cameraStore";

export default function CameraPreviewScreen() {
  const { pending, photos, previewMode, viewingIndex } = useCameraStore();
  const router = useRouter();
  const isViewing = previewMode === "view";
  const uri = isViewing ? photos[viewingIndex]?.uri : pending?.uri;

  const returnToReport = () => {
    if (typeof router.canDismiss === "function" && router.canDismiss()) {
      router.dismissAll();
    }
    router.navigate("/report");
  };

  const handleBack = () => {
    if (isViewing) {
      router.back();
      return;
    }
    cameraStore.clearPending();
    returnToReport();
  };

  const handleDeleteOrRetake = () => {
    if (isViewing) {
      Alert.alert(
        "Delete photo?",
        "This photo will be removed from your report.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            style: "destructive",
            onPress: () => {
              cameraStore.removePhoto(viewingIndex);
              router.back();
            },
          },
        ]
      );
      return;
    }
    cameraStore.clearPending();
    router.back();
  };

  const handleConfirm = () => {
    if (isViewing || !uri) return;
    cameraStore.confirmPending();
    returnToReport();
  };

  if (!uri) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No photo to preview.</Text>
        <TouchableOpacity onPress={returnToReport}>
          <Text style={styles.retryLink}>Back to Report</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.preview} resizeMode="cover" />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleBack}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={handleDeleteOrRetake}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isViewing ? "trash-outline" : "refresh"}
              size={18}
              color={colors.text}
            />
            <Text style={styles.retakeText}>
              {isViewing ? "Delete" : "Retake"}
            </Text>
          </TouchableOpacity>

          {!isViewing && (
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color={colors.white} />
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  preview: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  closeButton: {
    marginTop: 12,
    marginLeft: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retakeButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  retakeText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  emptyText: { color: colors.muted, fontSize: 14, marginBottom: 12 },
  retryLink: { color: colors.primary, fontWeight: "600" },
});
