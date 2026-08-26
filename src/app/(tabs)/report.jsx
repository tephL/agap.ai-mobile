import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../constants/colors";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import {
  uploadReportPhoto,
  attachReportDescription,
  requestReportLocation,
  getDeviceLocation,
  getCachedLocation,
  sendOfflineReportSms,
  getOfflineDescriptionLimit,
  OFFLINE_DESCRIPTION_MAX,
} from "../../services/reportService";
import {
  cameraStore,
  MAX_PHOTOS,
  useCameraStore,
} from "../../store/cameraStore";

const NOTES_MAX = 500;

function formatSentAt(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function PingingCheckmark() {
  const ringA = useRef(new Animated.Value(0)).current;
  const ringB = useRef(new Animated.Value(0)).current;
  const ringC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateRing = (value, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const animations = [
      animateRing(ringA, 0),
      animateRing(ringB, 600),
      animateRing(ringC, 1200),
    ];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [ringA, ringB, ringC]);

  return (
    <View style={styles.successWrap}>
      {[ringA, ringB, ringC].map((progress, index) => (
        <Animated.View
          key={index}
          style={[
            styles.pulse,
            {
              opacity: progress.interpolate({
                inputRange: [0, 0.12, 1],
                outputRange: [0.5, 0.38, 0],
              }),
              transform: [
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.52, 1.18],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
      <View style={styles.checkCircle}>
        <Ionicons name="checkmark" size={36} color={colors.white} />
      </View>
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { photos, sentAt, locationStatus, locationError } = useCameraStore();
  const { isOnline } = useNetworkStatus();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [galleryOffset, setGalleryOffset] = useState(0);
  // Starts at the flat OFFLINE_DESCRIPTION_MAX and gets tightened once we
  // know the actual coordinates (see handleOfflineSubmit / the effect
  // below), since the SMS's fixed "SOS <lon> | <lat>" prefix eats into the
  // 160-char budget by a few characters depending on the digits involved.
  const [offlineCoords, setOfflineCoords] = useState(() => {
    if (!isOnline) return getCachedLocation();
    return null;
  });
  const [offlineDescLimit, setOfflineDescLimit] = useState(() => {
    if (offlineCoords) return getOfflineDescriptionLimit(offlineCoords);
    return OFFLINE_DESCRIPTION_MAX;
  });

  useEffect(() => {
    setNotes("");
    setGalleryOffset(0);
    setOfflineCoords(null);
    setOfflineDescLimit(OFFLINE_DESCRIPTION_MAX);
  }, [sentAt]);

  // Offline mode has no photo/network round trip to kick off location
  // fetching, so the hold gesture pre-fetches location in the background
  // (see CustomTabBar.onHoldComplete). This effect uses the cached result
  // for the character counter — or fetches if the cache was empty.
  useEffect(() => {
    if (isOnline || offlineCoords) return;

    const cached = getCachedLocation();
    if (cached) {
      setOfflineCoords(cached);
      setOfflineDescLimit(getOfflineDescriptionLimit(cached));
      return;
    }

    let cancelled = false;
    getDeviceLocation()
      .then((coords) => {
        if (cancelled) return;
        setOfflineCoords(coords);
        setOfflineDescLimit(getOfflineDescriptionLimit(coords));
      })
      .catch(() => {
        // Swallow here — the same lookup runs again (with proper error
        // handling / Settings prompts) when the user actually submits.
      });
    return () => {
      cancelled = true;
    };
  }, [isOnline, offlineCoords]);

  const descriptionMax = isOnline ? NOTES_MAX : offlineDescLimit;

  const atLimit = photos.length >= MAX_PHOTOS;

  const thumbSize = useMemo(() => {
    const horizontalPad = 56;
    const gap = 12;
    const visible = Math.min(photos.length + 1, MAX_PHOTOS);
    const available = width - horizontalPad;
    return Math.min(108, Math.max(76, (available - gap * (visible - 1)) / visible));
  }, [photos.length, width]);

  const activeDot = Math.min(
    MAX_PHOTOS - 1,
    Math.max(0, Math.round(galleryOffset / (thumbSize + 12)))
  );

  const openCamera = () => {
    if (atLimit || submitting) return;
    router.push("/camera");
  };

  const openPreview = (index) => {
    if (submitting) return;
    cameraStore.openPhoto(index);
    router.push("/camera-preview");
  };

  const removePhoto = (index) => {
    if (submitting) return;
    cameraStore.removePhoto(index);
  };

  const closeForm = useCallback(() => {
    cameraStore.discardReport();
    router.replace("/");
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (submitting) return true;
        Alert.alert(
          "Discard report?",
          "Your current report will be discarded and won't be saved.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", style: "destructive", onPress: closeForm },
          ]
        );
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [closeForm, submitting])
  );

  const handleSkip = () => {
    if (submitting) return;
    Alert.alert(
      "Skip this report?",
      "None of these details will be sent, and they won't be saved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: closeForm },
      ]
    );
  };

  // Re-fires the location request if the first attempt failed (e.g. the
  // user turned Location Services / permission on and wants to try again).
  const retryLocation = () => {
    cameraStore.setLocationRequest(requestReportLocation());
  };

  // Routes a failed location request to the right fix. "Services off" and
  // "permission denied" open different settings screens, so they get
  // different copy and both offer a direct path to fix it plus a retry.
  const showLocationErrorAlert = (error) => {
    if (error?.code === "SERVICES_DISABLED") {
      Alert.alert(
        "Turn on Location Services",
        "Your device's location services are off, so we can't attach your location to this report. Turn them on, then retry.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Retry", onPress: retryLocation },
        ]
      );
    } else if (error?.code === "PERMISSION_DENIED") {
      Alert.alert(
        "Location Permission Needed",
        "Allow location access so we can attach it to your report.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Retry", onPress: retryLocation },
        ]
      );
    } else {
      Alert.alert(
        "Couldn't confirm your location",
        error?.message
          ? `We couldn't get your location (${error.message}). Please try again.`
          : "We couldn't get your location. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: retryLocation },
        ]
      );
    }
  };

  // Surfaces a failed location request as soon as it happens, rather than
  // making the user discover it only when they hit Submit — this is an SOS
  // flow, so time matters. Guarded by a ref (not state) so it fires once
  // per distinct failure, not on every unrelated re-render.
  const lastLocationErrorRef = useRef(null);
  useEffect(() => {
    if (locationStatus !== "error" || !locationError) return;
    if (lastLocationErrorRef.current === locationError) return;
    lastLocationErrorRef.current = locationError;
    showLocationErrorAlert(locationError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationStatus, locationError]);

  const handleSubmit = async () => {
    if (submitting) return;

    const description = notes.trim();
    if (photos.length === 0 && !description) {
      Alert.alert(
        "Add a detail",
        "Add at least a photo or a description before submitting."
      );
      return;
    }

    setSubmitting(true);
    try {
      // This resolves once /api/reports/location has actually created the
      // report row. Uploading photos or a description before this finishes
      // is what previously caused "No report to attach image/description to".
      const { ok, error } = await cameraStore.waitForLocation();
      if (!ok) {
        showLocationErrorAlert(error);
        return;
      }

      for (let i = 0; i < photos.length; i += 1) {
        await uploadReportPhoto(photos[i].uri);
      }
      if (description) {
        await attachReportDescription(description);
      }

      closeForm();
    } catch (err) {
      const message = err?.response
        ? err?.response?.data?.message ||
          err?.response?.data?.error ||
          `Server responded with status ${err.response.status}.`
        : `Couldn't reach the server (${err?.message || "network error"}). Check your connection and API URL.`;
      Alert.alert("Upload failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  // Offline mode: no backend to reach, so instead of uploading we build the
  // SMS body ourselves and hand it to the native composer. The user still
  // has to tap Send there — expo-sms (like any cross-platform SMS API)
  // can't send silently on iOS/Android.
  const handleOfflineSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { latitude, longitude } = await getDeviceLocation();
      const { sent } = await sendOfflineReportSms({
        latitude,
        longitude,
        description: notes.trim(),
      });

      if (!sent) {
        Alert.alert(
          "Message not sent",
          "The text message was closed before it was sent. Try again when you're ready."
        );
        return;
      }

      closeForm();
    } catch (err) {
      if (err?.code === "SERVICES_DISABLED") {
        Alert.alert(
          "Turn on Location Services",
          "Your device's location services are off, so we can't include it in the text. Turn them on, then try again.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Retry", onPress: handleOfflineSubmit },
          ]
        );
      } else if (err?.code === "PERMISSION_DENIED") {
        Alert.alert(
          "Location Permission Needed",
          "Allow location access so we can include it in the text.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Retry", onPress: handleOfflineSubmit },
          ]
        );
      } else {
        Alert.alert(
          "Couldn't prepare message",
          err?.message || "Something went wrong preparing your report text.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Retry", onPress: handleOfflineSubmit },
          ]
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSubmit = () => {
    if (submitting) return;
    if (isOnline) {
      Alert.alert(
        "Submit details?",
        "Are you sure you want to submit your current details?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: handleSubmit },
        ]
      );
    } else {
      Alert.alert(
        "Send text message?",
        "This opens your messaging app with your location pre-filled. You'll still need to tap Send there.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: handleOfflineSubmit },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sentAt}>
            request sent: {formatSentAt(sentAt)}
          </Text>

          <PingingCheckmark />

          <Text style={styles.title}>SOS SENT</Text>
          <Text style={styles.subtitle}>
            help us help you. Add critical details.
          </Text>

          {!isOnline && (
            <View style={styles.offlineNotice}>
              <Ionicons name="cloud-offline-outline" size={16} color={colors.text} />
              <Text style={styles.offlineNoticeText}>
                You're offline. We'll open a text message with your location
                instead — photos aren't available right now.
              </Text>
            </View>
          )}

          <TextInput
            style={styles.notes}
            value={notes}
            onChangeText={(value) => setNotes(value.slice(0, descriptionMax))}
            placeholder={
              isOnline
                ? "describe your situation in detail (e.g. number of people involved, specific injuries and any hazards) this information is crucial for first responders..."
                : "add a short description to include in the text (optional)"
            }
            placeholderTextColor={colors.placeholder}
            multiline
            textAlignVertical="top"
            maxLength={descriptionMax}
            editable={!submitting}
          />
          <Text style={styles.counter}>
            {notes.length}/{descriptionMax}
          </Text>

          {isOnline && (
          <>
          <View style={styles.galleryBox}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
              onScroll={(event) =>
                setGalleryOffset(event.nativeEvent.contentOffset.x)
              }
              scrollEventThrottle={16}
            >
              <TouchableOpacity
                style={[
                  styles.takePhoto,
                  { width: thumbSize, height: thumbSize },
                  atLimit && styles.takePhotoDisabled,
                ]}
                onPress={openCamera}
                disabled={atLimit || submitting}
                activeOpacity={0.85}
              >
                <View style={styles.cameraIconWrap}>
                  <Ionicons
                    name="camera-outline"
                    size={28}
                    color={atLimit ? colors.muted : colors.text}
                  />
                  <View
                    style={[
                      styles.plusBadge,
                      atLimit && styles.plusBadgeDisabled,
                    ]}
                  >
                    <Ionicons name="add" size={11} color={colors.white} />
                  </View>
                </View>
                <Text
                  style={[
                    styles.takePhotoLabel,
                    atLimit && styles.takePhotoLabelDisabled,
                  ]}
                >
                  take photo
                </Text>
              </TouchableOpacity>

              {photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}
                >
                  <TouchableOpacity
                    onPress={() => openPreview(index)}
                    activeOpacity={0.85}
                    style={styles.thumbHit}
                    disabled={submitting}
                  >
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.thumb}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removePhoto(index)}
                    hitSlop={8}
                    disabled={submitting}
                  >
                    <Ionicons name="close" size={12} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dots}>
              {Array.from({ length: MAX_PHOTOS }).map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index === activeDot && styles.dotActive]}
                />
              ))}
            </View>
          </View>

          <Text style={styles.caption}>attach up to {MAX_PHOTOS} images only</Text>
          </>
          )}

          <TouchableOpacity
            style={styles.submit}
            onPress={confirmSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.submitText}>
                {isOnline ? "SUBMIT DETAILS" : "SEND TEXT MESSAGE"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={submitting}
            hitSlop={8}
          >
            <Text style={styles.skip}>SKIP</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: "center",
  },
  sentAt: {
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  successWrap: {
    width: 128,
    height: 128,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.6,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
  },
  notes: {
    width: "100%",
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  counter: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 14,
    fontSize: 11,
    color: colors.muted,
  },
  galleryBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  gallery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  takePhoto: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  takePhotoDisabled: {
    opacity: 0.45,
  },
  cameraIconWrap: {
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadge: {
    position: "absolute",
    right: -4,
    top: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  plusBadgeDisabled: {
    backgroundColor: colors.muted,
  },
  takePhotoLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text,
  },
  takePhotoLabelDisabled: {
    color: colors.muted,
  },
  thumbWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  thumbHit: {
    flex: 1,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: colors.muted,
    textAlign: "center",
  },
  submit: {
    marginTop: 22,
    width: "100%",
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 0.4,
  },
  skip: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.8,
  },
});
