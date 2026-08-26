import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { getReportById } from "@/services/reportService";
import { reverseGeocode } from "@/services/geocodingService";

const SCREEN_WIDTH = Dimensions.get("window").width;

const STATUS_STYLES = {
  open: { bg: "#FEE2E2", fg: "#B91C1C" },
  saved: { bg: "#FEF3C7", fg: "#A16207" },
  resolved: { bg: "#DCFCE7", fg: "#15803D" },
  unknown: { bg: colors.surface, fg: colors.muted },
};

function formatDate(value) {
  if (!value) return "\u2014";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ReportDetailScreen() {
  const params = useLocalSearchParams();
  const reportId = Number(params.reportId);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationLabel, setLocationLabel] = useState(null);

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    async function load() {
      try {
        const { report } = await getReportById(reportId);
        if (cancelled) return;
        setReport(report);
      } catch (e) {
        console.log("report-detail load error:", e);
        if (!cancelled) setError("Failed to load report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  useEffect(() => {
    if (!report?.latitude || !report?.longitude) return;
    let cancelled = false;
    reverseGeocode(report.latitude, report.longitude).then((result) => {
      if (!cancelled && result) {
        const parts = [result.barangay, result.city, result.province].filter(
          Boolean
        );
        setLocationLabel(parts.join(", "));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [report?.latitude, report?.longitude]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.muted} />
        <Text style={styles.errorText}>{error ?? "Report not found."}</Text>
      </View>
    );
  }

  const statusStyle = STATUS_STYLES[report.status] ?? STATUS_STYLES.unknown;
  const images = report.images ?? [];
  const reporterName = report.reporter?.name || report.reporter?.username;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {images.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageCarousel}
          >
            {images.map((img) => (
              <Image
                key={img.image_id}
                source={{ uri: img.public_url }}
                style={styles.carouselImage}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noImage}>
            <Ionicons
              name="image-outline"
              size={40}
              color={colors.placeholder}
            />
            <Text style={styles.noImageText}>No images attached</Text>
          </View>
        )}

        <View style={styles.topRow}>
          <View style={styles.reporterCol}>
            <Ionicons name="person-circle-outline" size={20} color={colors.muted} />
            <Text style={styles.reporterName} numberOfLines={1}>
              {reporterName || "Anonymous"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.fg }]}>
              {report.status}
            </Text>
          </View>
        </View>

        {locationLabel ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <Text style={styles.infoText}>{locationLabel}</Text>
          </View>
        ) : null}

        {report.people_affected != null ? (
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color={colors.muted} />
            <Text style={styles.infoText}>
              {report.people_affected} people affected
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <Text style={styles.infoText}>{formatDate(report.created_at)}</Text>
        </View>

        {report.ai_summary ? (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={styles.sectionTitle}>AI Summary</Text>
            </View>
            <Text style={styles.bodyText}>{report.ai_summary}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={14} color={colors.muted} />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.bodyText}>
            {report.description || "No description provided."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: colors.muted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageCarousel: {
    maxHeight: 260,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 260,
    backgroundColor: colors.border,
  },
  noImage: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    gap: 6,
  },
  noImageText: {
    fontSize: 13,
    color: colors.placeholder,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  reporterCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  reporterName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 3,
  },
  infoText: {
    fontSize: 13,
    color: colors.muted,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.muted,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
});
