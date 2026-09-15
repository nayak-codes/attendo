import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AttendanceProvider, useAttendance } from './src/context/AttendanceContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { COLORS } from './src/theme/colors';

import LoginScreen from './src/screens/LoginScreen';
import TeacherDashboardScreen from './src/screens/TeacherDashboardScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendancePreviewScreen from './src/screens/AttendancePreviewScreen';
import StudentDashboardScreen from './src/screens/StudentDashboardScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import SuperAdminDashboardScreen from './src/screens/SuperAdminDashboardScreen';
import NotificationToast from './src/components/NotificationToast';

// Notification bridge: listens for new absent notifications and shows a toast
function NotificationBridge() {
  const { notifications } = useAttendance();
  const [activeToast, setActiveToast] = useState(null);
  const [shownIds, setShownIds] = useState(new Set());

  useEffect(() => {
    // Find the latest unread notification that hasn't been shown yet
    const newNotif = notifications.find(n => !n.read && !shownIds.has(n.id));
    if (newNotif && !activeToast) {
      setActiveToast(newNotif);
      setShownIds(prev => new Set([...prev, newNotif.id]));
    }
  }, [notifications]);

  if (!activeToast) return null;

  return (
    <NotificationToast
      notification={activeToast}
      onDismiss={() => setActiveToast(null)}
    />
  );
}

function MainApp() {
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [screenData, setScreenData] = useState(null);
  const { colors, themeMode } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === 'superadmin') {
        setCurrentScreen('SuperAdminDashboard');
      } else if (user.role === 'admin') {
        setCurrentScreen('AdminDashboard');
      } else if (user.role === 'teacher') {
        setCurrentScreen('TeacherDashboard');
      } else {
        setCurrentScreen('StudentDashboard');
      }
    } else {
      setCurrentScreen('Login');
    }
  }, [user]);

  const navigateTo = (screenName, data = null) => {
    setScreenData(data);
    setCurrentScreen(screenName);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bgSecondary} />
      <View style={styles.screenWrapper}>
        {currentScreen === 'Login' && (
          <LoginScreen onNavigate={navigateTo} />
        )}
        {currentScreen === 'TeacherDashboard' && (
          <TeacherDashboardScreen onNavigate={navigateTo} />
        )}
        {currentScreen === 'Attendance' && (
          <AttendanceScreen sessionInfo={screenData || {}} onNavigate={navigateTo} />
        )}
        {currentScreen === 'AttendancePreview' && (
          <AttendancePreviewScreen data={screenData || {}} onNavigate={navigateTo} />
        )}
        {currentScreen === 'StudentDashboard' && (
          <StudentDashboardScreen onNavigate={navigateTo} />
        )}
        {currentScreen === 'AdminDashboard' && (
          <AdminDashboardScreen onNavigate={navigateTo} />
        )}
        {currentScreen === 'SuperAdminDashboard' && (
          <SuperAdminDashboardScreen onNavigate={navigateTo} />
        )}
      </View>
      {/* Global notification toast overlay */}
      <NotificationBridge />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AttendanceProvider>
          <MainApp />
        </AttendanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  screenWrapper: {
    flex: 1,
  },
});
