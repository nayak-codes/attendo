import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';

export default function BottomNavBar({ activeTab, onSelectTab, role }) {
  const { colors } = useTheme();

  // Tabs configuration based on user role
  const getTabs = () => {
    if (role === 'teacher') {
      return [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'analysis', label: 'Analysis', icon: '📊' },
        { id: 'timetable', label: 'Timetable', icon: '🗓️' },
        { id: 'profile', label: 'Profile', icon: '👤' },
      ];
    }
    if (role === 'admin') {
      return [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'roster', label: 'Roster', icon: '👥' },
        { id: 'reports', label: 'Reports', icon: '📊' },
        { id: 'profile', label: 'Profile', icon: '👤' },
      ];
    }
    if (role === 'superadmin') {
      return [
        { id: 'home', label: 'Colleges', icon: '🏛️' },
        { id: 'provision', label: 'Provision', icon: '➕' },
        { id: 'system', label: 'System', icon: '⚡' },
        { id: 'profile', label: 'Profile', icon: '👤' },
      ];
    }
    // Default: Student
    return [
      { id: 'home', label: 'Home', icon: '🏠' },
      { id: 'analysis', label: 'Analysis', icon: '📊' },
      { id: 'calendar', label: 'Calendar', icon: '📅' },
      { id: 'timetable', label: 'Timetable', icon: '🗓️' },
      { id: 'profile', label: 'Profile', icon: '👤' },
    ];
  };

  const tabs = getTabs();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderTopColor: colors.borderSubtle }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              isActive && { backgroundColor: colors.accentBlueGlow }
            ]}
            onPress={() => onSelectTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[
              styles.tabLabel,
              { color: isActive ? colors.accentBlue : colors.textMuted },
              isActive && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
            {isActive && <View style={[styles.activeDot, { backgroundColor: colors.accentBlue }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    position: 'relative',
    marginHorizontal: 3,
  },
  tabItemActive: {
    backgroundColor: COLORS.accentBlueGlow,
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 3,
    opacity: 0.8,
  },
  tabIconActive: {
    opacity: 1,
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.accentBlue,
    fontWeight: '800',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.accentBlue,
    position: 'absolute',
    bottom: 2,
  },
});
