import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db, collection, doc, updateDoc, onSnapshot, query, where, writeBatch, serverTimestamp } from '../firebase';
import { useAuth } from './AuthContext';

const AttendanceContext = createContext(null);
export const useAttendance = () => useContext(AttendanceContext);

export const AttendanceProvider = ({ children }) => {
  const { user } = useAuth();

  // Teacher: local sessions submitted this session
  const [sessions, setSessions] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Student & Teacher live timetable & config data
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [collegeConfig, setCollegeConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const unsubAttRef = useRef(null);
  const unsubNotifRef = useRef(null);
  const unsubTTRef = useRef(null);
  const unsubConfigRef = useRef(null);

  const collegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';

  // Live subscription to collegeConfig & timetables for all logged in users
  useEffect(() => {
    if (!collegeCode) return;

    // College Config Listener
    const configRef = doc(db, 'collegeConfig', collegeCode);
    unsubConfigRef.current = onSnapshot(configRef, snap => {
      if (snap.exists()) {
        setCollegeConfig(snap.data());
      } else {
        setCollegeConfig({
          startTime: '09:00',
          periodsPerDay: 7,
          periodDuration: 50,
          hasLunchBreak: true,
          lunchAfterPeriod: 4,
          lunchDuration: 45,
        });
      }
    }, err => console.warn('Config subscription error:', err.message));

    // Timetables Listener (all section timetables for college)
    const ttQuery = query(collection(db, 'timetables'), where('collegeCode', '==', collegeCode));
    unsubTTRef.current = onSnapshot(ttQuery, snap => {
      const ttList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTimetables(ttList);
    }, err => console.warn('Timetables subscription error:', err.message));

    return () => {
      if (unsubConfigRef.current) { unsubConfigRef.current(); unsubConfigRef.current = null; }
      if (unsubTTRef.current) { unsubTTRef.current(); unsubTTRef.current = null; }
    };
  }, [collegeCode]);

  // Subscribe to live student data when student logs in
  useEffect(() => {
    if (user?.role === 'student' && (user?.rollNo || user?.collegeId)) {
      const rollNo = user.rollNo || user.collegeId;
      setLoading(true);

      // Live attendance records (no orderBy = no composite index needed)
      const attQ = query(
        collection(db, 'attendance'),
        where('rollNo', '==', rollNo)
      );
      unsubAttRef.current = onSnapshot(attQ, snap => {
        // Sort client-side by date desc
        const records = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setAttendanceRecords(records);
        setLoading(false);
      }, err => {
        console.warn('attendance subscription error:', err.message);
        setLoading(false);
      });

      // Live notifications (no orderBy = no composite index needed)
      const notifQ = query(
        collection(db, 'notifications'),
        where('rollNo', '==', rollNo)
      );
      unsubNotifRef.current = onSnapshot(notifQ, snap => {
        const notifs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setNotifications(notifs);
      }, err => {
        console.warn('notifications subscription error:', err.message);
      });
    }

    return () => {
      if (unsubAttRef.current) { unsubAttRef.current(); unsubAttRef.current = null; }
      if (unsubNotifRef.current) { unsubNotifRef.current(); unsubNotifRef.current = null; }
      setAttendanceRecords([]);
      setNotifications([]);
      setLoading(false);
    };
  }, [user?.uid, user?.role, user?.rollNo, user?.collegeId]);

  /**
   * Teacher submits attendance — writes to Firestore.
   */
  const submitAttendance = useCallback(async (sessionInfo, attendanceList) => {
    setSubmitting(true);
    try {
      const batch = writeBatch(db);

      // 1. Session doc
      const sessionRef = doc(collection(db, 'sessions'));
      const sessionData = {
        subject: sessionInfo.subject,
        section: sessionInfo.section,
        year: sessionInfo.year,
        department: sessionInfo.department || 'CSE',
        session: sessionInfo.session,
        date: sessionInfo.date,
        teacherId: user?.id || user?.uid || 'unknown',
        teacherName: user?.name || '',
        presentCount: attendanceList.filter(a => a.status === 'present').length,
        absentCount: attendanceList.filter(a => a.status === 'absent').length,
        totalCount: attendanceList.length,
        submittedAt: serverTimestamp(),
      };
      batch.set(sessionRef, sessionData);

      // 2. Attendance records
      attendanceList.forEach(record => {
        const attRef = doc(collection(db, 'attendance'));
        batch.set(attRef, {
          sessionId: sessionRef.id,
          studentId: record.id || record.studentId,
          rollNo: record.rollNo,
          name: record.name,
          status: record.status,
          subject: sessionInfo.subject,
          section: sessionInfo.section,
          year: sessionInfo.year,
          date: sessionInfo.date,
          session: sessionInfo.session,
          createdAt: serverTimestamp(),
        });
      });

      // 3. Notifications for absent students
      attendanceList.filter(a => a.status === 'absent').forEach(student => {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          studentId: student.id || student.studentId,
          rollNo: student.rollNo,
          name: student.name,
          sessionId: sessionRef.id,
          subject: sessionInfo.subject,
          session: sessionInfo.session,
          date: sessionInfo.date,
          message: `You are absent in ${sessionInfo.subject} (${sessionInfo.session}) on ${sessionInfo.date}.`,
          read: false,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();

      const newSession = {
        id: sessionRef.id,
        ...sessionInfo,
        attendance: attendanceList,
        submittedAt: new Date().toISOString(),
      };
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  /** Subject-wise map from live records */
  const getStudentAttendance = useCallback((rollNo) => {
    const map = {};
    attendanceRecords.forEach(rec => {
      if (!map[rec.subject]) map[rec.subject] = { total: 0, attended: 0 };
      map[rec.subject].total += 1;
      if (rec.status === 'present') map[rec.subject].attended += 1;
    });
    return map;
  }, [attendanceRecords]);

  const markNotificationRead = useCallback(async (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true });
    } catch (e) {
      console.warn('markRead error:', e.message);
    }
  }, []);

  return (
    <AttendanceContext.Provider value={{
      sessions,
      submitAttendance,
      submitting,
      loading,
      attendanceRecords,
      notifications,
      timetables,
      collegeConfig,
      getStudentAttendance,
      markNotificationRead,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
};
