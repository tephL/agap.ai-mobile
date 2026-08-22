import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { getMyProfile } from "@/services/personService";
import { getCurrentUserId } from "@/services/currentUser";
import { clearForUser } from "@/services/familyRepo";
import colors from "@/constants/colors";

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const res = await getMyProfile();
          if (active) setProfile(res.data);
        } catch {
          if (active) setProfile(null);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  async function handleLogout() {
    const token = await SecureStore.getItemAsync("token");
    console.log(token);
    // Wipe this user's offline snapshot before the token is gone, so a
    // different account can never see stale cached family data.
    const userId = await getCurrentUserId();
    if (userId != null) {
      try {
        await clearForUser(userId);
      } catch {}
    }
    await SecureStore.deleteItemAsync("token");
    console.log(token);
    router.replace("/login");
  }

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const p = profile || {};

  const formatPhone = (phone) => {
    if (!phone) return "N/A";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.length === 10) {
      return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return `+63 ${digits}`;
  };

  const formatName = () => {
    const parts = [p.first_name, p.middle_name, p.last_name].filter(Boolean);
    return parts.length ? parts.join(" ") : "N/A";
  };

  const formatPets = () => {
    if (!p.pets || !p.pets.length) return "None";
    return Array.isArray(p.pets) ? p.pets.join(", ") : String(p.pets);
  };

  const normalizeList = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string" && val.length > 0) {
      const cleaned = val.replace(/[{}]/g, "");
      return cleaned.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Page Label */}
      <Text style={styles.pageLabel}>PROFILE</Text>

      {/* Personal Information */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
        </View>

        <FieldRow label="PHONE NUMBER" value={formatPhone(p.phone_number)} />
        <FieldRow label="FULL NAME" value={formatName()} />

        <View style={styles.sideBySide}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>GENDER</Text>
            <Text style={styles.fieldValue}>
              {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "N/A"}
            </Text>
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>AGE</Text>
            <Text style={styles.fieldValue}>{p.age ? `${p.age} years old` : "N/A"}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>DISABILITIES</Text>
        <View style={styles.chipRow}>
          {normalizeList(p.disabilities).length > 0 ? (
            normalizeList(p.disabilities).map((d) => <Chip key={d} text={d} />)
          ) : (
            <Chip text="None" />
          )}
        </View>
      </View>

      {/* Location */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>LOCATION</Text>
        </View>

        <FieldRow label="CITY" value={p.city} />
        <FieldRow label="BARANGAY" value={p.barangay} />
        <FieldRow label="STREET" value={p.street} />
        <FieldRow label="ADDRESS" value={p.address} />
      </View>

      {/* Household */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="home" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>HOUSEHOLD</Text>
        </View>

        <FieldRow label="HOUSE FLOORS" value={p.house_floors} />
        <Text style={styles.fieldLabel}>PETS</Text>
        <Chip text={formatPets()} />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FieldRow({ label, value }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || "N/A"}</Text>
    </View>
  );
}

function Chip({ text }) {
  const isNone = text === "None";
  return (
    <View style={[styles.chip, isNone && styles.chipNone]}>
      <Text style={[styles.chipText, isNone && styles.chipTextNone]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },

  /* Page Label */
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 12,
  },

  /* Cards */
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* Fields */
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  sideBySide: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 10,
  },
  halfField: {
    flex: 1,
  },

  /* Chips */
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "#FDECEC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 2,
  },
  chipNone: {
    backgroundColor: "#FDECEC",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  chipTextNone: {
    color: colors.primary,
  },

  /* Logout */
  logoutButton: {
    marginHorizontal: 16,
    marginVertical: 20,
    marginBottom: 32,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  logoutText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 15,
  },
});
