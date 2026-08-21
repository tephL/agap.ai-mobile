import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Picker } from "@react-native-picker/picker";
import { createFamily, RELATIONS } from "@/services/familyService";
import colors from "@/constants/colors";

export default function CreateFamilyScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("father");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Family name is required");
      return;
    }

    setLoading(true);
    try {
      await createFamily({
        name: name.trim(),
        relation,
      });


      Alert.alert("Success", "Family created!", [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)/family"),
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to create family"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Family Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. The Santos Family"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Your Relation</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={relation}
          onValueChange={setRelation}
          style={styles.picker}
        >
          {RELATIONS.map((r) => (
            <Picker.Item key={r} label={r} value={r} />
          ))}
        </Picker>
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Create Family</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
    color: colors.text,
  },
  pickerWrapper: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: 24,
  },
  picker: {
    height: 50,
  },
  btn: {
    backgroundColor: colors.primary,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});
