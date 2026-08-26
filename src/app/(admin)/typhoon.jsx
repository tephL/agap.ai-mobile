import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import {
  getAllTyphoons,
  createTyphoon,
  updateTyphoon,
  deleteTyphoon,
} from "../../services/typhoonService";

const SIGNAL_LEVELS = [1, 2, 3, 4, 5];

export default function TyphoonScreen() {
  const [typhoons, setTyphoons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formSignal, setFormSignal] = useState(2);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async ({ refreshing: isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getAllTyphoons();
      setTyphoons(data?.typhoons ?? []);
      setErrored(false);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormSignal(2);
    setFormActive(true);
  };

  const startEdit = (typhoon) => {
    setEditingId(typhoon.id);
    setFormName(typhoon.name ?? "");
    setFormSignal(typhoon.signal_number ?? 2);
    setFormActive(typhoon.is_active ?? false);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert("Validation", "Typhoon name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        signal_number: formSignal,
        is_active: formActive,
      };
      if (editingId) {
        await updateTyphoon(editingId, payload);
      } else {
        await createTyphoon(payload);
      }
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error ?? "Failed to save typhoon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (typhoon) => {
    Alert.alert(
      "Delete Typhoon",
      `Delete "${typhoon.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTyphoon(typhoon.id);
              if (editingId === typhoon.id) resetForm();
              loadData();
            } catch (e) {
              Alert.alert("Error", e?.response?.data?.error ?? "Failed to delete.");
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (typhoon) => {
    try {
      await updateTyphoon(typhoon.id, {
        name: typhoon.name,
        signal_number: typhoon.signal_number,
        is_active: !typhoon.is_active,
      });
      loadData();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error ?? "Failed to toggle.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <StatusBar style="dark" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.pageLabel}>Typhoon Management</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? "Edit Typhoon" : "New Typhoon"}
          </Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Typhoon Karina"
            placeholderTextColor={colors.placeholder}
            value={formName}
            onChangeText={setFormName}
          />

          <Text style={styles.fieldLabel}>Signal Level</Text>
          <View style={styles.signalRow}>
            {SIGNAL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.signalChip,
                  formSignal === level && styles.signalChipActive,
                ]}
                onPress={() => setFormSignal(level)}
              >
                <Text
                  style={[
                    styles.signalChipText,
                    formSignal === level && styles.signalChipTextActive,
                  ]}
                >
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>Active (visible to citizens)</Text>
            <Switch
              value={formActive}
              onValueChange={setFormActive}
              trackColor={{ false: "#D1D5DB", true: "#FCA5A5" }}
              thumbColor={formActive ? colors.primary : "#9CA3AF"}
            />
          </View>

          <View style={styles.formActions}>
            {editingId && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetForm}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingId ? "Update" : "Create"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Existing Typhoons</Text>

        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData({ refreshing: true })}
          tintColor={colors.primary}
        />

        {errored ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.primary} />
            <Text style={styles.emptyTitle}>Unable to load typhoons</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : typhoons.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="thunderstorm-outline" size={32} color={colors.primary} />
            <Text style={styles.emptyTitle}>No typhoons</Text>
            <Text style={styles.emptyCopy}>
              Create a typhoon record above to send alerts to citizen users.
            </Text>
          </View>
        ) : (
          typhoons.map((t) => (
            <View key={t.id} style={styles.typhoonCard}>
              <View style={styles.typhoonRow}>
                <View style={styles.typhoonInfo}>
                  <Text style={styles.typhoonName}>{t.name}</Text>
                  <Text style={styles.typhoonMeta}>
                    Signal No. {t.signal_number ?? "N/A"}
                  </Text>
                </View>
                <Switch
                  value={t.is_active}
                  onValueChange={() => handleToggleActive(t)}
                  trackColor={{ false: "#D1D5DB", true: "#FCA5A5" }}
                  thumbColor={t.is_active ? colors.primary : "#9CA3AF"}
                />
              </View>
              <View style={styles.typhoonActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => startEdit(t)}
                >
                  <Ionicons name="pencil" size={14} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteAction]}
                  onPress={() => handleDelete(t)}
                >
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                  <Text style={[styles.actionBtnText, styles.deleteActionText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 14,
  },
  pageLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  signalRow: {
    flexDirection: "row",
    gap: 8,
  },
  signalChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  signalChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  signalChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  signalChipTextActive: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 8,
  },
  typhoonCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  typhoonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typhoonInfo: {
    flex: 1,
  },
  typhoonName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  typhoonMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  typhoonActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  deleteAction: {},
  deleteActionText: {
    color: "#DC2626",
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.white,
  },
});
