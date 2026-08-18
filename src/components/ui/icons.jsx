import { View, StyleSheet } from "react-native";

const STROKE = 1.7;

function PersonIcon({ color = "#9AA2B1", size = 20 }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={[
          styles.stroke,
          {
            borderColor: color,
            top: size * 0.05,
            left: size * 0.3,
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
          },
        ]}
      />
      <View
        style={[
          styles.stroke,
          {
            borderColor: color,
            top: size * 0.58,
            left: size * 0.17,
            width: size * 0.66,
            height: size * 0.38,
            borderTopLeftRadius: size * 0.33,
            borderTopRightRadius: size * 0.33,
            borderBottomWidth: 0,
          },
        ]}
      />
    </View>
  );
}

function PhoneIcon({ color = "#9AA2B1", size = 20 }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={[
          styles.stroke,
          {
            borderColor: color,
            top: size * 0.08,
            left: size * 0.22,
            width: size * 0.56,
            height: size * 0.86,
            borderRadius: size * 0.28,
          },
        ]}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.48,
          left: size * 0.3,
          width: size * 0.4,
          height: STROKE,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function LockIcon({ color = "#9AA2B1", size = 20 }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={[
          styles.stroke,
          {
            borderColor: color,
            top: size * 0.03,
            left: size * 0.28,
            width: size * 0.44,
            height: size * 0.42,
            borderTopLeftRadius: size * 0.22,
            borderTopRightRadius: size * 0.22,
            borderBottomWidth: 0,
          },
        ]}
      />
      <View
        style={[
          styles.stroke,
          {
            borderColor: color,
            top: size * 0.34,
            left: size * 0.14,
            width: size * 0.72,
            height: size * 0.62,
            borderRadius: size * 0.14,
          },
        ]}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.52,
          left: size * 0.46,
          width: size * 0.08,
          height: size * 0.08,
          borderRadius: size * 0.04,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function EyeIcon({ color = "#9AA2B1", size = 20, off = false }) {
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <View
        style={[
          styles.stroke,
          {
            borderColor: color,
            top: size * 0.24,
            left: 0,
            width: size,
            height: size * 0.52,
            borderRadius: size * 0.26,
          },
        ]}
      />
      <View
        style={{
          position: "absolute",
          top: size * 0.4,
          left: size * 0.4,
          width: size * 0.2,
          height: size * 0.2,
          borderRadius: size * 0.1,
          backgroundColor: color,
        }}
      />
      {off && (
        <View
          style={{
            position: "absolute",
            top: -size * 0.05,
            left: size * 0.45,
            width: STROKE,
            height: size * 1.1,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: "relative",
  },
  stroke: {
    position: "absolute",
    borderWidth: STROKE,
  },
});

export { PersonIcon, PhoneIcon, LockIcon, EyeIcon };
