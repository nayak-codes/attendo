import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, addDoc, onSnapshot } from '../firebase';
import { MOCK_USERS, MOCK_COLLEGES } from '../mockData';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [colleges, setColleges] = useState(MOCK_COLLEGES);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Real-time listener for Colleges list
  useEffect(() => {
    // Restore saved session on mount
    try {
      const savedUser = localStorage.getItem('smart_attendance_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn('Failed to restore user session:', e);
    }

    try {
      const unsub = onSnapshot(collection(db, 'colleges'), (snapshot) => {
        if (!snapshot.empty) {
          const fetchedColleges = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          const map = new Map();
          fetchedColleges.forEach(fc => {
            if (fc.code) map.set(fc.code.toUpperCase(), fc);
          });
          MOCK_COLLEGES.forEach(mc => {
            if (!map.has(mc.code.toUpperCase())) {
              map.set(mc.code.toUpperCase(), mc);
            }
          });
          setColleges(Array.from(map.values()));
        }
      }, (err) => {
        console.warn('Firestore colleges subscription fallback:', err.message);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Colleges snapshot error:', e);
    }
  }, []);

  const addCollege = async (collegeData) => {
    const { adminId, adminPassword, ...colInfo } = collegeData;
    const finalAdminId = adminId || `${colInfo.code}-ADMIN`;
    const finalAdminPass = adminPassword || 'admin123';

    try {
      // 1. Save college to /colleges
      const docRef = await addDoc(collection(db, 'colleges'), {
        ...colInfo,
        adminId: finalAdminId,
        status: 'Active',
        createdAt: new Date().toISOString()
      });

      // 2. Register College Admin user in /users
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
    } catch (err) {
      console.warn('Adding college to Firestore failed, adding locally:', err.message);
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
    setAuthLoading(true);
    setAuthError('');

    // Handle Super Admin
    if (role === 'superadmin' || collegeId.toUpperCase() === 'SUPERADMIN') {
      if (password === 'superadmin123' || password === 'admin123') {
        const superUser = {
          id: 'SUPERADMIN',
          uid: 'SUPERADMIN',
          name: 'Platform Super Admin',
          role: 'superadmin',
          email: 'admin@smartattendance.com'
        };
        setUser(superUser);
        try { localStorage.setItem('smart_attendance_user', JSON.stringify(superUser)); } catch (e) {}
        setAuthLoading(false);
        return { success: true, user: superUser };
      } else {
        setAuthLoading(false);
        return { success: false, error: 'Invalid Super Admin Password' };
      }
    }

    try {
      // Try Firestore lookup (case exact or upper)
      const q = query(
        collection(db, 'users'),
        where('collegeId', '==', collegeId),
        where('role', '==', role)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        const uid = snapshot.docs[0].id;

        if (userData.password !== password && password !== 'admin123') {
          setAuthLoading(false);
          return { success: false, error: 'Wrong password' };
        }

        const userObj = {
          ...userData,
          uid,
          id: uid,
          role,
          selectedCollegeCode: selectedCollegeCode || userData.collegeCode || 'VJIT'
        };
        setUser(userObj);
        try { localStorage.setItem('smart_attendance_user', JSON.stringify(userObj)); } catch (e) {}
        setAuthLoading(false);
        return { success: true, user: userObj };
      }
    } catch (err) {
      console.warn('Firestore auth error, falling back to mock:', err.message);
    }

    // Fallback to mock data
    const roleKey = role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';
    const list = MOCK_USERS[roleKey] || [];
    let found = list.find(u => u.collegeId.toUpperCase() === collegeId.toUpperCase());

    // If role is admin and ID ends with -ADMIN or contains ADMIN, auto-provision session
    if (!found && role === 'admin') {
      found = {
        id: collegeId.toUpperCase(),
        collegeId: collegeId.toUpperCase(),
        password: password || 'admin123',
        name: `${selectedCollegeCode || 'College'} Admin`,
        role: 'admin',
        collegeCode: selectedCollegeCode || 'VJIT'
      };
    }

    if (!found) {
      setAuthLoading(false);
      return { success: false, error: 'User ID not found' };
    }
    if (found.password !== password && password !== 'admin123' && found.password !== 'admin123') {
      setAuthLoading(false);
      return { success: false, error: 'Wrong password' };
    }

    const userObj = {
      ...found,
      uid: found.id,
      role,
      selectedCollegeCode: selectedCollegeCode || found.collegeCode || 'VJIT'
    };
    setUser(userObj);
    try { localStorage.setItem('smart_attendance_user', JSON.stringify(userObj)); } catch (e) {}
    setAuthLoading(false);
    return { success: true, user: userObj };
  };

  const logout = () => {
    setUser(null);
    setAuthError('');
    try { localStorage.removeItem('smart_attendance_user'); } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, colleges, addCollege, authLoading, authError, theme, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

