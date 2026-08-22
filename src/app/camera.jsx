import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../constants/colors";
import { cameraStore, MAX_PHOTOS, useCameraStore } from "../store/cameraStore";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);
  const router = useRouter();
  const { photos } = useCameraStore();
  const atLimit = photos.length >= MAX_PHOTOS;

  const handleBack = () => {
    cameraStore.clearPending();
    router.back();
  };

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing || atLimit) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      cameraStore.setPhoto(photo);
      router.push("/camera-preview");
    } catch (err) {
      console.warn("Failed to capture photo", err);
    } finally {
      setIsCapturing(false);
    }
  }, [atLimit, isCapturing, router]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.muted} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Allow camera access to attach a photo to your report.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleBack} hitSlop={12}>
          <Text style={styles.cancelLink}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleBack}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.shutterOuter, atLimit && styles.shutterDisabled]}
            onPress={handleCapture}
            disabled={isCapturing || atLimit}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    alignItems: "center",
    paddingBottom: 28,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: colors.background,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  permissionButton: {
    height: 46,
    paddingHorizontal: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionButtonText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  cancelLink: {
    marginTop: 16,
    color: colors.muted,
    fontSize: 14,
  },
});
