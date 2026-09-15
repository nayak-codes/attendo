/**
 * adminService.js
 * Firestore read & write services for Admin functionality:
 * - Add new Teacher
 * - Add new Student
 * - Subscribe to live lists of Teachers & Students
 * - Delete Teacher or Student
 */
import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from './firebaseConfig';

/**
 * Add a new Teacher to Firestore /users
 */
export async function addTeacher(teacherData) {
  const teacherId = teacherData.id || `T_${Date.now().toString().slice(-6)}`;
  const userRef = doc(db, 'users', teacherId);

  const payload = {
    collegeId: teacherData.collegeId.trim(),
    password: teacherData.password.trim(),
    name: teacherData.name.trim(),
    role: 'teacher',
    subject: teacherData.subject.trim(),
    department: teacherData.department || 'CSE',
    collegeCode: teacherData.collegeCode || 'VJIT',
    assignedSections: teacherData.assignedSections || ['A'],
    assignedSubjects: teacherData.assignedSubjects || [teacherData.subject.trim()],
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, payload);
  return { id: teacherId, ...payload };
}

/**
 * Update Teacher Assigned Sections & Subjects
 */
export async function updateTeacherAssignments(teacherId, assignedSections, assignedSubjects) {
  const userRef = doc(db, 'users', teacherId);
  await updateDoc(userRef, {
    assignedSections,
    assignedSubjects,
  });
}

/**
 * Add a new Student to Firestore /users AND /students
 */
export async function addStudent(studentData) {
  const studentId = studentData.id || `S_${Date.now().toString().slice(-6)}`;
  const userRef = doc(db, 'users', studentId);
  const studentRef = doc(db, 'students', studentId);

  const userPayload = {
    collegeId: studentData.rollNo.trim(),
    rollNo: studentData.rollNo.trim(),
    password: studentData.password.trim(),
    name: studentData.name.trim(),
    role: 'student',
    department: studentData.department || 'CSE',
    section: studentData.section || 'A',
    year: studentData.year || '3rd Year',
    collegeCode: studentData.collegeCode || 'VJIT',
    createdAt: serverTimestamp(),
  };

  const studentPayload = {
    name: studentData.name.trim(),
    rollNo: studentData.rollNo.trim(),
    department: studentData.department || 'CSE',
    section: studentData.section || 'A',
    year: studentData.year || '3rd Year',
    collegeCode: studentData.collegeCode || 'VJIT',
  };

  await setDoc(userRef, userPayload);
  await setDoc(studentRef, studentPayload);
  return { id: studentId, ...userPayload };
}

function isUserBelongingToCollege(userDoc, targetCollegeCode) {
  if (!userDoc || !targetCollegeCode) return false;
  const target = targetCollegeCode.toUpperCase().trim();

  // 1. Explicit collegeCode check
  if (userDoc.collegeCode) {
    return userDoc.collegeCode.toUpperCase().trim() === target;
  }
  if (userDoc.selectedCollegeCode) {
    return userDoc.selectedCollegeCode.toUpperCase().trim() === target;
  }

  // 2. Check if ID starts with or contains the college code
  const idStr = String(userDoc.collegeId || userDoc.rollNo || userDoc.id || '').toUpperCase();
  if (idStr.startsWith(target) || idStr.includes(`${target}-`)) {
    return true;
  }

  // 3. Strict fallback: Sample default data (CE21001, VJIT-T-001, 24J41A05EZ) strictly belongs ONLY to VJIT
  if (target === 'VJIT' && (idStr.includes('VJIT') || idStr.startsWith('CE') || idStr.startsWith('24J') || idStr === 'S001' || idStr === 'S002' || idStr === 'T001' || idStr === 'T002')) {
    return true;
  }

  return false;
}

/**
 * Real-time listener: Teachers filtered strictly by collegeCode
 */
export function subscribeTeachers(callback, targetCollegeCode) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'teacher')
  );
  return onSnapshot(
    q,
    snapshot => {
      const allTeachers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = targetCollegeCode
        ? allTeachers.filter(t => isUserBelongingToCollege(t, targetCollegeCode))
        : allTeachers;
      callback(filtered);
    },
    err => {
      console.warn('subscribeTeachers warning:', err.message);
    }
  );
}

/**
 * Real-time listener: Students filtered strictly by collegeCode
 */
export function subscribeStudents(callback, targetCollegeCode) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'student')
  );
  return onSnapshot(
    q,
    snapshot => {
      const allStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = targetCollegeCode
        ? allStudents.filter(s => isUserBelongingToCollege(s, targetCollegeCode))
        : allStudents;
      callback(filtered);
    },
    err => {
      console.warn('subscribeStudents warning:', err.message);
    }
  );
}

/**
 * Delete a user by ID
 */
export async function deleteUser(userId) {
  await deleteDoc(doc(db, 'users', userId));
  try {
    await deleteDoc(doc(db, 'students', userId));
  } catch (e) {
    // optional doc
  }
}
