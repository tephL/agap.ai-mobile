import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import colors from "../../constants/colors";
import FormInput from "../ui/FormInput";
import { createTeam } from "../../services/teamService";

const PHONE_RE = /^[0-9+\-\s()]{7,}$/;

export default function CreateTeamModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setContact("");
    setLocation("");
    setErrors({});
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Team name is required.";
    if (!contact.trim()) {
      next.contact = "Contact number is required.";
    } else if (!PHONE_RE.test(contact.trim())) {
      next.contact = "Enter a valid contact number.";
    }
    if (!location.trim()) next.location = "Location is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      const team = await createTeam({
        name,
        contact_number: contact,
        location_text: location,
      });
      resetForm();
      onCreated?.(team);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Create Team</Text>

          <FormInput
            label="Name"
            value={name}
            onChangeText={(v) => setName(v)}
            error={errors.name}
            placeholder="e.g. Rescue Alpha"
          />
          <FormInput
            label="Contact Number"
            value={contact}
            onChangeText={(v) => setContact(v)}
            keyboardType="phone-pad"
            error={errors.contact}
            placeholder="09XXXXXXXXX"
          />
          <FormInput
            label="Location"
            value={location}
            onChangeText={(v) => setLocation(v)}
            error={errors.location}
            placeholder="e.g. Barangay Hall, San Roque"
          />

          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="check" size={18} color={colors.white} />
                <Text style={styles.submitText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
