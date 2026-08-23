import React, { useEffect, useRef } from 'react';
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

export const PersonCard = ({
  age,
  first_name,
  last_name,
  phone_number,
  relation,
  user_id,
  onClose,
  onCall,
}) => {
  const slideAnim = useRef(new Animated.Value(height * 0.4)).current;

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

  return (
    <Animated.View
      style={[
        styles.container,
        {
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
          <Text style={styles.relation}>{relation}</Text>
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
    zIndex: 9999,           // ← Add this (React Native)
    elevation: 9999,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
