import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ onNavigate }) {
  const { colleges, login } = useAuth();
  const { colors, themeMode, toggleTheme } = useTheme();

  const [loginMode, setLoginMode] = useState('college'); // 'college' | 'superadmin'
  const [selectedCollegeCode, setSelectedCollegeCode] = useState('VJIT');
  const [role, setRole] = useState('student'); // 'teacher' | 'student' | 'admin'
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      if (loginMode === 'superadmin') {
        const result = await login('SUPERADMIN', password, 'superadmin');
        if (result.success) {
          onNavigate('SuperAdminDashboard');
        } else {
          setError(result.error || 'Super Admin login failed');
        }
        return;
      }

      if (!collegeId || !password) {
        setError('Please enter User ID and Password');
        return;
      }

      const result = await login(collegeId.trim(), password.trim(), role, selectedCollegeCode);
      if (result.success) {
        const dest = role === 'admin'
          ? 'AdminDashboard'
          : role === 'teacher'
          ? 'TeacherDashboard'
          : 'StudentDashboard';
        onNavigate(dest);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (selectedRole) => {
    setError('');
    if (selectedRole === 'superadmin') {
      setLoginMode('superadmin');
    } else {
      setLoginMode('college');
      setRole(selectedRole);
    }
  };

  const handleFillDemo = () => {
    setError('');
    if (loginMode === 'superadmin') {
      setPassword('superadmin123');
      return;
    }
    const creds = role === 'admin'
      ? { id: 'ADMIN-001', pass: 'admin123' }
      : role === 'teacher'
      ? { id: 'VJIT-T-001', pass: 'teacher123' }
      : { id: 'CE21001', pass: 'student123' };

    setCollegeId(creds.id);
    setPassword(creds.pass);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screenContainer, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.versionBadge}>
          <Text style={[styles.versionText, { color: colors.accentBlue }]}>⚡ Knapsack 2.0</Text>
        </View>
        <TouchableOpacity
          style={[styles.themeToggleBtn, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Text style={styles.themeToggleEmoji}>{themeMode === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Main Logo & Title */}
        <View style={styles.brandBox}>
          <Image
            source={require('../../assets/app logo.png')}
            style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 12 }}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Knap<Text style={{ color: colors.accentBlue }}>sack</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Multi-College Smart Attendance Network
          </Text>
        </View>

        {/* Minimal Clean Sign In Card */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
          {/* Card Title & Mode Indicator */}
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {loginMode === 'superadmin' ? 'Super Admin Portal 👑' : 'Sign In'}
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                {loginMode === 'superadmin'
                  ? 'Platform infrastructure & college management'
                  : 'Select your college server & sign in below'}
              </Text>
            </View>
            {loginMode === 'superadmin' && (
              <TouchableOpacity
                style={[styles.backToCollegeBtn, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}
                onPress={() => { setLoginMode('college'); setError(''); }}
              >
                <Text style={[styles.backToCollegeText, { color: colors.accentBlue }]}>← Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {loginMode === 'college' ? (
            <>
              {/* College Server Pills */}
              <View style={styles.fieldHeaderRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT COLLEGE SERVER</Text>
                <Text style={[styles.selectedCollegeBadge, { color: colors.accentBlue }]}>{selectedCollegeCode}</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collegeScroll}>
                {colleges.map((c) => {
                  const isSelected = selectedCollegeCode === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[
                        styles.collegePill,
                        { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle },
                        isSelected && [styles.collegePillActive, { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow }]
                      ]}
                      onPress={() => setSelectedCollegeCode(c.code)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pillTopRow}>
                        <Text style={[
                          styles.collegePillCode,
                          { color: colors.textSecondary },
                          isSelected && { color: colors.accentBlue }
                        ]}>
                          {c.code}
                        </Text>
                        {isSelected && <Text style={styles.activeCheck}>✓</Text>}
                      </View>
                      <Text style={[styles.collegePillCity, { color: colors.textMuted }]}>{c.city}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* User ID Field */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {role === 'teacher'
                  ? 'TEACHER ID / EMPLOYEE CODE'
                  : role === 'admin'
                  ? 'COLLEGE ADMIN USER ID'
                  : 'STUDENT ROLL NUMBER / ID'}
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
                <Text style={styles.inputIcon}>
                  {role === 'teacher' ? '🆔' : role === 'admin' ? '🏢' : '👤'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder={
                    role === 'teacher'
                      ? 'e.g. VJIT-T-001'
                      : role === 'admin'
                      ? 'e.g. VJIT-ADMIN'
                      : 'e.g. CE21001'
                  }
                  placeholderTextColor={colors.textMuted}
                  value={collegeId}
                  onChangeText={setCollegeId}
                  autoCapitalize="none"
                />
              </View>
            </>
          ) : (
            /* Super Admin Mode */
            <View style={styles.superAdminBox}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>MASTER SUPER ADMIN ID</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.bgSecondary, borderColor: '#f59e0b' }]}>
                <Text style={styles.inputIcon}>👑</Text>
                <TextInput
                  style={[styles.input, { color: '#fbbf24', fontWeight: 'bold' }]}
                  value="SUPERADMIN"
                  editable={false}
                />
              </View>
            </View>
          )}

          {/* Password Field */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.borderSubtle }]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder={loginMode === 'superadmin' ? 'Enter Super Admin Password' : 'Enter password'}
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={[styles.errorText, { color: colors.absent }]}>⚠️ {error}</Text> : null}

          {/* Main Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.accentBlue },
              loginMode === 'superadmin' && styles.superSubmitBtn
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {loginMode === 'superadmin'
                  ? '👑 Sign In as Super Admin'
                  : `Sign In as ${role === 'teacher' ? 'Teacher' : role === 'admin' ? 'College Admin' : 'Student'} (${selectedCollegeCode})`}
              </Text>
            )}
          </TouchableOpacity>

          {/* Streamlined Bottom Role Switcher & Demo Auto-fill */}
          <View style={[styles.quickPortalSection, { borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.quickPortalTitle, { color: colors.textMuted }]}>SELECT ACCOUNT ROLE</Text>
            <View style={styles.quickPortalGrid}>
              <TouchableOpacity
                style={[
                  styles.quickPortalBtn,
                  { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle },
                  role === 'student' && loginMode === 'college' && { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow }
                ]}
                onPress={() => handleRoleSelect('student')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickEmoji}>👨‍🎓</Text>
                <Text style={[
                  styles.quickText,
                  { color: colors.textSecondary },
                  role === 'student' && loginMode === 'college' && { color: colors.accentBlue, fontWeight: '700' }
                ]}>Student</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickPortalBtn,
                  { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle },
                  role === 'teacher' && loginMode === 'college' && { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow }
                ]}
                onPress={() => handleRoleSelect('teacher')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickEmoji}>👨‍🏫</Text>
                <Text style={[
                  styles.quickText,
                  { color: colors.textSecondary },
                  role === 'teacher' && loginMode === 'college' && { color: colors.accentBlue, fontWeight: '700' }
                ]}>Teacher</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickPortalBtn,
                  { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle },
                  role === 'admin' && loginMode === 'college' && { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow }
                ]}
                onPress={() => handleRoleSelect('admin')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickEmoji}>🏢</Text>
                <Text style={[
                  styles.quickText,
                  { color: colors.textSecondary },
                  role === 'admin' && loginMode === 'college' && { color: colors.accentBlue, fontWeight: '700' }
                ]}>Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickPortalBtn,
                  styles.superQuickBtn,
                  loginMode === 'superadmin' && styles.superQuickBtnActive
                ]}
                onPress={() => handleRoleSelect('superadmin')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickEmoji}>👑</Text>
                <Text style={[styles.quickText, { color: '#fbbf24', fontWeight: '700' }]}>Super Admin</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.fillDemoBtn} onPress={handleFillDemo} activeOpacity={0.7}>
              <Text style={[styles.fillDemoText, { color: colors.accentBlue }]}>⚡ Auto-fill Sample Demo Credentials</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Links */}
        <View style={styles.footerContainer}>
          <View style={styles.footerLinksRow}>
            <TouchableOpacity><Text style={[styles.footerLinkText, { color: colors.textMuted }]}>Terms & Conditions</Text></TouchableOpacity>
            <Text style={[styles.footerDot, { color: colors.textMuted }]}>•</Text>
            <TouchableOpacity><Text style={[styles.footerLinkText, { color: colors.textMuted }]}>Privacy Policy</Text></TouchableOpacity>
            <Text style={[styles.footerDot, { color: colors.textMuted }]}>•</Text>
            <TouchableOpacity><Text style={[styles.footerLinkText, { color: colors.textMuted }]}>Contact Us</Text></TouchableOpacity>
          </View>
          <Text style={[styles.copyrightText, { color: colors.textMuted }]}>
            © 2026 Knapsack Network. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  versionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  themeToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleEmoji: {
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
    paddingBottom: 220,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  backToCollegeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  backToCollegeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 2,
  },
  selectedCollegeBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  collegeScroll: {
    marginBottom: 14,
  },
  collegePill: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 10,
    minWidth: 85,
  },
  collegePillActive: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pillTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  collegePillCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeCheck: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '900',
  },
  collegePillCity: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  superAdminBox: {
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  submitBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  superSubmitBtn: {
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quickPortalSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  quickPortalTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  quickPortalGrid: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  quickPortalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  superQuickBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  superQuickBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderColor: '#fbbf24',
  },
  quickEmoji: {
    fontSize: 14,
  },
  quickText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fillDemoBtn: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  fillDemoText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerContainer: {
    marginTop: 22,
    alignItems: 'center',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: 12,
  },
  copyrightText: {
    fontSize: 10,
  },
});
