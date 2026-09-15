import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme/colors';
import HeaderBar from '../components/HeaderBar';
import { useAttendance } from '../context/AttendanceContext';
import { useAuth } from '../context/AuthContext';

export default function AttendancePreviewScreen({ data, onNavigate }) {
  const { logout } = useAuth();
  const { submitAttendance, submitting: contextSubmitting } = useAttendance();
  const [localSubmitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitting = contextSubmitting || localSubmitting;

  const { sessionInfo, attendance, students, presentCount, absentCount } = data;
  const absentStudents = students.filter(s => attendance[s.id] === 'absent');
  const presentStudents = students.filter(s => attendance[s.id] === 'present');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const attendanceList = students.map(s => ({
        studentId: s.id,
        name: s.name,
        rollNo: s.rollNo,
        status: attendance[s.id],
      }));
      await submitAttendance(sessionInfo, attendanceList);
      setSubmitted(true);
      setTimeout(() => onNavigate('TeacherDashboard'), 2200);
    } catch (err) {
      console.error('Submit failed:', err);
      alert('Failed to submit. Check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Attendance Submitted!</Text>
          <Text style={styles.successDesc}>
            {presentCount} Present • {absentCount} Absent
          </Text>
          <Text style={styles.successSub}>
            Student profiles have been updated in real-time.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBar
        subtitle="Preview Attendance"
        onLogout={() => { logout(); onNavigate('Login'); }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.subjectTitle}>{sessionInfo.subject}</Text>
          <Text style={styles.sessionMeta}>
            Sec {sessionInfo.section} • {sessionInfo.session} • {sessionInfo.date}
          </Text>

          <View style={styles.statGrid}>
            <View style={[styles.statBox, { borderColor: COLORS.presentBorder, backgroundColor: COLORS.presentBg }]}>
              <Text style={[styles.statNum, { color: COLORS.present }]}>{presentCount}</Text>
              <Text style={styles.statLabel}>✅ Present</Text>
            </View>

            <View style={[styles.statBox, { borderColor: COLORS.absentBorder, backgroundColor: COLORS.absentBg }]}>
              <Text style={[styles.statNum, { color: COLORS.absent }]}>{absentCount}</Text>
              <Text style={styles.statLabel}>❌ Absent</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: COLORS.accentBlue }]}>
                {Math.round((presentCount / students.length) * 100)}%
              </Text>
              <Text style={styles.statLabel}>📊 Rate</Text>
            </View>
          </View>
        </View>

        {/* Absent list */}
        {absentStudents.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.absentSectionTitle}>❌ Absent Students ({absentCount})</Text>
            {absentStudents.map(s => (
              <View key={s.id} style={styles.absentRow}>
                <Text style={styles.rollText}>{s.rollNo}</Text>
                <Text style={styles.nameText}>{s.name}</Text>
                <View style={styles.absentBadge}>
                  <Text style={styles.absentBadgeText}>ABSENT</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Present list */}
        <View style={styles.sectionCard}>
          <Text style={styles.presentSectionTitle}>✅ Present Students ({presentCount})</Text>
          {presentStudents.map(s => (
            <View key={s.id} style={styles.row}>
              <Text style={styles.rollText}>{s.rollNo}</Text>
              <Text style={styles.nameText}>{s.name}</Text>
              <View style={styles.presentBadge}>
                <Text style={styles.presentBadgeText}>PRESENT</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onNavigate('Attendance', sessionInfo)}>
          <Text style={styles.editBtnText}>← Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>🚀 Final Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  summaryCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 16,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sessionMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14,
  },
  absentSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.absent,
    marginBottom: 12,
  },
  presentSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.present,
    marginBottom: 12,
  },
  absentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.absentBg,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgGlass,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  rollText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    width: 65,
  },
  nameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  absentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  absentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.absent,
  },
  presentBadge: {
    backgroundColor: COLORS.presentBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  presentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.present,
  },
  actionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bgGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
  },
  editBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: COLORS.accentBlue,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.presentBorder,
    width: '100%',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  successDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.present,
    marginBottom: 12,
  },
  successSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
