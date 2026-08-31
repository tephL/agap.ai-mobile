import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const COLORS = {
  primary: '#E32F31',
  secondary: '#C62A2C',
  background: '#FFFFFF',
  surface: '#F5F5F7',
  text: '#182033',
  muted: '#737B8C',
  border: '#E0E2E7',
  placeholder: '#9AA2B1',
  white: '#FFFFFF',
};

const TAB_BAR_HEIGHT = 50;
const NOW_TICK_INTERVAL_MS = 5000; // keep in sync with map's staleness re-check

// Formats an epoch-ms timestamp into a short relative label.
function formatLastSeen(lastSeenMs, nowMs) {
  if (lastSeenMs == null) return '—';

  const diffMs = nowMs - lastSeenMs;
  if (diffMs < 0) return 'Just now';

  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// Mirrors the map's staleColorExpr thresholds/colors.
function getLastSeenColor(lastSeenMs, nowMs, yellowThresholdMs, grayThresholdMs) {
  if (lastSeenMs == null) return COLORS.muted;

  const ageMs = nowMs - lastSeenMs;
  if (ageMs < yellowThresholdMs) return '#22c55e'; // green: seen < 5 min ago
  if (ageMs < grayThresholdMs) return '#eab308';   // yellow: < 30 min ago
  return '#a9a9a9';                                 // gray: older / stale
}

export const PersonCard = ({
  age,
  first_name,
  last_name,
  phone_number,
  relation,
  user_id,
  last_seen,
  has_active_report,
  onClose,
  onCall,
  staleYellowThresholdMs = 5 * 60 * 1000,
  staleGrayThresholdMs = 30 * 60 * 1000,
}) => {
  const slideAnim = useRef(new Animated.Value(height * 0.4)).current;

  // live-ticking clock so last_seen label/color stay fresh while card is open
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), NOW_TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Slide up animation on mount
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: height * 0.4,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleCall = () => {
    if (onCall) {
      onCall(phone_number, user_id);
    }
  };

  const lastSeenLabel = formatLastSeen(last_seen, now);
  const lastSeenColor = getLastSeenColor(
    last_seen,
    now,
    staleYellowThresholdMs,
    staleGrayThresholdMs
  );

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: height * 0.4 + TAB_BAR_HEIGHT,
          paddingBottom: 60 + TAB_BAR_HEIGHT,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header with close button */}
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          onPress={handleClose} 
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Name */}
        <View style={styles.nameContainer}>
          <Text style={styles.name}>
            {first_name} {last_name}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.relation}>{relation}</Text>
            {has_active_report && (
              <View style={styles.reportTag}>
                <Ionicons name="warning" size={12} color={COLORS.primary} />
                <Text style={styles.reportTagText}>Reported</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info rows */}
        <View style={styles.infoSection}>
          {/* Age */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.muted} />
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{age} years old</Text>
          </View>

          {/* Phone */}
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="call-outline" size={18} color={COLORS.muted} />
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{phone_number}</Text>
          </View>

          {/* Last seen */}
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Ionicons name="time-outline" size={18} color={COLORS.muted} />
            <Text style={styles.infoLabel}>Last seen</Text>
            <View style={styles.lastSeenValueWrap}>
              <View style={[styles.lastSeenDot, { backgroundColor: lastSeenColor }]} />
              <Text style={[styles.infoValue, { color: lastSeenColor }]}>
                {lastSeenLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Call button */}
        <TouchableOpacity
          style={styles.callButton}
          onPress={handleCall}
          activeOpacity={0.85}
        >
          <Ionicons 
            name="call" 
            size={20} 
            color={COLORS.white} 
            style={{ marginRight: 8 }} 
          />
          <Text style={styles.callButtonText}>Call {first_name}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
      zIndex: 9999,
      elevation: 9999,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
  }, 
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameContainer: {
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  relation: {
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  reportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDECEC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  reportTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoSection: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: '500',
    minWidth: 50,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  lastSeenValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lastSeenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  callButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  callButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
