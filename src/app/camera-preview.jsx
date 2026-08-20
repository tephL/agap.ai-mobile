import { useState } from "react";
import {
  ActivityIndicator,
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
import { uploadReportPhoto } from "../services/reportService";

export default function CameraPreviewScreen() {
  const { uri } = useCameraStore();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleRetake = () => {
    cameraStore.clearPhoto();
    router.back();
  };

  const handleConfirm = async () => {
    if (!uri || uploading) return;
    setUploading(true);
    try {
      await uploadReportPhoto(uri);
      cameraStore.clearPhoto();
      Alert.alert("Report sent", "Your photo has been uploaded.", [
        { text: "OK", onPress: () => router.replace("/(tabs)/report") },
      ]);
    } catch (err) {
      // Temporary verbose logging to diagnose upload failures — check the
      // Metro/device console for this after tapping Confirm.
      console.log("Report upload failed");
      console.log("message:", err?.message);
      console.log("code:", err?.code);
      console.log("has response:", Boolean(err?.response));
      console.log("status:", err?.response?.status);
      console.log("response data:", err?.response?.data);

      const message = err?.response
        ? err?.response?.data?.message ||
          err?.response?.data?.error ||
          `Server responded with status ${err.response.status}.`
        : `Couldn't reach the server (${err?.message || "network error"}). Check your connection and API URL.`;
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  };

  if (!uri) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No photo to preview.</Text>
        <TouchableOpacity onPress={() => router.replace("/camera")}>
          <Text style={styles.retryLink}>Open Camera</Text>
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
          onPress={handleRetake}
          disabled={uploading}
          hitSlop={8}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.retakeButton]}
            onPress={handleRetake}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color={colors.text} />
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={handleConfirm}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.white} />
                <Text style={styles.confirmText}>Confirm</Text>
              </>
            )}
          </TouchableOpacity>
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