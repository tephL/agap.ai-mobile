import { Image, Text, View, StyleSheet } from "react-native";
import colors from "../../constants/colors";

export default function Logo({ size = 48 }) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/icons/logo.png")}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            borderRadius: size * 0.25,
          },
        ]}
      />
      <Text style={styles.brand}>AGAP.ai</Text>
      <Text style={styles.tagline}>MAAGAP NA KA-AGAPAY</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  logo: {
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: colors.text,
  },
  tagline: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: colors.muted,
  },
});
