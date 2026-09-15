import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  submitSession,
  subscribeStudentAttendance,
  subscribeStudentNotifications,
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

  // For student: live Firestore data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Subscription cleanup refs
  const unsubAttRef = useRef(null);
  const unsubNotifRef = useRef(null);

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
      submitAttendance,
      submitting,
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

