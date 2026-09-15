import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';

export default function NotificationToast({ notification, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      dismissToast();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss && onDismiss();
    });
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>🔔</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Attendance Alert</Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={dismissToast}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORS.absentBorder,
    zIndex: 9999,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.absentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.absent,
    marginBottom: 2,
  },
  message: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: COLORS.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
});
