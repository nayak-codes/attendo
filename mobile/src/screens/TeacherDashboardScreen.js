import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput } from 'react-native';
import HeaderBar from '../components/HeaderBar';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { useTheme } from '../context/ThemeContext';
import { MOCK_SUBJECTS, MOCK_SESSIONS, MOCK_SECTIONS, MOCK_YEARS } from '../data/mockData';

const today = new Date().toISOString().split('T')[0];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Build dynamic weekly schedule for faculty based on assigned subjects & sections
function buildDynamicFacultyTimetable(assignedSubjects = [], assignedSections = []) {
  const subjs = assignedSubjects.length > 0 ? assignedSubjects : ['Operating Systems', 'Data Structures'];
  const secs = assignedSections.length > 0 ? assignedSections : ['A', 'B'];

  const slotsPool = [
    { time: '09:00 AM - 10:00 AM', room: 'LH 105' },
    { time: '11:15 AM - 12:15 PM', room: 'LH 106' },
    { time: '02:00 PM - 04:00 PM', room: 'CS Lab 2' }
  ];

  return WEEK_DAYS.map((dayName, dayIdx) => {
    const classCount = dayIdx % 2 === 0 ? 3 : 2;
    const classes = [];

    for (let c = 0; c < classCount; c++) {
      const slot = slotsPool[c];
      const subj = subjs[(dayIdx + c) % subjs.length];
      const secLetter = secs[(dayIdx + c) % secs.length];
      const fullSecName = String(secLetter).toUpperCase().startsWith('CSE')
        ? String(secLetter)
        : `CSE 3-${secLetter}`;

      let classStatus = 'scheduled';
      let statsText = 'Scheduled';
      if (c === 0) {
        classStatus = 'completed';
        statsText = '✓ Class Finished';
      } else if (c === 1) {
        classStatus = 'next';
        statsText = '⏱️ Next Session';
      }

      classes.push({
        time: slot.time,
        subject: c === 2 && !subj.toLowerCase().includes('lab') ? `${subj} Lab` : subj,
        rawSubject: subj,
        classSec: fullSecName,
        rawSec: secLetter,
        room: c === 2 ? `Lab ${c + 1}` : slot.room,
        status: classStatus,
        stats: statsText,
      });
    }

    return { day: dayName, classes };
  });
}

export default function TeacherDashboardScreen({ onNavigate }) {
  const { user, logout } = useAuth();
  const { sessions } = useAttendance();
  const { colors, themeMode, toggleTheme } = useTheme();

  // Derive assigned sections & subjects dynamically for logged in teacher
  const assignedSections = user?.assignedSections && user.assignedSections.length > 0
    ? user.assignedSections
    : user?.sections && user.sections.length > 0
    ? user.sections
    : user?.section
    ? (Array.isArray(user.section) 
        ? user.section 
        : String(user.section).replace(/CSE\s*\d*-?/gi, '').split(/[\s,]+/).filter(Boolean))
    : ['A', 'B'];

  const assignedSubjects = user?.assignedSubjects && user.assignedSubjects.length > 0
    ? user.assignedSubjects
    : user?.subject
    ? (Array.isArray(user.subject) ? user.subject : [user.subject])
    : ['Operating Systems', 'Data Structures'];

  const [activeBottomTab, setActiveBottomTab] = useState('home');

  // Form for Attendance tab
  const [form, setForm] = useState({
    department: user?.department || 'CSE',
    year: '3rd Year',
    section: assignedSections[0] || 'A',
    subject: assignedSubjects[0] || MOCK_SUBJECTS[0],
    session: MOCK_SESSIONS[0],
    date: today,
  });

  // States for Analysis tab
  const [analysisSubject, setAnalysisSubject] = useState(assignedSubjects[0] || 'Operating Systems');
  const [analysisSection, setAnalysisSection] = useState(assignedSections[0] || 'A');
  const [analysisFilter, setAnalysisFilter] = useState('all'); // 'all' | 'low' | 'safe'
  const [alertSentMap, setAlertSentMap] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  // Detect current day of week (Monday - Saturday)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentRealDay = dayNames[new Date().getDay()];
  const activeTodayName = currentRealDay === 'Sunday' ? 'Monday' : currentRealDay;

  const [selectedScheduleDay, setSelectedScheduleDay] = useState(activeTodayName);

  // Dynamic Weekly Schedule generated from assigned subjects & assigned sections
  const dynamicWeeklySchedule = buildDynamicFacultyTimetable(assignedSubjects, assignedSections);
  const [timetableData, setTimetableData] = useState(dynamicWeeklySchedule);

  // Editable Timetable State for Coordinator / Mentor Access
  const [showEditTtModal, setShowEditTtModal] = useState(false);
  const [editTtForm, setEditTtForm] = useState({
    day: 'Monday',
    time: '09:00 AM - 10:00 AM',
    subject: assignedSubjects[0] || 'Operating Systems',
    classSec: `CSE 3-${assignedSections[0] || 'A'}`,
    room: 'LH 105',
  });

  // Current active day schedule classes
  const activeDaySchedule = (timetableData.find(d => d.day === selectedScheduleDay) || dynamicWeeklySchedule.find(d => d.day === selectedScheduleDay))?.classes || [];

  const handleMarkAttendanceForClass = (cls) => {
    setForm(prev => ({
      ...prev,
      subject: cls.rawSubject || cls.subject.replace(/ Lab$/i, '').replace(/ Mentorship$/i, ''),
      section: cls.rawSec || (cls.classSec ? cls.classSec.replace(/.*-/, '') : 'A'),
    }));
    setActiveBottomTab('attendance');
  };

  const handleSaveTtSlot = () => {
    setTimetableData(prev => prev.map(d => {
      if (d.day === editTtForm.day) {
        return {
          ...d,
          classes: [
            ...d.classes.filter(c => c.time !== editTtForm.time),
            { time: editTtForm.time, subject: editTtForm.subject, classSec: editTtForm.classSec, room: editTtForm.room, status: 'scheduled' }
          ]
        };
      }
      return d;
    }));
    setShowEditTtModal(false);
    setToastMessage(`📅 Timetable slot updated (${editTtForm.day})`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStartAttendance = () => {
    onNavigate('Attendance', form);
  };

  const todaySessions = sessions.filter(s => s.date === today);
  const totalPresent = todaySessions.reduce(
    (acc, s) => acc + (s.attendance?.filter(a => a.status === 'present').length || 0), 0
  );

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Good Morning' : greetHour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Mock Analysis Dataset for Students across Sections
  const ANALYSIS_MOCK_STUDENTS = [
    { id: 'S001', name: 'Arjun Reddy', rollNo: 'CE21001', attended: 18, total: 20, section: 'A' },
    { id: 'S002', name: 'Priya Sharma', rollNo: 'CE21002', attended: 19, total: 20, section: 'A' },
    { id: 'S003', name: 'Rahul Verma', rollNo: 'CE21003', attended: 10, total: 20, section: 'A' },
    { id: 'S004', name: 'Sneha Patel', rollNo: 'CE21004', attended: 14, total: 20, section: 'A' },
    { id: 'S005', name: 'Karan Singh', rollNo: 'CE21005', attended: 8, total: 20, section: 'A' },
    { id: 'S006', name: 'Divya Nair', rollNo: 'CE21006', attended: 17, total: 20, section: 'B' },
    { id: 'S007', name: 'Vikram Rao', rollNo: 'CE21007', attended: 11, total: 20, section: 'B' },
    { id: 'S008', name: 'Anjali Gupta', rollNo: 'CE21008', attended: 19, total: 20, section: 'B' },
    { id: 'S009', name: 'Rohit Kumar', rollNo: 'CE21009', attended: 9, total: 20, section: 'B' },
    { id: 'S010', name: 'Meera Iyer', rollNo: 'CE21010', attended: 20, total: 20, section: 'B' },
    { id: 'S011', name: 'Aditya Joshi', rollNo: 'CE21011', attended: 13, total: 20, section: 'C' },
    { id: 'S012', name: 'Pooja Mehta', rollNo: 'CE21012', attended: 18, total: 20, section: 'C' },
    { id: 'S013', name: 'Suresh Babu', rollNo: 'CE21013', attended: 7, total: 20, section: 'C' },
    { id: 'S014', name: 'Kavitha Rao', rollNo: 'CE21014', attended: 16, total: 20, section: 'C' },
    { id: 'S015', name: 'Nikhil Sharma', rollNo: 'CE21015', attended: 12, total: 20, section: 'C' },
  ];

  // Filter students for selected section
  const sectionStudents = ANALYSIS_MOCK_STUDENTS.filter(s => s.section === analysisSection);
  const totalClasses = 20;

  const lowAttendanceStudents = sectionStudents.filter(s => (s.attended / totalClasses) < 0.75);
  const safeAttendanceStudents = sectionStudents.filter(s => (s.attended / totalClasses) >= 0.75);

  const displayedStudents = analysisFilter === 'low'
    ? lowAttendanceStudents
    : analysisFilter === 'safe'
    ? safeAttendanceStudents
    : sectionStudents;

  const classAvgPct = sectionStudents.length > 0
    ? Math.round((sectionStudents.reduce((sum, s) => sum + (s.attended / totalClasses) * 100, 0)) / sectionStudents.length)
    : 0;

  const handleSendAlert = (studentId, studentName) => {
    setAlertSentMap(prev => ({ ...prev, [studentId]: true }));
    setToastMessage(`📱 Low attendance warning sent to ${studentName}`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <HeaderBar
        subtitle={`Teacher Portal (${user?.selectedCollegeCode || 'VJIT'})`}
        onLogout={() => { logout(); onNavigate('Login'); }}
      />

      {/* Floating Toast Notification */}
      {toastMessage ? (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bgPrimary }]} showsVerticalScrollIndicator={false}>

        {/* ══════ TAB 1: PROFESSIONAL HOME DASHBOARD ══════ */}
        {activeBottomTab === 'home' && (
          <View style={{ gap: 14 }}>
            {/* Welcome Banner Card */}
            <View style={[styles.welcomeCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <View style={styles.welcomeTop}>
                <View>
                  <Text style={[styles.greeting, { color: colors.textPrimary }]}>
                    {greeting}, <Text style={{ color: colors.accentBlue }}>{user?.name?.split(' ')[0] || 'Teacher'}</Text> 👋
                  </Text>
                  <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
                    {assignedSubjects.join(', ')} • Dept. of {user?.department || 'CSE'}
                  </Text>
                </View>
                <View style={[styles.dateBox, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue + '40' }]}>
                  <Text style={[styles.dateTxt, { color: colors.accentBlue }]}>
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </View>

              {/* Quick Stat KPI Metrics */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { borderColor: colors.accentBlue + '50', backgroundColor: colors.accentBlueGlow }]}>
                  <Text style={styles.statIcon}>📋</Text>
                  <Text style={[styles.statNum, { color: colors.accentBlue }]}>{activeDaySchedule.length}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Classes ({selectedScheduleDay.slice(0,3)})</Text>
                </View>

                <View style={[styles.statCard, { borderColor: colors.presentBorder, backgroundColor: colors.presentBg }]}>
                  <Text style={styles.statIcon}>✅</Text>
                  <Text style={[styles.statNum, { color: colors.present }]}>{totalPresent}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Present Today</Text>
                </View>

                <View style={[styles.statCard, { borderColor: colors.borderSubtle, backgroundColor: colors.bgGlass }]}>
                  <Text style={styles.statIcon}>📊</Text>
                  <Text style={[styles.statNum, { color: colors.accentPurple }]}>{classAvgPct}%</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Avg Attendance</Text>
                </View>

                <View style={[styles.statCard, { borderColor: colors.borderSubtle, backgroundColor: colors.bgGlass }]}>
                  <Text style={styles.statIcon}>👥</Text>
                  <Text style={[styles.statNum, { color: colors.textPrimary }]}>180</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Assigned Students</Text>
                </View>
              </View>
            </View>

            {/* Quick Action Shortcuts Bar */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }]}
                onPress={() => setActiveBottomTab('attendance')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionEmoji}>📋</Text>
                <Text style={[styles.quickActionText, { color: colors.accentBlue }]}>Mark Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}
                onPress={() => setActiveBottomTab('analysis')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionEmoji}>📊</Text>
                <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Class Analysis</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionBtn, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}
                onPress={() => setActiveBottomTab('timetable')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickActionEmoji}>🗓️</Text>
                <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Timetable</Text>
              </TouchableOpacity>
            </View>

            {/* Today's Class Live Schedule Timeline */}
            <View style={[styles.recentCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <View style={styles.timelineHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                  📅 Teaching Schedule
                </Text>
                {selectedScheduleDay === activeTodayName ? (
                  <Text style={[styles.liveBadge, { color: colors.present }]}>● LIVE (TODAY)</Text>
                ) : (
                  <Text style={[styles.liveBadge, { color: colors.accentBlue }]}>🗓️ {selectedScheduleDay}</Text>
                )}
              </View>

              {/* Day Selector Pills Bar (Mon - Sat) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 10 }}>
                {WEEK_DAYS.map(dayName => {
                  const isSelected = selectedScheduleDay === dayName;
                  const isToday = activeTodayName === dayName;
                  return (
                    <TouchableOpacity
                      key={dayName}
                      style={[
                        styles.dayPill,
                        { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
                        isSelected && [styles.dayPillActive, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }],
                        isToday && !isSelected && { borderColor: colors.accentBlue }
                      ]}
                      onPress={() => setSelectedScheduleDay(dayName)}
                    >
                      <Text style={[
                        styles.dayPillText,
                        { color: colors.textSecondary, fontSize: 12 },
                        isSelected && { color: colors.accentBlue, fontWeight: '800' },
                        isToday && !isSelected && { color: colors.accentBlue, fontWeight: '700' }
                      ]}>
                        {dayName.slice(0, 3)}{isToday ? ' (Today)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.timelineList}>
                {activeDaySchedule.map((item, idx) => {
                  const isCompleted = item.status === 'completed';
                  const isNext = item.status === 'next';
                  return (
                    <View key={idx} style={[styles.timelineItem, { borderLeftColor: isNext ? colors.accentBlue : isCompleted ? colors.present : colors.borderSubtle }]}>
                      <View style={styles.timelineTopRow}>
                        <Text style={[styles.timelineTime, { color: isNext ? colors.accentBlue : colors.textMuted }]}>{item.time}</Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: isCompleted ? colors.presentBg : isNext ? colors.accentBlueGlow : colors.bgGlass }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            { color: isCompleted ? colors.present : isNext ? colors.accentBlue : colors.textMuted }
                          ]}>
                            {isCompleted ? '✓ Completed' : isNext ? '⏱️ Next Up' : 'Scheduled'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.timelineSubject, { color: colors.textPrimary }]}>{item.subject}</Text>
                      <Text style={[styles.timelineMeta, { color: colors.textSecondary }]}>
                        👥 {item.classSec} • 📍 Room: {item.room}
                      </Text>

                      <TouchableOpacity
                        style={[styles.timelineMarkBtn, { backgroundColor: colors.accentBlue, marginTop: 10 }]}
                        onPress={() => handleMarkAttendanceForClass(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.timelineMarkBtnText}>🚀 Mark Class Attendance →</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Low Attendance Warning Alert Banner */}
            <View style={[styles.alertCard, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.absent }]}>Low Attendance Alert</Text>
                <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
                  {lowAttendanceStudents.length} Students in Operating Systems (Sec {analysisSection}) have attendance below 75% threshold.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════ TAB 2: ATTENDANCE MARKING HUB ══════ */}
        {activeBottomTab === 'attendance' && (
          <View style={[styles.configCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
            <View style={styles.configHeader}>
              <Text style={[styles.configTitle, { color: colors.textPrimary }]}>📋 Configure Session & Mark Attendance</Text>
              <Text style={[styles.configSub, { color: colors.textMuted }]}>Select class parameters to load student roster</Text>
            </View>

            {/* Department */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Department</Text>
            <View style={[styles.readOnly, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.readOnlyText, { color: colors.textPrimary }]}>🏗️ CSE (Computer Science & Engineering)</Text>
            </View>

            {/* Year */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Year</Text>
            <View style={styles.chipRow}>
              {MOCK_YEARS.map(y => (
                <TouchableOpacity
                  key={y}
                  style={[styles.chip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, form.year === y && styles.chipActive]}
                  onPress={() => setForm({ ...form, year: y })}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, form.year === y && styles.chipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Section */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Section</Text>
            <View style={styles.chipRow}>
              {assignedSections.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, form.section === s && styles.chipActive]}
                  onPress={() => setForm({ ...form, section: s })}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, form.section === s && styles.chipTextActive]}>Sec {s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subject */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {assignedSubjects.map(subj => (
                <TouchableOpacity
                  key={subj}
                  style={[styles.chip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, form.subject === subj && styles.chipActive]}
                  onPress={() => setForm({ ...form, subject: subj })}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, form.subject === subj && styles.chipTextActive]}>{subj}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Session Time */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>Session Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {MOCK_SESSIONS.map(sess => (
                <TouchableOpacity
                  key={sess}
                  style={[styles.chip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, form.session === sess && styles.chipActive]}
                  onPress={() => setForm({ ...form, session: sess })}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, form.session === sess && styles.chipTextActive]}>{sess}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Summary preview */}
            <View style={[styles.summaryPreview, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.summaryPreviewLabel, { color: colors.textMuted }]}>Session Summary</Text>
              <Text style={[styles.summaryPreviewVal, { color: colors.textPrimary }]}>
                {form.subject} • Sec {form.section} • {form.year}
              </Text>
              <Text style={[styles.summaryPreviewSub, { color: colors.textMuted }]}>{form.session} • {today}</Text>
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartAttendance}
              activeOpacity={0.8}
            >
              <Text style={styles.startBtnText}>🚀 Start Taking Attendance</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════ TAB 3: ATTENDANCE ANALYSIS DASHBOARD ══════ */}
        {activeBottomTab === 'analysis' && (
          <View style={{ gap: 14 }}>
            {/* Header Card */}
            <View style={[styles.welcomeCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.greeting, { color: colors.textPrimary }]}>📊 Class Attendance Analysis</Text>
              <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
                Track per-student attendance, total conducted classes & low-attendance risks
              </Text>

              {/* Subject Selector Pills */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <Text style={[styles.label, { color: colors.textMuted, marginTop: 0 }]}>SELECT SUBJECT</Text>
                <Text style={{ fontSize: 10, color: colors.accentBlue, fontWeight: '700' }}>🔒 Assigned Subjects</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {assignedSubjects.map(sub => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle },
                      analysisSubject === sub && [styles.chipActive, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }]
                    ]}
                    onPress={() => setAnalysisSubject(sub)}
                  >
                    <Text style={[styles.chipText, { color: colors.textSecondary }, analysisSubject === sub && { color: colors.accentBlue, fontWeight: '700' }]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Section Selector Pills */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <Text style={[styles.label, { color: colors.textMuted, marginTop: 0 }]}>SELECT SECTION</Text>
                <Text style={{ fontSize: 10, color: colors.present, fontWeight: '700' }}>🔒 Assigned Sections Only</Text>
              </View>
              <View style={styles.chipRow}>
                {assignedSections.map(sec => (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.chip,
                      { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle },
                      analysisSection === sec && [styles.chipActive, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }]
                    ]}
                    onPress={() => setAnalysisSection(sec)}
                  >
                    <Text style={[styles.chipText, { color: colors.textSecondary }, analysisSection === sec && { color: colors.accentBlue, fontWeight: '700' }]}>
                      Sec {sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conduct Metrics Card */}
              <View style={[styles.analysisSummaryBox, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                <View style={styles.summaryBoxRow}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryVal, { color: colors.accentBlue }]}>{totalClasses}</Text>
                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Total Classes Held</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{sectionStudents.length}</Text>
                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Total Students</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryVal, { color: colors.present }]}>{classAvgPct}%</Text>
                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>Class Average</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryVal, { color: colors.absent }]}>{lowAttendanceStudents.length}</Text>
                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>At Risk (&lt;75%)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Class Mentor Coordinator Action Card */}
            <View style={[styles.welcomeCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                    🛡️ Class Mentor Dashboard (Sec {analysisSection})
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Section Coordinator: {user?.name || 'Dr. Ramesh Kumar'}
                  </Text>
                </View>
                <View style={[styles.pctBadge, { backgroundColor: colors.accentBlueGlow }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accentBlue }}>Mentor Mode</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)', marginTop: 8 }]}
                onPress={() => {
                  setToastMessage(`📢 Bulk SMS Alerts sent to parents of ${lowAttendanceStudents.length} defaulter students in Sec ${analysisSection}`);
                  setTimeout(() => setToastMessage(''), 3500);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.startBtnText, { color: colors.absent }]}>📢 Alert All Defaulter Parents ({lowAttendanceStudents.length} Students)</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Mode Switcher */}
            <View style={styles.filterTabsRow}>
              {[
                { id: 'all', label: `All (${sectionStudents.length})` },
                { id: 'low', label: `⚠️ Low (<75%) (${lowAttendanceStudents.length})` },
                { id: 'safe', label: `🟢 Safe (≥75%) (${safeAttendanceStudents.length})` },
              ].map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.filterTabBtn,
                    { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle },
                    analysisFilter === f.id && { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }
                  ]}
                  onPress={() => setAnalysisFilter(f.id)}
                >
                  <Text style={[
                    styles.filterTabText,
                    { color: colors.textSecondary },
                    analysisFilter === f.id && { color: colors.accentBlue, fontWeight: '800' }
                  ]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Student Roster Breakdown */}
            <View style={[styles.recentCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                👥 Roster Breakdown for {analysisSubject} (Sec {analysisSection})
              </Text>

              {displayedStudents.map((st) => {
                const pct = Math.round((st.attended / totalClasses) * 100);
                const isLow = pct < 75;
                const isAlertSent = alertSentMap[st.id];

                return (
                  <View key={st.id} style={[styles.studentAnalysisRow, { borderBottomColor: colors.borderSubtle }]}>
                    {/* Left Avatar & Info */}
                    <View style={styles.studentAnalysisLeft}>
                      <View style={[
                        styles.studentInitCircle,
                        { backgroundColor: isLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)' }
                      ]}>
                        <Text style={[styles.studentInitText, { color: isLow ? colors.absent : colors.present }]}>
                          {st.name.charAt(0)}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.studentAnalysisName, { color: colors.textPrimary }]}>{st.name}</Text>
                        <Text style={[styles.studentAnalysisRoll, { color: colors.textMuted }]}>{st.rollNo} • Sec {st.section}</Text>

                        {/* Progress bar */}
                        <View style={[styles.progressBarBg, { backgroundColor: colors.bgGlass }]}>
                          <View style={[
                            styles.progressBarFill,
                            { width: `${pct}%`, backgroundColor: isLow ? colors.absent : colors.present }
                          ]} />
                        </View>
                      </View>
                    </View>

                    {/* Right Stats & Action */}
                    <View style={styles.studentAnalysisRight}>
                      <Text style={[styles.attendedCountTxt, { color: colors.textPrimary }]}>
                        {st.attended} / {totalClasses} <Text style={{ fontSize: 10, color: colors.textMuted }}>Classes</Text>
                      </Text>

                      <View style={[
                        styles.pctBadge,
                        { backgroundColor: isLow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)' }
                      ]}>
                        <Text style={[styles.pctBadgeTxt, { color: isLow ? colors.absent : colors.present }]}>
                          {pct}% {isLow ? '⚠️ Low' : '🟢 Safe'}
                        </Text>
                      </View>

                      {isLow && (
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          <TouchableOpacity
                            style={[
                              styles.sendAlertBtn,
                              isAlertSent ? { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle } : { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)' }
                            ]}
                            onPress={() => handleSendAlert(st.id, st.name)}
                            disabled={isAlertSent}
                          >
                            <Text style={[styles.sendAlertBtnText, { color: isAlertSent ? colors.textMuted : colors.absent }]}>
                              {isAlertSent ? 'Alert Sent ✓' : 'Alert 📩'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.sendAlertBtn, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }]}
                            onPress={() => {
                              setToastMessage(`📞 Dialing parent of ${st.name} (+91 98765 43210)...`);
                              setTimeout(() => setToastMessage(''), 3000);
                            }}
                          >
                            <Text style={[styles.sendAlertBtnText, { color: colors.accentBlue }]}>📞 Call</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ══════ TAB 4: TIMETABLE ══════ */}
        {activeBottomTab === 'timetable' && (
          <View style={{ gap: 14 }}>
            <View style={[styles.ttHeader, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle, borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
              <View>
                <Text style={[styles.ttTitle, { color: colors.textPrimary }]}>🗓️ Teaching Schedule</Text>
                <Text style={[styles.ttSub, { color: colors.textSecondary }]}>{user?.name || 'Faculty Member'} • CSE Class Coordinator</Text>
              </View>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue, paddingHorizontal: 12, paddingVertical: 8 }]}
                onPress={() => setShowEditTtModal(true)}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.accentBlue }}>✏️ Manage Timetable</Text>
              </TouchableOpacity>
            </View>

            {/* Day Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.dayRow}>
                {WEEK_DAYS.map(dayName => (
                  <TouchableOpacity
                    key={dayName}
                    style={[styles.dayPill, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, selectedScheduleDay === dayName && styles.dayPillActive]}
                    onPress={() => setSelectedScheduleDay(dayName)}
                  >
                    <Text style={[styles.dayPillText, { color: colors.textSecondary }, selectedScheduleDay === dayName && styles.dayPillTextActive]}>
                      {dayName.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Faculty Class Schedule for Day */}
            {activeDaySchedule.map((cls, index) => (
              <View key={index} style={[styles.ttClassCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
                <View style={[styles.ttTimeCol, { backgroundColor: colors.bgGlass }]}>
                  <Text style={styles.ttTimeIcon}>⏰</Text>
                  <Text style={[styles.ttTimeText, { color: colors.accentBlue }]}>{cls.time}</Text>
                </View>

                <View style={styles.ttMainCol}>
                  <Text style={[styles.ttSubject, { color: colors.textPrimary }]}>{cls.subject}</Text>
                  <Text style={[styles.ttTeacher, { color: colors.textSecondary }]}>👥 Class: {cls.classSec}</Text>
                  <View style={[styles.ttRoomTag, { backgroundColor: colors.bgGlass, marginBottom: 8 }]}>
                    <Text style={[styles.ttRoomText, { color: colors.textMuted }]}>📍 Room: {cls.room}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.timelineMarkBtn, { backgroundColor: colors.accentBlue }]}
                    onPress={() => handleMarkAttendanceForClass(cls)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.timelineMarkBtnText}>🚀 Mark Attendance →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ══════ TAB 5: PROFESSIONAL FACULTY PROFILE ══════ */}
        {activeBottomTab === 'profile' && (
          <View style={{ gap: 14 }}>
            {/* Hero Profile Card */}
            <View style={[styles.profileBigCard, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              {/* Avatar Badge Container */}
              <View style={styles.avatarWrapper}>
                <View style={[styles.bigAvatar, { backgroundColor: colors.accentBlue }]}>
                  <Text style={styles.bigAvatarText}>{user?.name?.charAt(0) || 'R'}</Text>
                </View>
                <View style={[styles.cameraBadge, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                  <Text style={{ fontSize: 12 }}>📷</Text>
                </View>
                <View style={[styles.onlineDot, { backgroundColor: colors.present }]} />
              </View>

              <Text style={[styles.bigName, { color: colors.textPrimary }]}>{user?.name || 'Dr. Ramesh Kumar'}</Text>
              <Text style={[styles.bigRoll, { color: colors.accentBlue }]}>Senior Instructor • ID: {user?.collegeId || user?.uid || 'VJIT-T-001'}</Text>

              {/* Verified & Server Pill */}
              <View style={styles.badgeRow}>
                <View style={[styles.collegeBadge, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue + '40' }]}>
                  <Text style={[styles.collegeBadgeText, { color: colors.accentBlue }]}>🏛️ {user?.selectedCollegeCode || 'VJIT'} Faculty Node</Text>
                </View>
                <View style={[styles.collegeBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                  <Text style={[styles.collegeBadgeText, { color: colors.present }]}>🛡️ Verified</Text>
                </View>
              </View>

              {/* Quick Stat KPI Metric Strip */}
              <View style={[styles.profileStatStrip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]}>
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, { color: colors.accentBlue }]}>124</Text>
                  <Text style={[styles.profileStatLbl, { color: colors.textMuted }]}>Classes Taken</Text>
                </View>
                <View style={[styles.profileStatDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, { color: colors.present }]}>88.5%</Text>
                  <Text style={[styles.profileStatLbl, { color: colors.textMuted }]}>Avg Attendance</Text>
                </View>
                <View style={[styles.profileStatDivider, { backgroundColor: colors.borderSubtle }]} />
                <View style={styles.profileStatItem}>
                  <Text style={[styles.profileStatNum, { color: '#f59e0b' }]}>4.9 ★</Text>
                  <Text style={[styles.profileStatLbl, { color: colors.textMuted }]}>Faculty Rating</Text>
                </View>
              </View>
            </View>

            {/* Academic & Personal Details */}
            <View style={[styles.infoBox, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.infoBoxTitle, { color: colors.textPrimary }]}>👨‍🏫 Academic & Contact Details</Text>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Department</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user?.department || 'Computer Science & Engineering'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Primary Subjects</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{user?.subject || 'Data Structures, Operating Systems'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Assigned Sections</Text>
                <Text style={[styles.infoVal, { color: colors.accentBlue, fontWeight: '700' }]}>CSE 3-A, CSE 3-B, CSE 2-C</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Official Email</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{(user?.collegeId || 'ramesh').toLowerCase()}@{(user?.selectedCollegeCode || 'vjit').toLowerCase()}.edu.in</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>Contact Phone</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>+91 98765 43210</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: colors.borderSubtle }]}>
                <Text style={[styles.infoLbl, { color: colors.textMuted }]}>System Status</Text>
                <Text style={[styles.infoVal, { color: colors.present }]}>🟢 Active Instructor</Text>
              </View>
            </View>

            {/* App Settings & Preferences Box */}
            <View style={[styles.infoBox, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.infoBoxTitle, { color: colors.textPrimary }]}>⚙️ App Preferences & Theme</Text>

              {/* Theme Toggle Option */}
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

              {/* Notification Preference */}
              <View style={[styles.settingRow, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle, marginTop: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>🔔</Text>
                  <View>
                    <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Low Attendance Alerts</Text>
                    <Text style={[styles.settingSub, { color: colors.textMuted }]}>Notify when student &lt; 75%</Text>
                  </View>
                </View>
                <Text style={[styles.toggleBtnText, { color: colors.present }]}>ON 🟢</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.exportReportBtn, { backgroundColor: colors.accentBlueGlow, borderColor: colors.accentBlue }]}
              onPress={() => {
                setToastMessage('📊 Generating & Exporting Monthly Attendance Report (PDF)...');
                setTimeout(() => setToastMessage(''), 3000);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.exportReportBtnText, { color: colors.accentBlue }]}>📥 Export Monthly Attendance Report (PDF)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutFullBtn}
              onPress={() => { logout(); onNavigate('Login'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutFullText}>🚪 Sign Out of Faculty Portal</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <BottomNavBar
        activeTab={activeBottomTab}
        onSelectTab={setActiveBottomTab}
        role="teacher"
      />

      {/* EDIT TIMETABLE MODAL (CSE COORDINATOR / MENTOR ACCESS) */}
      <Modal
        visible={showEditTtModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditTtModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  ✏️ Edit Class Timetable Slot
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  CSE Class Coordinator & Section Mentor Access
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.bgGlass }]}
                onPress={() => setShowEditTtModal(false)}
              >
                <Text style={[styles.modalCloseTxt, { color: colors.textPrimary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 14 }}>
              {/* Day Selector */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Select Day</Text>
              <View style={styles.chipRow}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, editTtForm.day === d && styles.chipActive]}
                    onPress={() => setEditTtForm({ ...editTtForm, day: d })}
                  >
                    <Text style={[styles.chipText, { color: colors.textSecondary }, editTtForm.day === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time Slot */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Time Slot</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:15 AM - 12:15 PM', '02:00 PM - 03:00 PM', '02:00 PM - 04:00 PM'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }, editTtForm.time === t && styles.chipActive]}
                    onPress={() => setEditTtForm({ ...editTtForm, time: t })}
                  >
                    <Text style={[styles.chipText, { color: colors.textSecondary }, editTtForm.time === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Subject Name */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Subject Name</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.bgGlass, color: colors.textPrimary, borderColor: colors.borderSubtle, borderRadius: 12, padding: 12, borderWidth: 1 }]}
                value={editTtForm.subject}
                onChangeText={(txt) => setEditTtForm({ ...editTtForm, subject: txt })}
                placeholder="Subject Name (e.g. Data Structures)"
                placeholderTextColor={colors.textMuted}
              />

              {/* Room Location */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Class Room / Lab Location</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.bgGlass, color: colors.textPrimary, borderColor: colors.borderSubtle, borderRadius: 12, padding: 12, borderWidth: 1 }]}
                value={editTtForm.room}
                onChangeText={(txt) => setEditTtForm({ ...editTtForm, room: txt })}
                placeholder="Room (e.g. Lab 3 / LH 102)"
                placeholderTextColor={colors.textMuted}
              />

              {/* Save Action Button */}
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.accentBlue, marginTop: 10 }]}
                onPress={handleSaveTtSlot}
                activeOpacity={0.8}
              >
                <Text style={styles.startBtnText}>💾 Update & Publish Timetable Slot</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 30 },

  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 12,
    zIndex: 999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },
  toastText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  welcomeCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  welcomeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: { fontSize: 20, fontWeight: '800' },
  greetingSub: { fontSize: 12, marginTop: 3 },
  dateBox: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  dateTxt: { fontSize: 12, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statNum: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 8, marginTop: 2, textAlign: 'center' },

  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickActionEmoji: { fontSize: 15 },
  quickActionText: { fontSize: 11, fontWeight: '700' },

  recentCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  liveBadge: { fontSize: 11, fontWeight: '800' },
  timelineList: { gap: 10 },
  timelineItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineTime: { fontSize: 11, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  timelineSubject: { fontSize: 14, fontWeight: '800' },
  timelineMeta: { fontSize: 11, marginTop: 2 },
  timelineMarkBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  timelineMarkBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sessionDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  sessionName: { fontSize: 13, fontWeight: '700' },
  sessionMeta: { fontSize: 10 },
  sessionStat: { alignItems: 'flex-end' },
  sessionPct: { fontSize: 14, fontWeight: '800' },
  sessionPctLbl: { fontSize: 10 },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  alertIcon: { fontSize: 24 },
  alertTitle: { fontSize: 13, fontWeight: '800' },
  alertSub: { fontSize: 11, marginTop: 2 },

  configCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  configHeader: { marginBottom: 14 },
  configTitle: { fontSize: 16, fontWeight: '800' },
  configSub: { fontSize: 11, marginTop: 3 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnly: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  readOnlyText: { fontSize: 13 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hScroll: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipActive: {},
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { fontWeight: '700' },

  summaryPreview: {
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  summaryPreviewLabel: {
    fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  summaryPreviewVal: { fontSize: 14, fontWeight: '800' },
  summaryPreviewSub: { fontSize: 11, marginTop: 2 },

  startBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Analysis Tab Styles
  analysisSummaryBox: {
    marginTop: 14,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  summaryBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  summaryLbl: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  studentAnalysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  studentAnalysisLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  studentInitCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInitText: {
    fontSize: 14,
    fontWeight: '800',
  },
  studentAnalysisName: {
    fontSize: 13,
    fontWeight: '700',
  },
  studentAnalysisRoll: {
    fontSize: 10,
    marginTop: 1,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  studentAnalysisRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  attendedCountTxt: {
    fontSize: 12,
    fontWeight: '800',
  },
  pctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pctBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
  },
  sendAlertBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 2,
  },
  sendAlertBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Timetable
  ttHeader: { marginBottom: 8 },
  ttTitle: { fontSize: 18, fontWeight: '800' },
  ttSub: { fontSize: 12, marginTop: 2 },
  dayRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dayPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1,
  },
  dayPillActive: {},
  dayPillText: { fontSize: 13, fontWeight: '700' },
  dayPillTextActive: { color: '#FFFFFF' },
  ttClassCard: {
    flexDirection: 'row', borderRadius: 16, padding: 14,
    borderWidth: 1, gap: 12, marginBottom: 10,
  },
  ttTimeCol: { width: 110, paddingRight: 10, borderRightWidth: 1 },
  ttTimeIcon: { fontSize: 16, marginBottom: 4 },
  ttTimeText: { fontSize: 11, fontWeight: '700' },
  ttMainCol: { flex: 1 },
  ttSubject: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  ttTeacher: { fontSize: 12, marginBottom: 6 },
  ttRoomTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  ttRoomText: { fontSize: 10, fontWeight: '600' },

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
  exportReportBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  exportReportBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },

  logoutFullBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 6,
  },
  logoutFullText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
