/**
 * attendanceService.js
 * All Firestore read/write operations for attendance.
 * NOTE: orderBy removed from queries to avoid requiring composite indexes.
 * Sorting is done client-side instead.
 */
import {
  db,
  collection, doc, updateDoc, writeBatch,
  onSnapshot, query, where,
  serverTimestamp,
} from './firebaseConfig';

/**
 * Submit a completed attendance session to Firestore.
 */
export async function submitSession(sessionInfo, attendanceList) {
  const batch = writeBatch(db);

  // 1. Create session document
  const sessionRef = doc(collection(db, 'sessions'));
  const sessionData = {
    subject: sessionInfo.subject,
    section: sessionInfo.section,
    year: sessionInfo.year,
    department: sessionInfo.department || 'CSE',
    session: sessionInfo.session,
    date: sessionInfo.date,
    teacherId: sessionInfo.teacherId || 'unknown',
    teacherName: sessionInfo.teacherName || '',
    presentCount: attendanceList.filter(a => a.status === 'present').length,
    absentCount: attendanceList.filter(a => a.status === 'absent').length,
    totalCount: attendanceList.length,
    submittedAt: serverTimestamp(),
  };
  batch.set(sessionRef, sessionData);

  // 2. Create attendance records (one per student)
  attendanceList.forEach(record => {
    const attRef = doc(collection(db, 'attendance'));
    batch.set(attRef, {
      sessionId: sessionRef.id,
      studentId: record.studentId || record.id,
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

  // 3. Create notifications for ABSENT students
  const absentStudents = attendanceList.filter(a => a.status === 'absent');
  absentStudents.forEach(student => {
    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      studentId: student.studentId || student.id,
      rollNo: student.rollNo,
      name: student.name,
      sessionId: sessionRef.id,
      subject: sessionInfo.subject,
      session: sessionInfo.session,
      date: sessionInfo.date,
      message: `You are absent in ${sessionInfo.subject} class (${sessionInfo.session}) on ${sessionInfo.date}.`,
      read: false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return sessionRef.id;
}

/**
 * Real-time listener: attendance records for a student (by rollNo).
 * No orderBy → no composite index required. Sorted client-side.
 */
export function subscribeStudentAttendance(rollNo, callback) {
  const q = query(
    collection(db, 'attendance'),
    where('rollNo', '==', rollNo)
  );
  return onSnapshot(q, snapshot => {
    const records = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    callback(records);
  }, err => {
    console.warn('subscribeStudentAttendance error:', err.message);
    callback([]);
  });
}

/**
 * Real-time listener: notifications for a student (by rollNo).
 * No orderBy → no composite index required. Sorted client-side.
 */
export function subscribeStudentNotifications(rollNo, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('rollNo', '==', rollNo)
  );
  return onSnapshot(q, snapshot => {
    const notifs = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    callback(notifs);
  }, err => {
    console.warn('subscribeStudentNotifications error:', err.message);
    callback([]);
  });
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notifId) {
  const ref = doc(db, 'notifications', notifId);
  await updateDoc(ref, { read: true });
}

/**
 * Real-time listener: college config (by collegeCode).
 */
export function subscribeCollegeConfig(collegeCode, callback) {
  const ref = doc(db, 'collegeConfig', collegeCode || 'VJIT');
  return onSnapshot(ref, snap => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({
        startTime: '09:00',
        periodsPerDay: 7,
        periodDuration: 50,
        hasLunchBreak: true,
        lunchAfterPeriod: 4,
        lunchDuration: 45,
      });
    }
  }, err => {
    console.warn('subscribeCollegeConfig error:', err.message);
  });
}

/**
 * Real-time listener: section timetables for college (by collegeCode).
 */
export function subscribeCollegeTimetables(collegeCode, callback) {
  const q = query(
    collection(db, 'timetables'),
    where('collegeCode', '==', collegeCode || 'VJIT')
  );
  return onSnapshot(q, snapshot => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(list);
  }, err => {
    console.warn('subscribeCollegeTimetables error:', err.message);
    callback([]);
  });
}

/**
 * Real-time listener: sessions for teacher (by date + section).
 * No orderBy → no composite index required. Sorted client-side.
 */
export function subscribeTeacherSessions(date, section, callback) {
  const q = query(
    collection(db, 'sessions'),
    where('date', '==', date),
    where('section', '==', section)
  );
  return onSnapshot(q, snapshot => {
    const sessions = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        // Sort by submittedAt timestamp if available
        const ta = a.submittedAt?.toMillis?.() || 0;
        const tb = b.submittedAt?.toMillis?.() || 0;
        return tb - ta;
      });
    callback(sessions);
  }, err => {
    console.warn('subscribeTeacherSessions error:', err.message);
    callback([]);
  });
}

/**
 * Real-time listener: all students in a given section (by collegeCode + section).
 * Reads from the 'users' collection where role=='student'.
 */
export function subscribeStudentsBySection(collegeCode, section, callback) {
  if (!collegeCode || !section) { callback([]); return () => {}; }
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student'),
    where('selectedCollegeCode', '==', collegeCode),
    where('section', '==', section)
  );
  return onSnapshot(q, snapshot => {
    const students = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''));
    callback(students);
  }, err => {
    console.warn('subscribeStudentsBySection error:', err.message);
    callback([]);
  });
}

/**
 * Real-time listener: ALL sessions submitted by a teacher (by teacherId).
 * Used for live teacher-side analysis stats.
 */
export function subscribeTeacherAllSessions(teacherId, callback) {
  if (!teacherId) { callback([]); return () => {}; }
  const q = query(
    collection(db, 'sessions'),
    where('teacherId', '==', teacherId)
  );
  return onSnapshot(q, snapshot => {
    const list = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a.submittedAt?.toMillis?.() || 0;
        const tb = b.submittedAt?.toMillis?.() || 0;
        return tb - ta;
      });
    callback(list);
  }, err => {
    console.warn('subscribeTeacherAllSessions error:', err.message);
    callback([]);
  });
}

/**
 * Real-time listener: attendance records for a specific subject+section combo.
 * Returns raw records; caller builds the per-student map.
 */
export function subscribeSubjectSectionAttendance(subject, section, callback) {
  if (!subject || !section) { callback([]); return () => {}; }
  const q = query(
    collection(db, 'attendance'),
    where('subject', '==', subject),
    where('section', '==', section)
  );
  return onSnapshot(q, snapshot => {
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(records);
  }, err => {
    console.warn('subscribeSubjectSectionAttendance error:', err.message);
    callback([]);
  });
}
