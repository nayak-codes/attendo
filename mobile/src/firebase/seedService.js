/**
 * seedService.js
 * Automatically populates Firestore with initial demo users (teachers, students)
 * and student lists so real database queries work out of the box.
 */
import { db, collection, doc, getDocs, writeBatch, query, limit } from './firebaseConfig';
import { MOCK_USERS, MOCK_STUDENTS } from '../data/mockData';

export async function seedDatabaseIfEmpty() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log('⚡ Firestore already contains users data. Skipping seed.');
      return;
    }

    console.log('🌱 Seeding Firestore with initial demo data...');
    const batch = writeBatch(db);

    // 0. Seed Admin
    if (MOCK_USERS.admins) {
      MOCK_USERS.admins.forEach(admin => {
        const userRef = doc(db, 'users', admin.id);
        batch.set(userRef, {
          collegeId: admin.collegeId,
          password: admin.password,
          name: admin.name,
          role: 'admin',
          createdAt: new Date().toISOString(),
        });
      });
    }

    // 1. Seed Teachers
    MOCK_USERS.teachers.forEach(teacher => {
      const userRef = doc(db, 'users', teacher.id);
      batch.set(userRef, {
        collegeId: teacher.collegeId,
        password: teacher.password,
        name: teacher.name,
        role: 'teacher',
        subject: teacher.subject,
        department: teacher.department,
        createdAt: new Date().toISOString(),
      });
    });

    // 2. Seed Students into /users
    MOCK_USERS.students.forEach(student => {
      const userRef = doc(db, 'users', student.id);
      batch.set(userRef, {
        collegeId: student.collegeId,
        password: student.password,
        name: student.name,
        rollNo: student.rollNo,
        role: 'student',
        department: 'CSE',
        section: 'A',
        year: '3rd Year',
        createdAt: new Date().toISOString(),
      });
    });

    // 3. Seed Full Roster in /students
    MOCK_STUDENTS.forEach(student => {
      const studentRef = doc(db, 'students', student.id);
      batch.set(studentRef, {
        name: student.name,
        rollNo: student.rollNo,
        department: student.department,
        section: student.section,
        year: `${student.year}rd Year`,
      });
    });

    await batch.commit();
    console.log('✅ Firestore seeded successfully with teachers & students!');
  } catch (err) {
    console.warn('Seed database warning (possibly offline or rules):', err.message);
  }
}
