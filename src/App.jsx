import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import AttendancePage from './pages/AttendancePage';
import StudentDashboard from './pages/StudentDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CollegeAdminDashboard from './pages/CollegeAdminDashboard';

// Protected route wrapper
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();

  const getHomeRedirect = () => {
    if (!user) return <LoginPage />;
    if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  };

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={getHomeRedirect()} />
        <Route
          path="/superadmin"
          element={
            <ProtectedRoute allowedRole="superadmin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <CollegeAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedRole="teacher">
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AttendanceProvider>
          <AppRoutes />
        </AttendanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
