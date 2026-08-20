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
import { Picker } from "@react-native-picker/picker"; // or use a simple map if you don't want extra package
import { createFamily, RELATIONS } from "@/services/familyService";

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
      const family = await createFamily({
        name: name.trim(),
        relation,
      });

      // Save for later
      await SecureStore.setItemAsync("family_id", String(family.family_id));
      await SecureStore.setItemAsync("is_family_creator", "true");

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
      <Text style={styles.title}>Create Your Family</Text>

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
    backgroundColor: "#f8f8f8",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
  },
  pickerWrapper: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 30,
  },
  picker: {
    height: 50,
  },
  btn: {
    backgroundColor: "#1c1c1c",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});