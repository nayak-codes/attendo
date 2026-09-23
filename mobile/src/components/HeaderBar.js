import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { loginUser } from '../firebase/authService';

const AVATAR_COLORS = [
  '#3B82F6', '#A855F7', '#22C55E', '#F97316', '#EF4444', '#06B6D4', '#EC4899',
];

export default function HeaderBar({
  title,
  subtitle,
  onLogout,
  linkedProfiles,
  activeProfileId,
  onSwitchProfile,
  onAddProfile,
  onRemoveProfile,
}) {
  const { user, colleges } = useAuth();
  const { themeMode, toggleTheme, colors } = useTheme();

  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Friend login form state
  const [selectedCollegeCode, setSelectedCollegeCode] = useState(user?.selectedCollegeCode || 'VJIT');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const isStudent = user?.role === 'student';
  const activeProfile = linkedProfiles?.find(p => p.id === activeProfileId);
  const displayName = activeProfile ? activeProfile.name : (user?.name || 'Student');
  const displayInitial = displayName.charAt(0).toUpperCase();
  const avatarColor = activeProfile
    ? AVATAR_COLORS[(linkedProfiles.indexOf(activeProfile)) % AVATAR_COLORS.length]
    : AVATAR_COLORS[0];

  const resetLoginForm = () => {
    setLoginId('');
    setLoginPass('');
    setLoginError('');
    setShowPass(false);
    setSelectedCollegeCode(user?.selectedCollegeCode || 'VJIT');
  };

  const handleLoginAndAdd = async () => {
    if (!loginId.trim() || !loginPass.trim()) {
      setLoginError('Please enter College ID and Password.');
      return;
    }
    if (!selectedCollegeCode) {
      setLoginError('Please select a college.');
      return;
    }
    if (linkedProfiles?.find(p => p.rollNo === loginId.trim() || p.collegeId === loginId.trim())) {
      setLoginError('This profile is already linked.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const result = await loginUser(loginId.trim(), loginPass.trim(), 'student');
      if (result.success) {
        const friendUser = result.user;
        const newProfile = {
          id: Date.now().toString(),
          name: friendUser.name || loginId.trim(),
          rollNo: friendUser.rollNo || friendUser.collegeId || loginId.trim(),
          collegeId: friendUser.collegeId || loginId.trim(),
          dept: friendUser.department || 'CSE',
          year: friendUser.year || '3rd Year',
          section: friendUser.section || 'A',
          collegeCode: selectedCollegeCode,
          uid: friendUser.uid,
        };
        onAddProfile && onAddProfile(newProfile);
        resetLoginForm();
        setShowLoginForm(false);
      } else {
        setLoginError(result.error || 'Invalid credentials. Please check and try again.');
      }
    } catch (e) {
      setLoginError('Login failed. Check credentials and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <>
      {/* ── TOP HEADER ── */}
      <View style={[styles.header, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.borderSubtle }]}>
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/app logo.png')}
            style={styles.logoBoxImage}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
              Knap<Text style={{ color: colors.accentBlue }}>sack</Text>
            </Text>
            {subtitle ? <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.userRow}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={styles.themeToggleText}>{themeMode === 'dark' ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>

          {user && (
            <>
              {isStudent && linkedProfiles ? (
                <TouchableOpacity
                  style={[styles.profileChip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}
                  onPress={() => setShowSwitcher(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.chipAvatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.chipAvatarText}>{displayInitial}</Text>
                    <View style={styles.activeDot} />
                  </View>
                  <View style={{ maxWidth: 82 }}>
                    <Text style={[styles.chipName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    {linkedProfiles.length > 1 && (
                      <Text style={[styles.chipSub, { color: colors.accentBlue }]}>
                        {linkedProfiles.length} profiles ▾
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.userBadge, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                    {user.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
                <Text style={styles.logoutText}>🚪</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ══════ PROFILE SWITCHER BOTTOM SHEET ══════ */}
      <Modal
        visible={showSwitcher}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowSwitcher(false); setShowLoginForm(false); resetLoginForm(); }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => { setShowSwitcher(false); setShowLoginForm(false); resetLoginForm(); }}
        />
        <View style={[styles.switcherSheet, { backgroundColor: colors.bgPrimary, borderColor: colors.borderSubtle }]}>
          <View style={[styles.handleBar, { backgroundColor: colors.borderSubtle }]} />

          {!showLoginForm ? (
            /* ── PROFILE LIST ── */
            <>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Switch Profile</Text>
              <Text style={[styles.sheetSub, { color: colors.textMuted }]}>
                Tap any profile to view their attendance
              </Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {linkedProfiles && linkedProfiles.map((profile, idx) => {
                  const isActive = profile.id === activeProfileId;
                  const pColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const isMe = profile.id === 'self';
                  return (
                    <TouchableOpacity
                      key={profile.id}
                      style={[
                        styles.profileListRow,
                        { borderBottomColor: colors.borderSubtle },
                        isActive && { backgroundColor: colors.accentBlueGlow, borderRadius: 12 }
                      ]}
                      onPress={() => { onSwitchProfile && onSwitchProfile(profile.id); setShowSwitcher(false); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.switcherAvatar, { backgroundColor: pColor }]}>
                        <Text style={styles.switcherAvatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
                        {isActive && <View style={[styles.activeDot, { width: 10, height: 10, bottom: -1, right: -1 }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.switcherName, { color: colors.textPrimary }]}>{profile.name}</Text>
                          {isMe && (
                            <View style={{ backgroundColor: colors.accentBlueGlow, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                              <Text style={{ fontSize: 9, fontWeight: '900', color: colors.accentBlue }}>YOU</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.switcherRoll, { color: colors.textMuted }]}>
                          {profile.rollNo} • {profile.dept} • Sec {profile.section}
                          {profile.collegeCode ? ` • ${profile.collegeCode}` : ''}
                        </Text>
                      </View>
                      {isActive ? (
                        <View style={[styles.activeCheck, { backgroundColor: colors.accentBlue }]}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>
                        </View>
                      ) : (
                        !isMe && (
                          <TouchableOpacity
                            style={[styles.removeBtn, { borderColor: 'rgba(239,68,68,0.4)' }]}
                            onPress={() => Alert.alert(
                              'Remove Profile',
                              `Remove ${profile.name}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Remove', style: 'destructive', onPress: () => onRemoveProfile && onRemoveProfile(profile.id) },
                              ]
                            )}
                          >
                            <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>✕</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[styles.addBtn, { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow }]}
                onPress={() => { setShowLoginForm(true); setLoginError(''); }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 18 }}>➕</Text>
                <Text style={[styles.addBtnText, { color: colors.accentBlue }]}>Log into Another Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── FRIEND LOGIN FORM (Instagram "Log into another account" style) ── */
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Back */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}
                onPress={() => { setShowLoginForm(false); resetLoginForm(); }}
              >
                <Text style={{ fontSize: 18, color: colors.accentBlue }}>←</Text>
                <Text style={{ fontSize: 13, color: colors.accentBlue, fontWeight: '700' }}>Back</Text>
              </TouchableOpacity>

              {/* Logo + Title */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Image
                  source={require('../../assets/app logo.png')}
                  style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 4 }}
                  resizeMode="contain"
                />
                <Text style={[styles.sheetTitle, { color: colors.textPrimary, textAlign: 'center', marginTop: 10 }]}>
                  Log into Another Account
                </Text>
                <Text style={[styles.sheetSub, { color: colors.textMuted, textAlign: 'center' }]}>
                  Use your friend's Knapsack credentials to link their profile
                </Text>
              </View>

              {/* ── COLLEGE SELECTOR ── */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SELECT COLLEGE SERVER</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 10, color: colors.textMuted }}>Scroll to find your college</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentBlue }}>{selectedCollegeCode}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 18 }}
              >
                {(colleges || []).map(c => {
                  const isSelected = selectedCollegeCode === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      style={[
                        styles.collegePill,
                        {
                          backgroundColor: isSelected ? colors.accentBlueGlow : colors.bgCard,
                          borderColor: isSelected ? colors.accentBlue : colors.borderSubtle,
                        }
                      ]}
                      onPress={() => setSelectedCollegeCode(c.code)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.pillCode, { color: isSelected ? colors.accentBlue : colors.textSecondary }]}>
                          {c.code}
                        </Text>
                        {isSelected && <Text style={{ color: colors.accentBlue, fontSize: 11, fontWeight: '900' }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{c.city || ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── STUDENT ID FIELD ── */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>STUDENT ROLL NUMBER / ID</Text>
              <View style={[styles.inputWrapper, {
                backgroundColor: colors.bgCard,
                borderColor: loginError && !loginId ? '#EF4444' : colors.borderSubtle,
              }]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  value={loginId}
                  onChangeText={v => { setLoginId(v); setLoginError(''); }}
                  placeholder="e.g. CE21001"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  style={[styles.inputText, { color: colors.textPrimary }]}
                />
              </View>

              {/* ── PASSWORD FIELD ── */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
              <View style={[styles.inputWrapper, {
                backgroundColor: colors.bgCard,
                borderColor: loginError && !loginPass ? '#EF4444' : colors.borderSubtle,
              }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  value={loginPass}
                  onChangeText={v => { setLoginPass(v); setLoginError(''); }}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPass}
                  style={[styles.inputText, { color: colors.textPrimary, flex: 1 }]}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16 }}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Error */}
              {loginError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {loginError}</Text>
                </View>
              ) : null}

              {/* Link Profile Button */}
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: loginLoading ? colors.textMuted : colors.accentBlue }]}
                onPress={handleLoginAndAdd}
                disabled={loginLoading}
                activeOpacity={0.85}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginBtnText}>
                    🔗 Link Profile ({selectedCollegeCode})
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.note, { color: colors.textMuted }]}>
                🔒 Credentials are used only to verify identity and are not stored on this device.
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingTop: 45, paddingBottom: 16,
    borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBoxImage: { width: 38, height: 38, borderRadius: 10 },
  brandTitle: { fontSize: 20, fontWeight: '800' },
  brandSubtitle: { fontSize: 11 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeToggleBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themeToggleText: { fontSize: 16 },
  userBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '600' },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 16 },

  // Profile chip
  profileChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  chipAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  chipAvatarText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  chipName: { fontSize: 12, fontWeight: '800' },
  chipSub: { fontSize: 10, fontWeight: '600' },
  activeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E',
    borderWidth: 1.5, borderColor: '#FFFFFF', position: 'absolute', bottom: 0, right: 0,
  },

  // Bottom sheet
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.40)' },
  switcherSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderBottomWidth: 0,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12,
    maxHeight: '86%',
  },
  handleBar: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  sheetSub: { fontSize: 12, marginBottom: 16 },

  // Profile list rows
  profileListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 8, marginBottom: 2,
  },
  switcherAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  switcherAvatarText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  switcherName: { fontSize: 14, fontWeight: '800' },
  switcherRoll: { fontSize: 11, marginTop: 2 },
  activeCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, marginTop: 14,
  },
  addBtnText: { fontSize: 14, fontWeight: '800' },

  // Login form
  loginLogoBox: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, marginTop: 4 },

  // College pills
  collegePill: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9,
    marginRight: 10, minWidth: 80,
  },
  pillCode: { fontSize: 13, fontWeight: '800' },

  // Input
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, marginBottom: 14,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  inputText: { flex: 1, paddingVertical: 13, fontSize: 14, fontWeight: '500' },

  // Error & Login button
  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#FCA5A5',
  },
  errorText: { fontSize: 12, color: '#B91C1C', fontWeight: '600' },
  loginBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  loginBtnText: { fontSize: 15, fontWeight: '900', color: '#FFFFFF' },
  note: { fontSize: 10, textAlign: 'center', marginTop: 14, lineHeight: 15 },
});
