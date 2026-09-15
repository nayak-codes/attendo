import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../theme/colors';
import HeaderBar from '../components/HeaderBar';
import { useAuth } from '../context/AuthContext';
import { subscribeStudents } from '../firebase/adminService';

export default function AttendanceScreen({ sessionInfo, onNavigate }) {
  const { logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeStudents(realStudents => {
      const allStudents = realStudents || [];
      const targetSection = (sessionInfo.section || 'A').toUpperCase();
      const classStudents = allStudents.filter(s =>
        (s.section || 'A').toUpperCase() === targetSection
      );
      setStudents(classStudents);
      setAttendance(prev => {
        const init = { ...prev };
        classStudents.forEach(s => { if (!init[s.id]) init[s.id] = 'present'; });
        return init;
      });
      setLoading(false);
    });
    return () => unsub();
  }, [sessionInfo.section]);

  const toggleStudent = id => setAttendance(prev => ({
    ...prev,
    [id]: prev[id] === 'present' ? 'absent' : 'present',
  }));

  const markAllPresent = () => {
    const all = {};
    students.forEach(s => { all[s.id] = 'present'; });
    setAttendance(all);
  };

  const markAllAbsent = () => {
    const all = {};
    students.forEach(s => { all[s.id] = 'absent'; });
    setAttendance(all);
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount  = Object.values(attendance).filter(v => v === 'absent').length;
  const totalStudents = students.length;
  const presentPct = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNo || s.collegeId || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const handlePreview = () => onNavigate('AttendancePreview', {
    sessionInfo, attendance, students, presentCount, absentCount,
  });

  const pctColor = presentPct >= 90 ? COLORS.present : presentPct >= 70 ? COLORS.warning : COLORS.absent;

  // ── Table row renderer ──
  const renderRow = ({ item, index }) => {
    const isPresent = attendance[item.id] === 'present';
    const rollNo = item.rollNo || item.collegeId || '—';
    const initial = (item.name || '?').charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          index % 2 === 0 ? styles.rowEven : styles.rowOdd,
          !isPresent && styles.rowAbsent,
        ]}
        onPress={() => toggleStudent(item.id)}
        activeOpacity={0.75}
      >
        {/* Sl.No */}
        <View style={styles.colSl}>
          <Text style={[styles.slText, { color: COLORS.textMuted }]}>{index + 1}</Text>
        </View>

        {/* Avatar initial */}
        <View style={[styles.avatarCircle, {
          backgroundColor: isPresent ? '#E0F2FE' : '#FEE2E2',
        }]}>
          <Text style={[styles.avatarText, { color: isPresent ? '#0284C7' : '#DC2626' }]}>
            {initial}
          </Text>
        </View>

        {/* Roll No + Name */}
        <View style={styles.colInfo}>
          <Text style={[styles.rollText, { color: COLORS.textPrimary }]} numberOfLines={1}>
            {rollNo.toUpperCase()}
          </Text>
          <Text style={[styles.nameText, { color: COLORS.textSecondary }]} numberOfLines={1}>
            {item.name || 'Student'}
          </Text>
        </View>

        {/* Status Toggle */}
        <View style={[
          styles.statusPill,
          isPresent
            ? { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }
            : { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
        ]}>
          <Text style={[
            styles.statusText,
            { color: isPresent ? '#065F46' : '#991B1B' },
          ]}>
            {isPresent ? '✓ P' : '✕ A'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        subtitle="Mark Attendance"
        onLogout={() => { logout(); onNavigate('Login'); }}
      />

      {/* Session Banner */}
      <View style={styles.sessionBanner}>
        <TouchableOpacity style={styles.backBtn} onPress={() => onNavigate('TeacherDashboard')}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.sessionSubject} numberOfLines={1}>
            📚 {sessionInfo.subject || 'Data Structures'}
          </Text>
          <Text style={styles.sessionMeta}>
            Sec {sessionInfo.section || 'A'} • {sessionInfo.session || 'Session 1'} • {sessionInfo.date}
          </Text>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.present }]}>{presentCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.present }]}>PRESENT</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.absent }]}>{absentCount}</Text>
          <Text style={[styles.statLabel, { color: COLORS.absent }]}>ABSENT</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.accentBlue }]}>{totalStudents}</Text>
          <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>TOTAL</Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: pctColor + '22', borderColor: pctColor + '66' }]}>
          <Text style={[styles.pctText, { color: pctColor }]}>{presentPct}%</Text>
        </View>
      </View>

      {/* Search + Bulk Controls */}
      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or roll..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.bulkGreen} onPress={markAllPresent}>
          <Text style={styles.bulkGreenTxt}>✅ All P</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkRed} onPress={markAllAbsent}>
          <Text style={styles.bulkRedTxt}>❌ All A</Text>
        </TouchableOpacity>
      </View>

      {/* ── TABLE HEADER ── */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thSl, { color: COLORS.textMuted }]}>#</Text>
        <View style={styles.thAvatarGap} />
        <Text style={[styles.thInfo, { color: COLORS.textMuted }]}>ROLL NO / NAME</Text>
        <Text style={[styles.thStatus, { color: COLORS.textMuted }]}>STATUS</Text>
      </View>

      {/* ── TABLE BODY ── */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accentBlue} />
          <Text style={{ color: COLORS.textMuted, marginTop: 8, fontSize: 12 }}>Loading students...</Text>
        </View>
      ) : filteredStudents.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 32 }}>📭</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, marginTop: 8, fontWeight: '600' }}>
            No students found for Sec {sessionInfo.section || 'A'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
        />
      )}

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryGreen}>
            <Text style={{ color: COLORS.present, fontSize: 12, fontWeight: '800' }}>✅ {presentCount} Present</Text>
          </View>
          <View style={styles.summaryRed}>
            <Text style={{ color: COLORS.absent, fontSize: 12, fontWeight: '800' }}>❌ {absentCount} Absent</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.previewBtn} onPress={handlePreview} activeOpacity={0.8}>
          <Text style={styles.previewBtnText}>👁️ Preview & Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Session Banner
  sessionBanner: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, backgroundColor: '#F1F5F9',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  backArrow: { fontSize: 14, color: '#64748B' },
  backText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  sessionSubject: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  sessionMeta: { fontSize: 10, color: '#64748B', marginTop: 1 },

  // Stats
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '800', marginTop: 1, letterSpacing: 0.3 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0' },
  pctBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, marginLeft: 8, borderWidth: 1,
  },
  pctText: { fontSize: 15, fontWeight: '900' },

  // Controls
  controlsRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 6, alignItems: 'center',
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, gap: 6,
  },
  searchIcon: { fontSize: 12 },
  searchInput: { flex: 1, color: '#1E293B', fontSize: 12, paddingVertical: 8 },
  bulkGreen: {
    backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  bulkGreenTxt: { color: '#065F46', fontSize: 11, fontWeight: '800' },
  bulkRed: {
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
  },
  bulkRedTxt: { color: '#991B1B', fontSize: 11, fontWeight: '800' },

  // Table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  thSl: { width: 28, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thAvatarGap: { width: 38 },
  thInfo: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  thStatus: { width: 56, fontSize: 10, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },

  listContainer: { paddingBottom: 100 },
  rowSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 12 },

  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd: { backgroundColor: '#FAFBFC' },
  rowAbsent: { backgroundColor: '#FFF5F5' },

  colSl: { width: 24, alignItems: 'center' },
  slText: { fontSize: 11, fontWeight: '700' },

  avatarCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900' },

  colInfo: { flex: 1 },
  rollText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  nameText: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  statusPill: {
    width: 52, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '900' },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 8,
  },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryGreen: {
    backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  summaryRed: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  previewBtn: {
    backgroundColor: COLORS.accentBlue,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14,
    elevation: 3,
  },
  previewBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
