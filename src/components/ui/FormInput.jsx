import { useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";

export default function FormInput({
  label,
  optional = false,
  icon,
  prefix,
  accessory,
  multiline = false,
  helper,
  error,
  style,
  inputRef,
  onFocus,
  onBlur,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);

  const handleFocus = (event) => {
    setFocused(true);
    if (onFocus) onFocus(event);
  };

  const handleBlur = (event) => {
    setFocused(false);
    if (onBlur) onBlur(event);
  };

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optionalTag}> (Optional)</Text> : null}
      </Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          !error && focused && styles.inputWrapFocused,
          error && styles.inputWrapError,
        ]}
      >
        {prefix ? (
          <View style={styles.prefix}>
            {prefix.icon ? (
              <View style={styles.prefixIcon}>{prefix.icon}</View>
            ) : null}
            {prefix.text ? (
              <Text style={styles.prefixText}>{prefix.text}</Text>
            ) : null}
          </View>
        ) : null}
        {icon ? (
          <View
            style={[styles.inputIcon, multiline && styles.inputIconMultiline]}
          >
            {icon}
          </View>
        ) : null}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            (icon || prefix) && styles.inputWithIcon,
            prefix && styles.inputWithPrefix,
            accessory && styles.inputWithAccessory,
            multiline && styles.inputMultiline,
          ]}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...inputProps}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  optionalTag: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  inputWrapFocused: {
    borderColor: colors.text,
  },
  inputWrapError: {
    borderColor: colors.primary,
  },
  inputWrapMultiline: {
    height: "auto",
    minHeight: 88,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: colors.text,
  },
  inputWithIcon: {
    paddingLeft: 40,
    paddingRight: 16,
  },
  inputWithPrefix: {
    paddingLeft: 12,
    paddingRight: 16,
  },
  inputWithAccessory: {
    paddingRight: 40,
  },
  inputMultiline: {
    height: "auto",
    minHeight: 88,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  inputIcon: {
    position: "absolute",
    left: 12,
  },
  inputIconMultiline: {
    top: 14,
  },
  prefix: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    paddingLeft: 12,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixIcon: {
    marginRight: 6,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  accessory: {
    position: "absolute",
    right: 12,
  },
  helper: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
});