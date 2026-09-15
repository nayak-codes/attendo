import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../theme/colors';
import { getInitials } from '../data/mockData';

export default function StudentCard({ student, status, onToggle }) {
  const isPresent = status === 'present';
  const initials = getInitials(student.name);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    // Bounce animation on tap
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onToggle(student.id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={{ flex: 1, margin: 5 }}
    >
      <Animated.View
        style={[
          styles.card,
          isPresent ? styles.cardPresent : styles.cardAbsent,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Color accent bar */}
        <View style={[styles.topBar, isPresent ? styles.barPresent : styles.barAbsent]} />

        {/* Roll No + Badge row */}
        <View style={styles.topRow}>
          <Text style={styles.rollNo}>{student.rollNo}</Text>
          <View style={[styles.badge, isPresent ? styles.badgePresent : styles.badgeAbsent]}>
            <Text style={[styles.badgeText, { color: isPresent ? COLORS.present : COLORS.absent }]}>
              {isPresent ? '✓' : '✕'}
            </Text>
          </View>
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, isPresent ? styles.avatarPresent : styles.avatarAbsent]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Name & dept */}
        <Text style={styles.name} numberOfLines={1}>{student.name}</Text>
        <Text style={styles.dept}>{student.department} • Sec {student.section}</Text>

        {/* Action hint */}
        <View style={[styles.hintBox, isPresent ? styles.hintBoxPresent : styles.hintBoxAbsent]}>
          <Text style={[styles.hintText, { color: isPresent ? COLORS.present : COLORS.absent }]}>
            {isPresent ? '✅ Present' : '❌ Absent'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1.5,
    alignItems: 'center',
    overflow: 'hidden',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  cardPresent: {
    borderColor: COLORS.presentBorder,
    backgroundColor: 'rgba(16, 185, 129, 0.07)',
  },
  cardAbsent: {
    borderColor: COLORS.absentBorder,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  barPresent: { backgroundColor: COLORS.present },
  barAbsent: { backgroundColor: COLORS.absent },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 2,
  },
  rollNo: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePresent: { backgroundColor: COLORS.presentBg },
  badgeAbsent: { backgroundColor: COLORS.absentBg },
  badgeText: { fontSize: 11, fontWeight: '800' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarPresent: { backgroundColor: '#1A4A6E' },
  avatarAbsent: { backgroundColor: '#5C1A1A' },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 1,
  },
  dept: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  hintBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  hintBoxPresent: { backgroundColor: COLORS.presentBg },
  hintBoxAbsent: { backgroundColor: COLORS.absentBg },
  hintText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
