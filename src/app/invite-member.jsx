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
import { useRouter, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { inviteMember, RELATIONS } from "@/services/familyService";
import { normalizePhoneNumber } from "@/services/authService";
import colors from "@/constants/colors";

export default function InviteScreen() {
  const router = useRouter();
  const { familyId } = useLocalSearchParams();
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("son");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Phone number is required");
      return;
    }

    setLoading(true);
    try {
      await inviteMember(familyId, {
        phone_number: normalizePhoneNumber(phone),
        relation,
      });

      Alert.alert("Success", "Invitation sent!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to send invitation";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="09XXXXXXXXX"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={styles.label}>Relation</Text>
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
        onPress={handleInvite}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Send Invite</Text>
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
