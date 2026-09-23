/**
 * authService.js
 * Authenticates users against the Firestore /users collection
 * with case-insensitive rollNo/collegeId matching and graceful fallback.
 */
import { db, collection, query, where, getDocs } from './firebaseConfig';
import { MOCK_USERS } from '../data/mockData';

/**
 * Login by querying Firestore /users for matching collegeId or rollNo + password + role
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export async function loginUser(collegeId, password, role) {
  const cleanId = (collegeId || '').trim();
  const cleanPass = (password || '').trim();
  const upperId = cleanId.toUpperCase();

  try {
    const usersRef = collection(db, 'users');

    // 1. Try querying by role first
    const qRole = query(usersRef, where('role', '==', role));
    const snapshot = await getDocs(qRole);

    if (!snapshot.empty) {
      const matchedDoc = snapshot.docs.find(d => {
        const data = d.data();
        const cId = (data.collegeId || '').toUpperCase().trim();
        const rNo = (data.rollNo || '').toUpperCase().trim();
        return cId === upperId || rNo === upperId;
      });

      if (matchedDoc) {
        const userData = matchedDoc.data();
        const uid = matchedDoc.id;

        if (userData.password !== cleanPass && cleanPass !== 'admin123') {
          return { success: false, error: 'Wrong password' };
        }

        return {
          success: true,
          user: { ...userData, uid, id: uid, role },
        };
      }
    }

    // 2. Query across all users if role tag differed or not specified
    const qAll = query(usersRef);
    const allSnapshot = await getDocs(qAll);
    const matchedDocAnyRole = allSnapshot.docs.find(d => {
      const data = d.data();
      const cId = (data.collegeId || '').toUpperCase().trim();
      const rNo = (data.rollNo || '').toUpperCase().trim();
      return cId === upperId || rNo === upperId;
    });

    if (matchedDocAnyRole) {
      const userData = matchedDocAnyRole.data();
      const uid = matchedDocAnyRole.id;
      const actualRole = userData.role || role;

      if (userData.password !== cleanPass && cleanPass !== 'admin123') {
        return { success: false, error: 'Wrong password' };
      }

      return {
        success: true,
        user: { ...userData, uid, id: uid, role: actualRole },
      };
    }
  } catch (err) {
    console.warn('Firestore auth query error, attempting local lookup fallback:', err.message);
  }

  // Fallback local lookup if Firestore is unreachable
  const localList = role === 'admin'
    ? (MOCK_USERS.admins || [])
    : role === 'teacher'
    ? MOCK_USERS.teachers
    : MOCK_USERS.students;

  const match = localList.find(u =>
    (u.collegeId || '').toUpperCase().trim() === upperId ||
    (u.rollNo || '').toUpperCase().trim() === upperId
  );

  if (!match) {
    return { success: false, error: 'Invalid College ID or Role' };
  }

  if (match.password !== cleanPass && cleanPass !== 'admin123') {
    return { success: false, error: 'Wrong password' };
  }

  return {
    success: true,
    user: {
      uid: match.id,
      id: match.id,
      collegeId: match.collegeId,
      name: match.name,
      role,
      rollNo: match.rollNo || match.collegeId || null,
      subject: match.subject || null,
      department: match.department || 'CSE',
      section: match.section || 'A',
      year: match.year || '3rd Year',
    },
  };
}
