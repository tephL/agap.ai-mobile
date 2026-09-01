import React, { useEffect, useState } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Marker } from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import { resolveDamSeverity } from "./damSeverity";

const ICON_SIZE = 28;
const CIRCLE_SIZE = 34;

function DamMarker({ dam, onPress }) {
  const severity = resolveDamSeverity(dam);
  const isNormal = severity.level === "normal" || severity.level === "unknown";
  const [badgeAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (severity.level === "danger") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(badgeAnim, {
            toValue: 0.3,
            duration: 550,
            useNativeDriver: true,
          }),
          Animated.timing(badgeAnim, {
            toValue: 1,
            duration: 550,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    badgeAnim.setValue(1);
  }, [severity.level, badgeAnim]);

  return (
    <Marker
      id={`dam-marker-${dam.slug}`}
      lngLat={[dam.coordinates.lng, dam.coordinates.lat]}
      anchor="center"
      onPress={() => onPress({ properties: dam })}
    >
      <View style={styles.iconWrap}>
        <View
          style={[
            styles.iconCircle,
            { borderColor: severity.color },
          ]}
        >
          <Ionicons name="water-outline" size={ICON_SIZE} color={severity.color} />
        </View>
        {!isNormal && (
          <Animated.Text
            style={[
              styles.badge,
              {
                color: severity.color,
                opacity: severity.level === "danger" ? badgeAnim : 1,
              },
            ]}
          >
            !
          </Animated.Text>
        )}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: CIRCLE_SIZE + 6,
    height: CIRCLE_SIZE + 6,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
});

export default React.memo(DamMarker, (prev, next) => prev.dam?.slug === next.dam?.slug);
