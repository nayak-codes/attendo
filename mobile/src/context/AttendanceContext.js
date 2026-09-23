import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  submitSession,
  subscribeStudentAttendance,
  subscribeStudentNotifications,
  subscribeCollegeConfig,
  subscribeCollegeTimetables,
  subscribeTeacherAllSessions,
  subscribeStudentsBySection,
  subscribeSubjectSectionAttendance,
  markNotificationRead as firestoreMarkRead,
} from '../firebase/attendanceService';
import { useAuth } from './AuthContext';

const AttendanceContext = createContext(null);
export const useAttendance = () => useContext(AttendanceContext);

export const AttendanceProvider = ({ children }) => {
  const { user } = useAuth();

  // For teacher: locally track submitted sessions (for same-session stats)
  const [localSessions, setLocalSessions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // For teacher: live Firestore sessions (all sessions ever submitted by this teacher)
  const [liveTeacherSessions, setLiveTeacherSessions] = useState([]);

  // For student & teacher: live Firestore data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [collegeConfig, setCollegeConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  // For teacher analysis: real students from Firestore
  // key: section string → value: array of student user objects
  const [sectionStudentsCache, setSectionStudentsCache] = useState({});
  // For teacher analysis: attendance records per subject+section
  // key: 'subject||section' → array of attendance records
  const [subjectAttendanceCache, setSubjectAttendanceCache] = useState({});

  // Subscription cleanup refs
  const unsubAttRef = useRef(null);
  const unsubNotifRef = useRef(null);
  const unsubConfigRef = useRef(null);
  const unsubTTRef = useRef(null);
  const unsubTeacherSessionsRef = useRef(null);
  // Dynamic section/subject listeners cleanup
  const sectionSubRefs = useRef({});
  const subjectAttSubRefs = useRef({});

  const collegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';

  // Live subscription to collegeConfig & timetables for all users
  useEffect(() => {
    if (!collegeCode) return;

    unsubConfigRef.current = subscribeCollegeConfig(collegeCode, (cfg) => {
      setCollegeConfig(cfg);
    });

    unsubTTRef.current = subscribeCollegeTimetables(collegeCode, (list) => {
      setTimetables(list);
    });

    return () => {
      if (unsubConfigRef.current) { unsubConfigRef.current(); unsubConfigRef.current = null; }
      if (unsubTTRef.current) { unsubTTRef.current(); unsubTTRef.current = null; }
    };
  }, [collegeCode]);

  // Live Firestore sessions for teacher (all submitted, not just local)
  useEffect(() => {
    if (user?.role !== 'teacher' || !user?.uid) {
      setLiveTeacherSessions([]);
      return;
    }
    if (unsubTeacherSessionsRef.current) unsubTeacherSessionsRef.current();
    unsubTeacherSessionsRef.current = subscribeTeacherAllSessions(user.uid, (sessions) => {
      setLiveTeacherSessions(sessions);
    });
    return () => {
      if (unsubTeacherSessionsRef.current) { unsubTeacherSessionsRef.current(); unsubTeacherSessionsRef.current = null; }
    };
  }, [user?.uid, user?.role]);

  /**
   * Teacher: subscribe to all students in a section (on-demand, cached).
   * Caller passes section string; returns unsubscribe.
   */
  const subscribeToSection = useCallback((section) => {
    if (!section) return () => {};
    const collegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';
    if (sectionSubRefs.current[section]) return () => {}; // already subscribed
    const unsub = subscribeStudentsBySection(collegeCode, section, (students) => {
      setSectionStudentsCache(prev => ({ ...prev, [section]: students }));
    });
    sectionSubRefs.current[section] = unsub;
    return unsub;
  }, [user]);

  /**
   * Teacher: subscribe to all attendance records for a subject+section combo.
   */
  const subscribeToSubjectAttendance = useCallback((subject, section) => {
    if (!subject || !section) return () => {};
    const key = `${subject}||${section}`;
    if (subjectAttSubRefs.current[key]) return () => {}; // already subscribed
    const unsub = subscribeSubjectSectionAttendance(subject, section, (records) => {
      setSubjectAttendanceCache(prev => ({ ...prev, [key]: records }));
    });
    subjectAttSubRefs.current[key] = unsub;
    return unsub;
  }, []);

  // When student logs in → subscribe to their Firestore data
  useEffect(() => {
    if (user?.role === 'student' && user?.rollNo) {
      setLoading(true);

      // Attendance records
      unsubAttRef.current = subscribeStudentAttendance(user.rollNo, (records) => {
        setAttendanceRecords(records);
        setLoading(false);
      });

      // Notifications
      unsubNotifRef.current = subscribeStudentNotifications(user.rollNo, (notifs) => {
        setNotifications(notifs);
      });
    }

    // Cleanup on logout / user change
    return () => {
      if (unsubAttRef.current) { unsubAttRef.current(); unsubAttRef.current = null; }
      if (unsubNotifRef.current) { unsubNotifRef.current(); unsubNotifRef.current = null; }
      setAttendanceRecords([]);
      setNotifications([]);
      setLoading(false);
    };
  }, [user?.uid, user?.role, user?.rollNo]);

  /**
   * Teacher submits attendance — writes to Firestore.
   */
  const submitAttendance = useCallback(async (sessionInfo, attendanceList) => {
    setSubmitting(true);
    try {
      const sessionId = await submitSession(
        {
          ...sessionInfo,
          teacherId: user?.uid,
          teacherName: user?.name,
        },
        attendanceList
      );

      // Also keep locally for teacher dashboard today's sessions
      const newSession = {
        id: sessionId,
        ...sessionInfo,
        attendance: attendanceList,
        submittedAt: new Date().toISOString(),
      };
      setLocalSessions(prev => [newSession, ...prev]);
      return newSession;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  // ─── Derived data for student dashboard (100% live) ───────────

  /** Subject-wise attendance map: { 'Data Structures': { total, attended } } */
  const getStudentAttendance = useCallback((rollNo) => {
    const map = {};
    attendanceRecords.forEach(rec => {
      if (!map[rec.subject]) map[rec.subject] = { total: 0, attended: 0 };
      map[rec.subject].total += 1;
      if (rec.status === 'present') map[rec.subject].attended += 1;
    });
    return map;
  }, [attendanceRecords]);

  /** Calendar map: { 'YYYY-MM-DD': 'present' | 'absent' | 'mixed' } */
  const getStudentCalendar = useCallback((rollNo) => {
    const cal = {};
    attendanceRecords.forEach(rec => {
      if (!rec.date) return;
      const existing = cal[rec.date];
      if (!existing) {
        cal[rec.date] = rec.status;
      } else if (existing !== rec.status) {
        cal[rec.date] = 'mixed';
      }
    });
    return cal;
  }, [attendanceRecords]);

  /** Last 10 sessions for student */
  const getStudentSessions = useCallback((rollNo) => {
    return attendanceRecords.slice(0, 10).map(rec => ({
      id: rec.id,
      subject: rec.subject,
      session: rec.session,
      date: rec.date,
      attendance: [{ rollNo, status: rec.status }],
    }));
  }, [attendanceRecords]);

  /** Notifications for this student */
  const getStudentNotifications = useCallback((rollNo) => {
    return notifications;
  }, [notifications]);

  const markNotificationRead = useCallback(async (notifId) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
    // Persist to Firestore
    await firestoreMarkRead(notifId);
  }, []);

  return (
    <AttendanceContext.Provider value={{
      // Teacher
      sessions: localSessions,
      liveTeacherSessions,
      sectionStudentsCache,
      subjectAttendanceCache,
      subscribeToSection,
      subscribeToSubjectAttendance,
      submitAttendance,
      submitting,
      // Timetable & Config
      timetables,
      collegeConfig,
      // Student
      loading,
      attendanceRecords,
      notifications,
      getStudentAttendance,
      getStudentCalendar,
      getStudentSessions,
      getStudentNotifications,
      markNotificationRead,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};

