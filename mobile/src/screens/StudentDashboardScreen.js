import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { COLORS } from '../theme/colors';
import HeaderBar from '../components/HeaderBar';
import CalendarView from '../components/CalendarView';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { useTheme } from '../context/ThemeContext';

export default function StudentDashboardScreen({ onNavigate }) {
  const { user, logout } = useAuth();
  const { colors, themeMode, toggleTheme } = useTheme();
  const {
    notifications,
    attendanceRecords,
    getStudentAttendance,
    getStudentCalendar,
    getStudentSessions,
    markNotificationRead,
    loading,
  } = useAttendance();

  const [activeBottomTab, setActiveBottomTab] = useState('home');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  // Instagram-style profile switcher
  const SELF_PROFILE = {
    id: 'self',
    name: user?.name || 'Me',
    rollNo: user?.rollNo || user?.collegeId || '',
    dept: user?.department || 'CSE',
    year: user?.year || '3rd Year',
    section: user?.section || 'A',
  };
  const [linkedProfiles, setLinkedProfiles] = useState([SELF_PROFILE]);
  const [activeProfileId, setActiveProfileId] = useState('self');

  const handleAddProfile = (profile) => {
    setLinkedProfiles(prev => [...prev, profile]);
  };
  const handleRemoveProfile = (profileId) => {
    setLinkedProfiles(prev => prev.filter(p => p.id !== profileId));
    if (activeProfileId === profileId) setActiveProfileId('self');
  };
  const handleSwitchProfile = (profileId) => {
    setActiveProfileId(profileId);
  };

  // Effective roll number: if viewing a friend, use their rollNo
  const viewingProfile = linkedProfiles.find(p => p.id === activeProfileId);
  const effectiveRollNo = activeProfileId === 'self' ? (user?.rollNo || user?.collegeId || '') : (viewingProfile?.rollNo || '');

  const rollNo = effectiveRollNo;

  // Real-time Firestore data
  const subjectData = getStudentAttendance(rollNo);
  const calendarData = getStudentCalendar(rollNo);
  const recentSessions = getStudentSessions(rollNo);
  const unreadNotifs = notifications.filter(n => !n.read);

  // Overall stats
  const subjects = Object.entries(subjectData);
  const totalClasses = subjects.reduce((a, [, v]) => a + v.total, 0);
  const totalAttended = subjects.reduce((a, [, v]) => a + v.attended, 0);
  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  const getStatusInfo = (pct) => {
    if (pct >= 85) return { label: 'Excellent', color: COLORS.present, bg: COLORS.presentBg };
    if (pct >= 75) return { label: 'Good', color: COLORS.accentBlue, bg: COLORS.accentBlueGlow };
    if (pct >= 65) return { label: 'Low', color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.15)' };
    return { label: 'Critical', color: COLORS.absent, bg: COLORS.absentBg };
  };

  const statusInfo = totalClasses > 0 ? getStatusInfo(overallPct) : { label: 'No Data', color: COLORS.textMuted, bg: COLORS.bgGlass };

  const handleMonthChange = (delta) => {
    let newMonth = calMonth + delta;
    let newYear = calYear;
    if (newMonth > 11) { newMonth = 0; newYear++; }
    if (newMonth < 0) { newMonth = 11; newYear--; }
    setCalMonth(newMonth);
    setCalYear(newYear);
  };

  // Timetable Mock Schedule
  const TIMETABLE = [
    { day: 'Monday', classes: [
      { time: '09:00 AM - 10:00 AM', subject: 'Data Structures', room: 'Lab 3', teacher: 'Dr. Ramesh Kumar' },
      { time: '10:00 AM - 11:00 AM', subject: 'DBMS', room: 'LH 102', teacher: 'Prof. Anitha Rao' },
      { time: '11:15 AM - 12:15 PM', subject: 'Operating Systems', room: 'LH 102', teacher: 'Dr. Suresh' },
      { time: '02:00 PM - 04:00 PM', subject: 'DS Practical Lab', room: 'CS Lab 1', teacher: 'Dr. Ramesh Kumar' },
    ]},
    { day: 'Tuesday', classes: [
      { time: '09:00 AM - 10:00 AM', subject: 'Computer Networks', room: 'LH 104', teacher: 'Prof. Vikram' },
      { time: '10:00 AM - 11:00 AM', subject: 'Software Engineering', room: 'LH 104', teacher: 'Dr. Kavita' },
      { time: '11:15 AM - 12:15 PM', subject: 'DBMS', room: 'LH 102', teacher: 'Prof. Anitha Rao' },
      { time: '02:00 PM - 03:00 PM', subject: 'Aptitude & Reasoning', room: 'Auditorium', teacher: 'Placement Cell' },
    ]},
    { day: 'Wednesday', classes: [
      { time: '09:00 AM - 10:00 AM', subject: 'Data Structures', room: 'LH 102', teacher: 'Dr. Ramesh Kumar' },
      { time: '10:00 AM - 11:00 AM', subject: 'Operating Systems', room: 'LH 102', teacher: 'Dr. Suresh' },
      { time: '11:15 AM - 12:15 PM', subject: 'Computer Networks', room: 'LH 104', teacher: 'Prof. Vikram' },
      { time: '02:00 PM - 04:00 PM', subject: 'DBMS Project Lab', room: 'CS Lab 2', teacher: 'Prof. Anitha Rao' },
    ]},
    { day: 'Thursday', classes: [
      { time: '09:00 AM - 10:00 AM', subject: 'Software Engineering', room: 'LH 104', teacher: 'Dr. Kavita' },
      { time: '10:00 AM - 11:00 AM', subject: 'DBMS', room: 'LH 102', teacher: 'Prof. Anitha Rao' },
      { time: '11:15 AM - 12:15 PM', subject: 'Data Structures', room: 'LH 102', teacher: 'Dr. Ramesh Kumar' },
      { time: '02:00 PM - 03:00 PM', subject: 'Library & Research', room: 'Central Library', teacher: 'Librarian' },
    ]},
    { day: 'Friday', classes: [
      { time: '09:00 AM - 10:00 AM', subject: 'Operating Systems', room: 'LH 102', teacher: 'Dr. Suresh' },
      { time: '10:00 AM - 11:00 AM', subject: 'Computer Networks', room: 'LH 104', teacher: 'Prof. Vikram' },
      { time: '11:15 AM - 12:15 PM', subject: 'Software Engineering', room: 'LH 104', teacher: 'Dr. Kavita' },
      { time: '02:00 PM - 04:00 PM', subject: 'Seminar & Presentation', room: 'Seminar Hall B', teacher: 'HOD CSE' },
    ]},
  ];

  const [selectedDay, setSelectedDay] = useState('Monday');
  const currentSchedule = TIMETABLE.find(t => t.day === selectedDay)?.classes || [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Selected date records
  const selectedDateRecords = (attendanceRecords || []).filter(rec => rec.date === selectedDate);

  // Month-level analysis data
  const monthRecords = (attendanceRecords || []).filter(rec => {
    if (!rec.date) return false;
    const parts = rec.date.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      return y === calYear && m === calMonth;
    }
    return false;
  });

  const monthTotal = monthRecords.length;
  const monthPresent = monthRecords.filter(r => r.status === 'present').length;
  const monthAbsent = monthRecords.filter(r => r.status === 'absent').length;
  const monthPct = monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0;

  const monthSubjectMap = {};
  monthRecords.forEach(rec => {
    if (!monthSubjectMap[rec.subject]) monthSubjectMap[rec.subject] = { total: 0, attended: 0 };
    monthSubjectMap[rec.subject].total += 1;
    if (rec.status === 'present') monthSubjectMap[rec.subject].attended += 1;
  });

  const monthAbsentClasses = monthRecords.filter(r => r.status === 'absent');

  // State for Time Horizon Filter: 'monthly' | 'last_week' | 'yesterday'
  const [studentAnalysisFilter, setStudentAnalysisFilter] = useState('monthly');

  // Datasets matching Image 4 format for different time filters
  const MONTHLY_TABLE_DATA = [
    { slNo: 1, code: 'AI', subject: 'Artificial Intelligence', held: 66, attended: 36, pct: '54.55%' },
    { slNo: 2, code: 'AI Lab', subject: 'AI Practical Lab', held: 13, attended: 5, pct: '38.46%' },
    { slNo: 3, code: 'CN', subject: 'Computer Networks', held: 69, attended: 36, pct: '52.17%' },
    { slNo: 4, code: 'CN Lab', subject: 'Computer Networks Lab', held: 20, attended: 16, pct: '80.00%' },
    { slNo: 5, code: 'DA', subject: 'Data Analytics', held: 66, attended: 39, pct: '59.09%' },
    { slNo: 6, code: 'DEVOPS', subject: 'DevOps Engineering', held: 65, attended: 40, pct: '61.54%' },
    { slNo: 7, code: 'DEVOPS LAB', subject: 'DevOps Practical Lab', held: 12, attended: 8, pct: '66.67%' },
    { slNo: 8, code: 'IPR', subject: 'Intellectual Property Rights', held: 20, attended: 12, pct: '60.00%' },
    { slNo: 9, code: 'NLP', subject: 'Natural Language Processing', held: 66, attended: 37, pct: '56.06%' },
    { slNo: 10, code: 'QAVR-I', subject: 'Quantitative Aptitude VR-I', held: 1, attended: 1, pct: '100.00%' },
    { slNo: 11, code: 'UIDF', subject: 'UI Design Fundamentals', held: 20, attended: 18, pct: '90.00%' },
  ];

  const LAST_WEEK_TABLE_DATA = [
    { slNo: 1, code: 'AI', subject: 'Artificial Intelligence', held: 4, attended: 3, pct: '75.00%' },
    { slNo: 2, code: 'CN', subject: 'Computer Networks', held: 5, attended: 4, pct: '80.00%' },
    { slNo: 3, code: 'DA', subject: 'Data Analytics', held: 4, attended: 3, pct: '75.00%' },
    { slNo: 4, code: 'DEVOPS', subject: 'DevOps Engineering', held: 5, attended: 4, pct: '80.00%' },
    { slNo: 5, code: 'NLP', subject: 'Natural Language Processing', held: 4, attended: 3, pct: '75.00%' },
    { slNo: 6, code: 'UIDF', subject: 'UI Design Fundamentals', held: 2, attended: 2, pct: '100.00%' },
  ];

  const YESTERDAY_TABLE_DATA = [
    { slNo: 1, code: 'AI', subject: 'Artificial Intelligence', held: 1, attended: 1, pct: '100.00%' },
    { slNo: 2, code: 'CN', subject: 'Computer Networks', held: 1, attended: 1, pct: '100.00%' },
    { slNo: 3, code: 'DEVOPS', subject: 'DevOps Engineering', held: 1, attended: 1, pct: '100.00%' },
    { slNo: 4, code: 'NLP', subject: 'Natural Language Processing', held: 1, attended: 0, pct: '0.00%' },
  ];

  const activeTableData = studentAnalysisFilter === 'last_week'
    ? LAST_WEEK_TABLE_DATA
    : studentAnalysisFilter === 'yesterday'
    ? YESTERDAY_TABLE_DATA
    : MONTHLY_TABLE_DATA;

  const totalAnalysisClasses = activeTableData.reduce((a, s) => a + s.held, 0);
  const totalAnalysisAttended = activeTableData.reduce((a, s) => a + s.attended, 0);
  const totalAnalysisMissed = totalAnalysisClasses - totalAnalysisAttended;
  const overallAnalysisPct = totalAnalysisClasses > 0 ? (totalAnalysisAttended / totalAnalysisClasses) * 100 : 0;
  const overallAnalysisPctFormatted = overallAnalysisPct.toFixed(2);

  const safeBunkMargin = Math.max(0, Math.floor((totalAnalysisAttended - 0.75 * totalAnalysisClasses) / 0.75));
  const classesNeededTo75 = Math.max(0, Math.ceil((0.75 * totalAnalysisClasses - totalAnalysisAttended) / 0.25));

  // Dynamic Academic Attendance Sheet for Calendar selected date
  const calTableData = selectedDateRecords.length > 0
    ? Object.entries(
        selectedDateRecords.reduce((acc, rec) => {
          const s = rec.subject || 'Subject';
          if (!acc[s]) acc[s] = { total: 0, attended: 0 };
          acc[s].total += 1;
          if (rec.status === 'present') acc[s].attended += 1;
          return acc;
        }, {})
      ).map(([subj, d], idx) => {
        const code = subj.split(' ').map(w => w[0]).join('').toUpperCase();
        return {
          slNo: idx + 1,
          code: code.length > 5 ? code.slice(0, 5) : code,
          subject: subj,
          held: d.total,
          attended: d.attended,
          pct: d.total > 0 ? ((d.attended / d.total) * 100).toFixed(2) + '%' : '0.00%'
        };
      })
    : [];

  const calTotalHeld = calTableData.reduce((a, s) => a + s.held, 0);
  const calTotalAttended = calTableData.reduce((a, s) => a + s.attended, 0);
  const calTotalPct = calTotalHeld > 0 ? (calTotalAttended / calTotalHeld) * 100 : 0;
  const calTotalPctFormatted = calTotalPct.toFixed(2);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <HeaderBar
        subtitle={`Student Portal (${user?.selectedCollegeCode || 'VJIT'})`}
        onLogout={() => { logout(); onNavigate('Login'); }}
        linkedProfiles={linkedProfiles}
        activeProfileId={activeProfileId}
        onSwitchProfile={handleSwitchProfile}
        onAddProfile={handleAddProfile}
        onRemoveProfile={handleRemoveProfile}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgPrimary }]} showsVerticalScrollIndicator={false}>

        {/* ══════ TAB 1: HOME ══════ */}
        {activeBottomTab === 'home' && (
          <>
            {/* Student Profile Overview Card */}
            <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <View style={styles.profileRow}>
                <View style={[styles.avatar, { borderColor: statusInfo.color }]}>
                  <Text style={styles.avatarText}>{(viewingProfile?.name || user?.name)?.charAt(0) || 'S'}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.studentName, { color: colors.textPrimary }]}>{viewingProfile?.name || user?.name || 'Student'}</Text>
                    {activeProfileId !== 'self' && (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#F59E0B' }}>FRIEND</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.studentRoll, { color: colors.textSecondary }]}>📌 Roll No: {rollNo || '—'}</Text>
                  <Text style={[styles.studentDept, { color: colors.textMuted }]}>
                    {viewingProfile?.dept || user?.department || 'CSE'} • {viewingProfile?.year || user?.year || '3rd Year'} • Sec {viewingProfile?.section || user?.section || 'A'}
                  </Text>
                </View>
                {unreadNotifs.length > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifIcon}>🔔</Text>
                    <View style={styles.notifCount}>
                      <Text style={styles.notifCountText}>{unreadNotifs.length}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Attendance Ring & Metrics */}
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={colors.accentBlue} />
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading attendance data...</Text>
                </View>
              ) : totalClasses === 0 ? (
                <View style={styles.noDataWrap}>
                  <Text style={styles.noDataIcon}>📋</Text>
                  <Text style={[styles.noDataTitle, { color: colors.textPrimary }]}>No Attendance Yet</Text>
                  <Text style={[styles.noDataSub, { color: colors.textMuted }]}>Attendance will update live when marked by teacher.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.metricSection}>
                    <View style={styles.metricCircleWrap}>
                      <View style={[styles.pctRing, { borderColor: statusInfo.color }]}>
                        <Text style={[styles.pctValue, { color: statusInfo.color }]}>{overallPct}%</Text>
                        <Text style={[styles.pctLabel, { color: colors.textMuted }]}>Overall</Text>
                      </View>
                    </View>
                    <View style={styles.metricGrid}>
                      <View style={[styles.metricBox, { borderColor: colors.presentBorder, backgroundColor: colors.presentBg }]}>
                        <Text style={[styles.metricNum, { color: colors.present }]}>{totalAttended}</Text>
                        <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Attended</Text>
                      </View>
                      <View style={[styles.metricBox, { borderColor: colors.absentBorder, backgroundColor: colors.absentBg }]}>
                        <Text style={[styles.metricNum, { color: colors.absent }]}>{totalClasses - totalAttended}</Text>
                        <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Missed</Text>
                      </View>
                      <View style={[styles.metricBox, { borderColor: colors.borderSubtle }]}>
                        <Text style={[styles.metricNum, { color: colors.accentBlue }]}>{totalClasses}</Text>
                        <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Total</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg, borderColor: statusInfo.color + '50' }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {overallPct >= 85 ? '🌟' : overallPct >= 75 ? '✅' : '⚠️'} {statusInfo.label} Attendance Status
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Unread Alerts */}
            {unreadNotifs.slice(0, 2).map(notif => (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}
                onPress={() => markNotificationRead(notif.id)}
              >
                <Text style={styles.notifCardIcon}>🔔</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifCardTitle, { color: colors.textPrimary }]}>Absent Notification</Text>
                  <Text style={[styles.notifCardMsg, { color: colors.textMuted }]}>{notif.message}</Text>
                </View>
                <Text style={[styles.notifDismiss, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            ))}

            {/* ── QUICK NAVIGATION BUTTONS ── */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>⚡ Quick Actions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { icon: '📊', label: 'My Analysis', tab: 'analysis', bg: '#EBF4FF', color: '#3B82F6' },
                { icon: '📅', label: 'Calendar', tab: 'calendar', bg: '#F0FDF4', color: '#22C55E' },
                { icon: '🗓️', label: 'Timetable', tab: 'timetable', bg: '#FFF7ED', color: '#F97316' },
                { icon: '👤', label: 'My Profile', tab: 'profile', bg: '#FAF5FF', color: '#A855F7' },
              ].map(btn => (
                <TouchableOpacity
                  key={btn.tab}
                  onPress={() => setActiveBottomTab(btn.tab)}
                  style={{
                    width: '47%',
                    backgroundColor: btn.bg,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    borderWidth: 1,
                    borderColor: btn.color + '30',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 24 }}>{btn.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: btn.color }}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── EXAM ALERTS & CAMPUS NOTICES ── */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>📢 Campus Notices & Alerts</Text>
            <View style={{ gap: 10 }}>
              {[
                {
                  icon: '🔴',
                  tag: 'URGENT',
                  tagColor: '#EF4444',
                  tagBg: '#FEE2E2',
                  title: 'Mid-Term Exam Schedule Released',
                  desc: 'Semester 6 Mid-Term exams start from 20th Sep. Check full schedule on college portal.',
                  time: 'Today, 9:00 AM',
                },
                {
                  icon: '🟡',
                  tag: 'ALERT',
                  tagColor: '#F59E0B',
                  tagBg: '#FEF3C7',
                  title: 'Attendance Shortage Warning',
                  desc: 'Students below 75% in any subject must submit condonation request to HOD by 15th Sep.',
                  time: 'Yesterday',
                },
                {
                  icon: '🔵',
                  tag: 'INFO',
                  tagColor: '#3B82F6',
                  tagBg: '#EBF4FF',
                  title: 'Library Books Return Deadline',
                  desc: 'All issued library books must be returned by 25th Sep to avoid fine.',
                  time: '2 days ago',
                },
                {
                  icon: '🟢',
                  tag: 'EVENT',
                  tagColor: '#22C55E',
                  tagBg: '#F0FDF4',
                  title: 'Tech Fest Registration Open',
                  desc: 'Annual Tech Fest registrations are now open. Last date: 18th Sep. Register at the CSE Dept.',
                  time: '3 days ago',
                },
              ].map((notice, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: colors.bgCard,
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 16 }}>{notice.icon}</Text>
                    <View style={{ backgroundColor: notice.tagBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: notice.tagColor }}>{notice.tag}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>{notice.title}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 }}>{notice.desc}</Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted }}>🕐 {notice.time}</Text>
                </View>
              ))}
            </View>

            {/* ── LEAVE APPLICATION SYSTEM ── */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>📝 Leave Application</Text>
            <View
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 18,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                gap: 12,
              }}
            >
              {/* Leave Status Cards */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B40' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B' }}>2</Text>
                  <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '700' }}>Pending</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#22C55E40' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#22C55E' }}>5</Text>
                  <Text style={{ fontSize: 10, color: '#14532D', fontWeight: '700' }}>Approved</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EF444440' }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#EF4444' }}>1</Text>
                  <Text style={{ fontSize: 10, color: '#7F1D1D', fontWeight: '700' }}>Rejected</Text>
                </View>
              </View>

              {/* Recent Leave Requests */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>Recent Requests</Text>
              {[
                { date: '2026-09-10', reason: 'Medical – Fever & Cold', status: 'Approved', color: '#22C55E', bg: '#F0FDF4' },
                { date: '2026-09-08', reason: 'Family Emergency', status: 'Pending', color: '#F59E0B', bg: '#FEF3C7' },
                { date: '2026-09-05', reason: 'Personal Work', status: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
              ].map((req, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < 2 ? 1 : 0, borderColor: colors.borderSubtle }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary }}>{req.reason}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted }}>🗓️ {req.date}</Text>
                  </View>
                  <View style={{ backgroundColor: req.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: req.color }}>{req.status}</Text>
                  </View>
                </View>
              ))}

              {/* Apply New Leave Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: colors.accentBlue,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  marginTop: 4,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFFFFF' }}>✏️ Apply New Leave</Text>
              </TouchableOpacity>
            </View>

            {/* ── CONTACT MENTOR / HOD ── */}
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>📞 Contact Faculty</Text>
            <View style={{ gap: 10 }}>
              {[
                { role: 'Class Mentor', name: 'Prof. Anitha Rao', dept: 'CSE Dept', phone: '+91 98765 43210', emoji: '👩‍🏫', color: '#3B82F6', bg: '#EBF4FF' },
                { role: 'HOD – CSE', name: 'Dr. Ramesh Kumar', dept: 'Head of CSE Dept', phone: '+91 91234 56789', emoji: '👨‍💼', color: '#A855F7', bg: '#FAF5FF' },
              ].map((contact, i) => (
                <View key={i} style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.borderSubtle, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: contact.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: contact.color + '40' }}>
                    <Text style={{ fontSize: 22 }}>{contact.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: contact.color }}>{contact.role}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textPrimary }}>{contact.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>{contact.dept}</Text>
                  </View>
                  <View style={{ backgroundColor: contact.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: contact.color + '30' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: contact.color }}>📞 Call</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}


        {/* ══════ TAB 2: STUDENT ATTENDANCE ANALYSIS DASHBOARD ══════ */}
        {activeBottomTab === 'analysis' && (
          <View style={{ gap: 14 }}>
            {/* Visual Header Card with Ring Gauge & Quick Stat Badges */}
            <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, marginBottom: 0, padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* Circular Gauge Ring */}
                <View style={[
                  styles.pctRing,
                  {
                    width: 86,
                    height: 86,
                    borderRadius: 43,
                    borderWidth: 6,
                    borderColor: overallAnalysisPct >= 75 ? colors.present : colors.absent,
                    backgroundColor: colors.bgGlass,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }
                ]}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: overallAnalysisPct >= 75 ? colors.present : colors.absent }}>
                    {overallAnalysisPctFormatted}%
                  </Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>Overall</Text>
                </View>

                {/* Right Stat Details & Target Badges */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>
                    📊 Attendance Dashboard
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Semester 6 • {user?.department || 'CSE'}
                  </Text>

                  {/* Target Status Badges */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    <View style={[
                      styles.pctBadge,
                      { backgroundColor: overallAnalysisPct >= 75 ? colors.presentBg : colors.absentBg, paddingHorizontal: 8, paddingVertical: 3 }
                    ]}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: overallAnalysisPct >= 75 ? colors.present : colors.absent }}>
                        {overallAnalysisPct >= 75 ? '🎯 Eligible for Exams' : '⚠️ Below 75% Target'}
                      </Text>
                    </View>

                    <View style={[
                      styles.pctBadge,
                      { backgroundColor: colors.accentBlueGlow, paddingHorizontal: 8, paddingVertical: 3 }
                    ]}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentBlue }}>
                        {overallAnalysisPct >= 75 ? `🎉 Margin: +${safeBunkMargin} Bunks` : `🚨 Need: ${classesNeededTo75} Classes`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* KPI Summary Metrics Grid */}
              <View style={[styles.metricGrid, { marginTop: 14 }]}>
                <View style={[styles.metricBox, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.metricNum, { color: colors.textPrimary }]}>{totalAnalysisClasses}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Total Held</Text>
                </View>

                <View style={[styles.metricBox, { backgroundColor: colors.presentBg, borderColor: colors.presentBorder }]}>
                  <Text style={[styles.metricNum, { color: colors.present }]}>{totalAnalysisAttended}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Attended</Text>
                </View>

                <View style={[styles.metricBox, { backgroundColor: colors.absentBg, borderColor: colors.absentBorder }]}>
                  <Text style={[styles.metricNum, { color: colors.absent }]}>{totalAnalysisMissed}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Missed</Text>
                </View>

                <View style={[styles.metricBox, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue + '40' }]}>
                  <Text style={[styles.metricNum, { color: colors.accentBlue }]}>{activeTableData.length}</Text>
                  <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Subjects</Text>
                </View>
              </View>
            </View>

            {/* Time Horizon Filter Buttons (Requested: Monthly, Last Week, Yesterday) */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              {[
                { id: 'monthly', label: `📅 Monthly` },
                { id: 'last_week', label: `🗓️ Last Week` },
                { id: 'yesterday', label: `⏱️ Yesterday` },
              ].map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.dayPill,
                    { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, flex: 1, paddingVertical: 10, alignItems: 'center' },
                    studentAnalysisFilter === f.id && { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue }
                  ]}
                  onPress={() => setStudentAnalysisFilter(f.id)}
                >
                  <Text style={[
                    styles.dayPillText,
                    { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
                    studentAnalysisFilter === f.id && { color: '#FFFFFF', fontWeight: '900' }
                  ]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Academic Attendance Table (Matching Image 4 Format) */}
            <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, padding: 14, marginBottom: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                  📋 Academic Attendance Sheet
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentBlue }}>
                  {studentAnalysisFilter === 'last_week' ? 'Last Week Report' : studentAnalysisFilter === 'yesterday' ? 'Yesterday Report' : 'Monthly Statement'}
                </Text>
              </View>

              {/* Table Header Row */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: colors.bgGlass,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                marginBottom: 6
              }}>
                <Text style={{ width: 34, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Sl.No</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.textPrimary, paddingLeft: 6 }}>Subject</Text>
                <Text style={{ width: 44, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Held</Text>
                <Text style={{ width: 54, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Attended</Text>
                <Text style={{ width: 56, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' }}>%</Text>
              </View>

              {/* Table Data Rows */}
              {activeTableData.map((row) => {
                const pctNum = parseFloat(row.pct);
                const isSafe = pctNum >= 75;
                const isWarn = pctNum >= 60 && pctNum < 75;

                return (
                  <View key={row.slNo} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSubtle
                  }}>
                    {/* Sl.No */}
                    <Text style={{ width: 34, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>
                      {row.slNo}
                    </Text>

                    {/* Subject */}
                    <View style={{ flex: 1, paddingLeft: 6, paddingRight: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{row.code}</Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }} numberOfLines={1}>{row.subject}</Text>
                    </View>

                    {/* Held */}
                    <Text style={{ width: 44, fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
                      {row.held}
                    </Text>

                    {/* Attended */}
                    <Text style={{ width: 54, fontSize: 12, fontWeight: '800', color: colors.present, textAlign: 'center' }}>
                      {row.attended}
                    </Text>

                    {/* % Percentage */}
                    <View style={{ width: 56, alignItems: 'flex-end' }}>
                      <View style={[
                        styles.pctBadge,
                        {
                          backgroundColor: isSafe ? colors.presentBg : isWarn ? 'rgba(245, 158, 11, 0.15)' : colors.absentBg,
                          paddingHorizontal: 6,
                          paddingVertical: 2
                        }
                      ]}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: isSafe ? colors.present : isWarn ? colors.warning : colors.absent
                        }}>
                          {row.pct}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Bottom TOTAL Summary Row (Exact Image 4 format) */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.bgGlass,
                borderRadius: 10,
                paddingVertical: 12,
                paddingHorizontal: 8,
                marginTop: 10,
                borderWidth: 1.5,
                borderColor: colors.accentBlue + '40'
              }}>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>
                  TOTAL SUMMARY
                </Text>
                <Text style={{ width: 50, fontSize: 12, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' }}>
                  {totalAnalysisClasses}
                </Text>
                <Text style={{ width: 54, fontSize: 12, fontWeight: '900', color: colors.present, textAlign: 'center' }}>
                  {totalAnalysisAttended}
                </Text>
                <View style={{ width: 62, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: overallAnalysisPct >= 75 ? colors.present : colors.absent }}>
                    {overallAnalysisPctFormatted}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ══════ TAB 2: CALENDAR ══════ */}
        {activeBottomTab === 'calendar' && (
          <View style={{ gap: 14 }}>
            {/* Calendar View */}
            <CalendarView
              calendarData={calendarData}
              year={calYear}
              month={calMonth}
              onMonthChange={handleMonthChange}
              selectedDate={selectedDate}
              onSelectDate={(dateStr) => setSelectedDate(dateStr)}
            />

            {/* Monthly Analysis Trigger Button */}
            <TouchableOpacity
              style={[styles.monthlyAnalysisBtn, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue + '50' }]}
              onPress={() => setShowMonthlyModal(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.monthlyAnalysisBtnTxt, { color: colors.accentBlue }]}>
                📊 View Detailed Monthly Analysis ({monthNames[calMonth]})
              </Text>
            </TouchableOpacity>

            {/* Selected Date Academic Attendance Sheet Table (Matching Image 1 / Image 4 format) */}
            <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, padding: 14, marginBottom: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>📋</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                    Academic Attendance Sheet
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentBlue }}>
                  {selectedDate === new Date().toISOString().split('T')[0] ? 'Today Report' : `Report for ${selectedDate}`}
                </Text>
              </View>

              {calTableData.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 }}>
                    No Classes Recorded
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
                    No class attendance marked for {selectedDate}.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Table Header Row */}
                  <View style={{
                    flexDirection: 'row',
                    backgroundColor: colors.bgGlass,
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: colors.borderSubtle,
                    marginBottom: 6
                  }}>
                    <Text style={{ width: 34, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Sl.No</Text>
                    <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.textPrimary, paddingLeft: 6 }}>Subject</Text>
                    <Text style={{ width: 44, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Held</Text>
                    <Text style={{ width: 54, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Attended</Text>
                    <Text style={{ width: 56, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' }}>%</Text>
                  </View>

                  {/* Table Data Rows */}
                  {calTableData.map((row) => {
                    const pctNum = parseFloat(row.pct);
                    const isSafe = pctNum >= 75;
                    const isWarn = pctNum >= 60 && pctNum < 75;

                    return (
                      <View key={row.slNo} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderSubtle
                      }}>
                        {/* Sl.No */}
                        <Text style={{ width: 34, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>
                          {row.slNo}
                        </Text>

                        {/* Subject */}
                        <View style={{ flex: 1, paddingLeft: 6, paddingRight: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{row.code}</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }} numberOfLines={1}>{row.subject}</Text>
                        </View>

                        {/* Held */}
                        <Text style={{ width: 44, fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
                          {row.held}
                        </Text>

                        {/* Attended */}
                        <Text style={{ width: 54, fontSize: 12, fontWeight: '800', color: colors.present, textAlign: 'center' }}>
                          {row.attended}
                        </Text>

                        {/* % Percentage */}
                        <View style={{ width: 56, alignItems: 'flex-end' }}>
                          <View style={[
                            styles.pctBadge,
                            {
                              backgroundColor: isSafe ? colors.presentBg : isWarn ? 'rgba(245, 158, 11, 0.15)' : colors.absentBg,
                              paddingHorizontal: 6,
                              paddingVertical: 2
                            }
                          ]}>
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '800',
                              color: isSafe ? colors.present : isWarn ? colors.warning : colors.absent
                            }}>
                              {row.pct}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* Bottom TOTAL Summary Row (Exact Image 1 / Image 4 format) */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.bgGlass,
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    marginTop: 10,
                    borderWidth: 1.5,
                    borderColor: colors.accentBlue + '40'
                  }}>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>
                      TOTAL SUMMARY
                    </Text>
                    <Text style={{ width: 50, fontSize: 12, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' }}>
                      {calTotalHeld}
                    </Text>
                    <Text style={{ width: 54, fontSize: 12, fontWeight: '900', color: colors.present, textAlign: 'center' }}>
                      {calTotalAttended}
                    </Text>
                    <View style={{ width: 62, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: calTotalPct >= 75 ? colors.present : colors.absent }}>
                        {calTotalPctFormatted}%
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* ══════ TAB 3: TIMETABLE ══════ */}
        {activeBottomTab === 'timetable' && (
          <View style={{ gap: 14 }}>
            <View style={[{ backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, borderRadius: 18, padding: 16, borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>📅 Class Timetable</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{user?.department || 'CSE'} • Section {user?.section || 'A'} (3rd Year)</Text>
                </View>
                <View style={[styles.pctBadge, { backgroundColor: colors.accentBlueGlow, paddingHorizontal: 10, paddingVertical: 4 }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentBlue }}>{selectedDay}</Text>
                </View>
              </View>
            </View>

            {/* Day Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {TIMETABLE.map(t => (
                  <TouchableOpacity
                    key={t.day}
                    style={[
                      styles.dayPill,
                      { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle },
                      selectedDay === t.day && { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue }
                    ]}
                    onPress={() => setSelectedDay(t.day)}
                  >
                    <Text style={[
                      styles.dayPillText,
                      { color: colors.textSecondary },
                      selectedDay === t.day && { color: '#FFFFFF', fontWeight: '800' }
                    ]}>
                      {t.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Class Cards for Selected Day */}
            {currentSchedule.map((cls, index) => (
              <View key={index} style={[styles.ttClassCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
                <View style={[styles.ttTimeCol, { backgroundColor: colors.bgGlass, borderRadius: 12, padding: 10, borderRightWidth: 0, justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 14, marginBottom: 2 }}>⏰</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accentBlue }}>{cls.time}</Text>
                </View>

                <View style={styles.ttMainCol}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>{cls.subject}</Text>
                    <View style={[styles.pctBadge, { backgroundColor: colors.bgGlass, paddingHorizontal: 6, paddingVertical: 2 }]}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>Period {index + 1}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>👨‍🏫 {cls.teacher}</Text>
                  <View style={{ backgroundColor: colors.bgGlass, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700' }}>📍 Room: {cls.room}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══════ TAB 4: PROFESSIONAL STUDENT PROFILE ══════ */}
        {activeBottomTab === 'profile' && (
          <View style={{ gap: 14 }}>
            {/* Hero Profile Card */}
            <View style={[styles.profileBigCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <View style={styles.avatarWrapper}>
                <View style={[styles.bigAvatar, { backgroundColor: colors.accentBlue }]}>
                  <Text style={styles.bigAvatarText}>{user?.name?.charAt(0) || 'A'}</Text>
                </View>
                <View style={[styles.cameraBadge, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                  <Text style={{ fontSize: 12 }}>📷</Text>
                </View>
                <View style={[styles.onlineDot, { backgroundColor: colors.present }]} />
              </View>

              <Text style={[styles.bigName, { color: colors.textPrimary }]}>{user?.name || 'Arjun Reddy'}</Text>
              <Text style={[styles.bigRoll, { color: colors.accentBlue }]}>Roll No: {rollNo} • CSE 3rd Year</Text>

              {/* Verified & Server Pill */}
              <View style={styles.badgeRow}>
                <View style={[styles.collegeBadge, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue + '40' }]}>
                  <Text style={[styles.collegeBadgeText, { color: colors.accentBlue }]}>🏛️ {user?.selectedCollegeCode || 'VJIT'} Student Node</Text>
                </View>
                <View style={[styles.collegeBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                  <Text style={[styles.collegeBadgeText, { color: colors.present }]}>🎓 Enrolled</Text>
                </View>
              </View>

              {/* Quick Stat KPI Strip for Student */}
              <View style={[styles.profileStatStrip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, { color: colors.present }]}>89.2%</Text>
                  <Text style={[styles.profileStatLbl, { color: colors.textMuted }]}>Attendance</Text>
                </View>
                <View style={[styles.profileStatDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, { color: colors.accentBlue }]}>#4</Text>
                  <Text style={[styles.profileStatLbl, { color: colors.textMuted }]}>Class Rank</Text>
                </View>
                <View style={[styles.profileStatDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, { color: colors.accentPurple }]}>5</Text>
                  <Text style={[styles.profileStatLbl, { color: colors.textMuted }]}>Subjects</Text>
                </View>
              </View>
            </View>

            {/* Academic Information */}
            <View style={[styles.infoBox, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.infoBoxTitle, { color: colors.textPrimary }]}>📋 Academic Information</Text>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Department</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user?.department || 'Computer Science & Engineering'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Academic Year</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user?.year || '3rd Year (Semester 6)'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Section</Text>
                <Text style={[styles.infoVal, { color: colors.accentBlue, fontWeight: '700' }]}>Section {user?.section || 'A'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Student Email</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{rollNo.toLowerCase()}@{(user?.selectedCollegeCode || 'vjit').toLowerCase()}.edu.in</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Parent Contact</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>+91 98765 12345</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Exam Eligibility</Text>
                <Text style={[styles.infoVal, { color: colors.present }]}>🟢 Eligible (&gt; 75% Target)</Text>
              </View>
            </View>

            {/* App Preferences & Theme */}
            <View style={[styles.infoBox, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.infoBoxTitle, { color: colors.textPrimary }]}>⚙️ App Preferences & Theme</Text>

              {/* Theme Switch Button */}
              <TouchableOpacity
                style={[styles.settingRow, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>{themeMode === 'dark' ? '☀️' : '🌙'}</Text>
                  <View>
                    <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Theme Appearance</Text>
                    <Text style={[styles.settingSub, { color: colors.textMuted }]}>Currently: {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
                  </View>
                </View>
                <View style={[styles.toggleBtnChip, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }]}>
                  <Text style={[styles.toggleBtnText, { color: colors.accentBlue }]}>Switch Mode →</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Logout Action */}
            <TouchableOpacity
              style={styles.logoutFullBtn}
              onPress={() => { logout(); onNavigate('Login'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutFullText}>🚪 Sign Out of Account</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        activeTab={activeBottomTab}
        onSelectTab={setActiveBottomTab}
        role="student"
      />

      {/* ══════ MONTHLY ANALYSIS MODAL ══════ */}
      <Modal
        visible={showMonthlyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMonthlyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  📈 Monthly Analysis Report
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {monthNames[calMonth]} {calYear} Summary
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.bgGlass }]}
                onPress={() => setShowMonthlyModal(false)}
              >
                <Text style={[styles.modalCloseTxt, { color: colors.textPrimary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingVertical: 12 }}>
              {/* Card 1: Key Metrics */}
              <View style={[styles.modalStatGrid, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatNum, { color: colors.accentBlue }]}>{monthTotal}</Text>
                  <Text style={[styles.modalStatLbl, { color: colors.textMuted }]}>Total Classes</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatNum, { color: colors.present }]}>{monthPresent}</Text>
                  <Text style={[styles.modalStatLbl, { color: colors.textMuted }]}>Present</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatNum, { color: colors.absent }]}>{monthAbsent}</Text>
                  <Text style={[styles.modalStatLbl, { color: colors.textMuted }]}>Absent</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={[styles.modalStatNum, { color: monthPct >= 75 ? colors.present : colors.absent }]}>{monthPct}%</Text>
                  <Text style={[styles.modalStatLbl, { color: colors.textMuted }]}>Monthly %</Text>
                </View>
              </View>

              {/* Card 2: Subject-wise Monthly Academic Attendance Sheet */}
              <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, padding: 14, marginBottom: 0 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                    📋 Academic Attendance Sheet
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentBlue }}>
                    {monthNames[calMonth]} {calYear}
                  </Text>
                </View>

                {/* Table Header Row */}
                <View style={{
                  flexDirection: 'row',
                  backgroundColor: colors.bgGlass,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                  marginBottom: 6
                }}>
                  <Text style={{ width: 34, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Sl.No</Text>
                  <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.textPrimary, paddingLeft: 6 }}>Subject</Text>
                  <Text style={{ width: 44, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Held</Text>
                  <Text style={{ width: 54, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' }}>Attended</Text>
                  <Text style={{ width: 56, fontSize: 11, fontWeight: '800', color: colors.textPrimary, textAlign: 'right' }}>%</Text>
                </View>

                {/* Table Data Rows */}
                {MONTHLY_TABLE_DATA.map((row) => {
                  const pctNum = parseFloat(row.pct);
                  const isSafe = pctNum >= 75;
                  const isWarn = pctNum >= 60 && pctNum < 75;

                  return (
                    <View key={row.slNo} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderSubtle
                    }}>
                      {/* Sl.No */}
                      <Text style={{ width: 34, fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>
                        {row.slNo}
                      </Text>

                      {/* Subject */}
                      <View style={{ flex: 1, paddingLeft: 6, paddingRight: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{row.code}</Text>
                        <Text style={{ fontSize: 10, color: colors.textMuted }} numberOfLines={1}>{row.subject}</Text>
                      </View>

                      {/* Held */}
                      <Text style={{ width: 44, fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
                        {row.held}
                      </Text>

                      {/* Attended */}
                      <Text style={{ width: 54, fontSize: 12, fontWeight: '800', color: colors.present, textAlign: 'center' }}>
                        {row.attended}
                      </Text>

                      {/* % Percentage */}
                      <View style={{ width: 56, alignItems: 'flex-end' }}>
                        <View style={[
                          styles.pctBadge,
                          {
                            backgroundColor: isSafe ? colors.presentBg : isWarn ? 'rgba(245, 158, 11, 0.15)' : colors.absentBg,
                            paddingHorizontal: 6,
                            paddingVertical: 2
                          }
                        ]}>
                          <Text style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: isSafe ? colors.present : isWarn ? colors.warning : colors.absent
                          }}>
                            {row.pct}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* Bottom TOTAL Summary Row (Exact Image 1 / Image 4 format) */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.bgGlass,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  marginTop: 10,
                  borderWidth: 1.5,
                  borderColor: colors.accentBlue + '40'
                }}>
                  <Text style={{ flex: 1, fontSize: 12, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>
                    TOTAL SUMMARY
                  </Text>
                  <Text style={{ width: 50, fontSize: 12, fontWeight: '900', color: colors.textPrimary, textAlign: 'center' }}>
                    {MONTHLY_TABLE_DATA.reduce((a, b) => a + b.held, 0)}
                  </Text>
                  <Text style={{ width: 54, fontSize: 12, fontWeight: '900', color: colors.present, textAlign: 'center' }}>
                    {MONTHLY_TABLE_DATA.reduce((a, b) => a + b.attended, 0)}
                  </Text>
                  <View style={{ width: 62, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: colors.present }}>
                      59.70%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 3: Absent Classes Log */}
              <View style={[styles.modalSectionCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.absent }]}>🚨 Missed / Absent Classes Log</Text>
                {monthAbsentClasses.length === 0 ? (
                  <View style={styles.modalSuccessBox}>
                    <Text style={{ fontSize: 24, marginBottom: 4 }}>🎉</Text>
                    <Text style={[styles.modalSuccessTxt, { color: colors.present }]}>Zero absences in {monthNames[calMonth]}! Great job!</Text>
                  </View>
                ) : (
                  monthAbsentClasses.map((abRec) => (
                    <View key={abRec.id} style={[styles.modalAbsentRow, { backgroundColor: colors.absentBg, borderColor: colors.absentBorder }]}>
                      <Text style={{ fontSize: 16 }}>❌</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modalAbsentSubj, { color: colors.absent }]}>{abRec.subject}</Text>
                        <Text style={[styles.modalAbsentMeta, { color: colors.textSecondary }]}>
                          🗓️ {abRec.date} • ⏰ {abRec.session || 'Session'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollContent: { padding: 16, paddingBottom: 20 },

  // Profile overview
  profileCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 3,
    backgroundColor: 'rgba(79,142,247,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  profileInfo: { flex: 1 },
  studentName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  studentRoll: { fontSize: 12, fontWeight: '700', color: COLORS.accentBlue, marginTop: 2 },
  studentDept: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  notifBadge: {
    position: 'relative', width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.absentBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.absentBorder,
  },
  notifIcon: { fontSize: 16 },
  notifCount: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: COLORS.absent, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifCountText: { fontSize: 9, fontWeight: '900', color: '#fff' },

  loadingWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { color: COLORS.textMuted, fontSize: 12 },
  noDataWrap: { alignItems: 'center', paddingVertical: 20 },
  noDataIcon: { fontSize: 32, marginBottom: 8 },
  noDataTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  noDataSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },

  metricSection: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.borderSubtle, marginBottom: 12,
  },
  metricCircleWrap: { alignItems: 'center' },
  pctRing: {
    width: 76, height: 76, borderRadius: 38, borderWidth: 5,
    backgroundColor: COLORS.bgSecondary, alignItems: 'center', justifyContent: 'center',
  },
  pctValue: { fontSize: 18, fontWeight: '900' },
  pctLabel: { fontSize: 9, color: COLORS.textMuted },
  metricGrid: { flex: 1, flexDirection: 'row', gap: 8 },
  metricBox: {
    flex: 1, backgroundColor: COLORS.bgSecondary, borderRadius: 12,
    padding: 10, alignItems: 'center', borderWidth: 1,
  },
  metricNum: { fontSize: 16, fontWeight: '800' },
  metricLbl: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  statusBadge: { borderRadius: 12, padding: 10, borderWidth: 1, alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '700' },

  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1A0A0A', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: COLORS.absentBorder,
  },
  notifCardIcon: { fontSize: 18 },
  notifCardTitle: { fontSize: 11, fontWeight: '800', color: COLORS.absent },
  notifCardMsg: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  notifDismiss: { fontSize: 12, color: COLORS.textMuted },

  sectionHeading: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 12, marginBottom: 10 },

  subjectCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderSubtle, marginBottom: 8,
  },
  subjectCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subjectName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  pctBadgeText: { fontSize: 12, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: COLORS.bgSecondary, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  subjectFooter: { fontSize: 11, color: COLORS.textMuted },

  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1.5, marginBottom: 8,
  },
  borderPresent: { borderColor: COLORS.presentBorder },
  borderAbsent: { borderColor: COLORS.absentBorder },
  recentIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentIcon: { fontSize: 16 },
  recentSubject: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  recentMeta: { fontSize: 10, color: COLORS.textMuted },
  recentTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagPresent: { backgroundColor: COLORS.presentBg },
  tagAbsent: { backgroundColor: COLORS.absentBg },
  tagText: { fontSize: 9, fontWeight: '800' },

  emptyCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  emptyIcon: { fontSize: 30, marginBottom: 6 },
  emptyText: { fontSize: 12, color: COLORS.textMuted },

  // Monthly analysis button
  monthlyAnalysisBtn: {
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  monthlyAnalysisBtnTxt: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Date details card
  dateDetailsCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  dateDetailsHeader: {
    marginBottom: 12,
  },
  dateDetailsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dateDetailsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyDateBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyDateTxt: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateClassSubject: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateClassMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  dateStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dateStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseTxt: {
    fontSize: 16,
    fontWeight: '700',
  },

  modalStatGrid: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalStatLbl: {
    fontSize: 10,
    marginTop: 2,
  },

  modalSectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalEmptyTxt: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalSubjectName: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubjectMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  modalSubjectPct: {
    fontSize: 15,
    fontWeight: '900',
  },

  modalSuccessBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalSuccessTxt: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalAbsentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  modalAbsentSubj: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalAbsentMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  // Timetable styles
  ttHeader: { marginBottom: 8 },
  ttTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  ttSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dayRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  dayPillActive: { backgroundColor: COLORS.accentBlue, borderColor: COLORS.accentBlue },
  dayPillText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  dayPillTextActive: { color: '#FFFFFF' },
  ttClassCard: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.borderSubtle, gap: 12, marginBottom: 10,
  },
  ttTimeCol: { width: 110, paddingRight: 10, borderRightWidth: 1, borderRightColor: COLORS.borderSubtle },
  ttTimeIcon: { fontSize: 16, marginBottom: 4 },
  ttTimeText: { fontSize: 11, fontWeight: '700', color: COLORS.accentBlue },
  ttMainCol: { flex: 1 },
  ttSubject: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  ttTeacher: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  ttRoomTag: { backgroundColor: COLORS.bgSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  ttRoomText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Profile Tab
  profileBigCard: {
    borderRadius: 22, padding: 24,
    alignItems: 'center', borderWidth: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  bigAvatar: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  bigAvatarText: { fontSize: 34, fontWeight: '900', color: '#FFF' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: -4,
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', top: 2, right: 2,
    width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#FFF',
  },
  bigName: { fontSize: 20, fontWeight: '800' },
  bigRoll: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  collegeBadge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  collegeBadgeText: { fontSize: 11, fontWeight: '800' },

  profileStatStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  profileStatLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  profileStatDivider: {
    width: 1,
    height: 24,
  },

  infoBox: {
    borderRadius: 18, padding: 18,
    borderWidth: 1,
  },
  infoBoxTitle: { fontSize: 14, fontWeight: '800', marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLbl: { fontSize: 12 },
  infoVal: { fontSize: 13, fontWeight: '700' },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 10,
    marginTop: 1,
  },
  toggleBtnChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },

  logoutFullBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6,
  },
  logoutFullText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
