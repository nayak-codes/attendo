import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot } from '../firebase/firebaseConfig';
import { loginUser } from '../firebase/authService';
import { seedDatabaseIfEmpty } from '../firebase/seedService';
import { MOCK_COLLEGES } from '../data/mockData';
import { getUserSession, saveUserSession, clearUserSession } from '../utils/storage';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [colleges, setColleges] = useState(MOCK_COLLEGES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Seed Firestore database if empty on app launch
    seedDatabaseIfEmpty();

    // Restore saved session on launch asynchronously via AsyncStorage
    const restoreUserSession = async () => {
      try {
        const saved = await getUserSession();
        if (saved) {
          setUser(saved);
        }
      } catch (e) {
        console.warn('Failed to restore mobile session:', e);
      }
    };
    restoreUserSession();

    try {
      const unsub = onSnapshot(collection(db, 'colleges'), (snapshot) => {
        if (!snapshot.empty) {
          const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          const map = new Map();
          fetched.forEach(f => {
            if (f.code) map.set(f.code.toUpperCase(), f);
          });
          MOCK_COLLEGES.forEach(m => {
            if (!map.has(m.code.toUpperCase())) {
              map.set(m.code.toUpperCase(), m);
            }
          });
          setColleges(Array.from(map.values()));
        }
      }, err => {
        console.warn('Colleges snapshot fallback in mobile:', err.message);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Mobile colleges sub error:', e);
    }
  }, []);

  const addCollege = async (collegeData) => {
    const { adminId, adminPassword, ...colInfo } = collegeData;
    const finalAdminId = adminId || `${colInfo.code}-ADMIN`;
    const finalAdminPass = adminPassword || 'admin123';

    try {
      const docRef = await addDoc(collection(db, 'colleges'), {
        ...colInfo,
        adminId: finalAdminId,
        status: 'Active',
        createdAt: new Date().toISOString()
      });

      // Also register College Admin in /users
      await addDoc(collection(db, 'users'), {
        collegeId: finalAdminId,
        password: finalAdminPass,
        name: `${colInfo.name} Admin`,
        role: 'admin',
        collegeCode: colInfo.code,
        createdAt: new Date().toISOString()
      });

      const newCol = { id: docRef.id, ...colInfo, adminId: finalAdminId, status: 'Active' };
      setColleges(prev => {
        const map = new Map();
        [...prev, newCol].forEach(c => {
          if (c.code) map.set(c.code.toUpperCase(), c);
        });
        return Array.from(map.values());
      });
      return { success: true, id: docRef.id };
    } catch (e) {
      const newCol = { id: 'col_' + Date.now(), ...colInfo, adminId: finalAdminId, status: 'Active' };
      setColleges(prev => {
        const map = new Map();
        [...prev, newCol].forEach(c => {
          if (c.code) map.set(c.code.toUpperCase(), c);
        });
        return Array.from(map.values());
      });
      return { success: true, local: true };
    }
  };

  const login = async (collegeId, password, role, selectedCollegeCode) => {
    setLoading(true);

    // Super Admin login check
    if (role === 'superadmin' || collegeId.toUpperCase() === 'SUPERADMIN') {
      if (password === 'superadmin123' || password === 'admin123') {
        const superUser = {
          uid: 'SUPERADMIN',
          collegeId: 'SUPERADMIN',
          name: 'Platform Super Admin (Owner)',
          role: 'superadmin',
        };
        setUser(superUser);
        await saveUserSession(superUser);
        setLoading(false);
        return { success: true, user: superUser };
      } else {
        setLoading(false);
        return { success: false, error: 'Wrong Super Admin Password' };
      }
    }

    try {
      const result = await loginUser(collegeId, password, role);
      if (result.success) {
        const u = {
          ...result.user,
          role,
          selectedCollegeCode: selectedCollegeCode || result.user.collegeCode || 'VJIT'
        };
        setUser(u);
        await saveUserSession(u);
        return { success: true, user: u };
      }
      return { success: false, error: result.error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await clearUserSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, colleges, addCollege, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
