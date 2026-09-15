/**
 * authService.js
 * Authenticates users against the Firestore /users collection
 * with graceful fallback to mock credentials.
 */
import { db, collection, query, where, getDocs } from './firebaseConfig';
import { MOCK_USERS } from '../data/mockData';

/**
 * Login by querying Firestore /users for matching collegeId + password + role
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function loginUser(collegeId, password, role) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('collegeId', '==', collegeId),
      where('role', '==', role)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      const uid = snapshot.docs[0].id;

      if (userData.password !== password) {
        return { success: false, error: 'Wrong password' };
      }

      return {
        success: true,
        user: { ...userData, uid, role },
      };
    }
  } catch (err) {
    console.warn('Firestore auth query error, attempting local lookup fallback:', err.message);
  }

  // Fallback local lookup if Firestore fails or before seeding completes
  const localList = role === 'admin'
    ? (MOCK_USERS.admins || [])
    : role === 'teacher'
    ? MOCK_USERS.teachers
    : MOCK_USERS.students;
  const match = localList.find(u => u.collegeId === collegeId);

  if (!match) {
    return { success: false, error: 'Invalid College ID or Role' };
  }

  if (match.password !== password) {
    return { success: false, error: 'Wrong password' };
  }

  return {
    success: true,
    user: {
      uid: match.id,
      collegeId: match.collegeId,
      name: match.name,
      role,
      rollNo: match.rollNo || null,
      subject: match.subject || null,
      department: match.department || 'CSE',
      section: 'A',
      year: '3rd Year',
    },
  };
}
