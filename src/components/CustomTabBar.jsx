import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const ICONS = {
  index: 'map',
  assistant: 'sparkles',
  family: 'people',
  profile: 'person',
};

const primaryColor = '#D32F2F';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  const centerIndex = state.routes.findIndex((r) => r.name === 'report');
  const centerRoute = centerIndex !== -1 ? state.routes[centerIndex] : null;

  // The center button opens the camera modal directly rather than
  // navigating to the "report" tab itself.
  const onCenterPress = () => {
    router.push('/camera');
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { paddingBottom: insets.bottom || 10 }]}>
        {state.routes.map((route) => {
          const isCenter = route.name === 'report';

          // render an invisible, non-interactive placeholder to preserve spacing
          if (isCenter) {
            return <View key={route.key} style={styles.tabItem} pointerEvents="none" />;
          }

          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === routeIndex;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons
                name={ICONS[route.name] || 'ellipse'}
                size={24}
                color={isFocused ? primaryColor : '#9AA0A6'}
              />
              <Text style={[styles.label, { color: isFocused ? primaryColor : '#9AA0A6' }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {centerRoute && (
        <TouchableOpacity
          style={styles.centerButton}
          activeOpacity={0.85}
          onPress={onCenterPress}
        >
          <Ionicons name="megaphone" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    height: 74,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  centerButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: -28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 20,
  },
});