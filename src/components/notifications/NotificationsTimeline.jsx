import { useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import colors from "@/constants/colors";
import {
  formatNotificationTime,
  getPlaceholderNotifications,
  groupNotificationsByDate,
} from "@/data/notificationsPlaceholders";

const TYPE_ICONS = {
  weather: { Icon: Ionicons, name: "information-circle-outline" },
  typhoon: { Icon: MaterialCommunityIcons, name: "weather-hurricane" },
  earthquake: { Icon: Ionicons, name: "home-outline" },
};

const FADE_DISTANCE = 170;
const MIN_OPACITY = 0.18;

function opacityForItem(y, height, scrollY, viewportH) {
  if (!viewportH) return 1;
  const center = y + height / 2;
  const fadeStart = scrollY + viewportH - FADE_DISTANCE;
  if (center <= fadeStart) return 1;
  const t = (center - fadeStart) / FADE_DISTANCE;
  return Math.max(MIN_OPACITY, 1 - t);
}

export default function NotificationsTimeline() {
  const groups = useMemo(
    () => groupNotificationsByDate(getPlaceholderNotifications()),
    []
  );
  const rows = useMemo(() => {
    const list = [];
    groups.forEach((group) => {
      list.push({ kind: "date", id: `date-${group.key}`, label: group.label });
      group.items.forEach((item) => {
        list.push({ kind: "item", id: item.id, item });
      });
    });
    return list;
  }, [groups]);

  const layouts = useRef({});
  const [scrollY, setScrollY] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [, setTick] = useState(0);

  const rememberLayout = (id, layout) => {
    const prev = layouts.current[id];
    if (prev && prev.y === layout.y && prev.height === layout.height) {
      return;
    }
    layouts.current[id] = layout;
    setTick((n) => n + 1);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onLayout={(event) => setViewportH(event.nativeEvent.layout.height)}
      onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
    >
      <View>
      <View style={styles.timelineLine} pointerEvents="none" />

      {rows.map((row) => {
        const layout = layouts.current[row.id];
        const opacity = layout
          ? opacityForItem(layout.y, layout.height, scrollY, viewportH)
          : 1;

        if (row.kind === "date") {
          return (
            <View
              key={row.id}
              style={[styles.dateRow, { opacity }]}
              onLayout={(event) => rememberLayout(row.id, event.nativeEvent.layout)}
            >
              <View style={styles.dateBadge}>
                <Text style={styles.dateLabel}>{row.label}</Text>
              </View>
            </View>
          );
        }

        const { item } = row;
        const icon =
          TYPE_ICONS[item.type] || TYPE_ICONS.weather;
        const Icon = icon.Icon;

        return (
          <TouchableOpacity
            key={row.id}
            activeOpacity={0.85}
            style={[styles.itemRow, { opacity }]}
            onLayout={(event) => rememberLayout(row.id, event.nativeEvent.layout)}
            onPress={() =>
              Alert.alert(item.title, "No behavior yet")
            }
          >
            <Text style={styles.time}>{formatNotificationTime(item.at)}</Text>
            <View style={styles.iconWrap}>
              <Icon name={icon.name} size={18} color={colors.primary} />
            </View>
            <View style={styles.card}>
              <View style={styles.cardCopy}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
        );
      })}
      </View>
    </ScrollView>
  );
}

const LINE_LEFT = 87;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 48,
    paddingRight: 0,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: LINE_LEFT,
    top: 8,
    bottom: 24,
    width: 2,
    backgroundColor: colors.primary,
  },
  dateRow: {
    alignItems: "flex-start",
    paddingLeft: LINE_LEFT - 21,
    marginVertical: 10,
  },
  dateBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 44,
    alignItems: "center",
  },
  dateLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 88,
    paddingLeft: 8,
    marginBottom: 8,
  },
  time: {
    width: 52,
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 11,
    marginRight: 8,
    zIndex: 1,
  },
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingLeft: 8,
    paddingRight: 10,
    minHeight: 84,
  },
  cardCopy: {
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  itemDescription: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
});
