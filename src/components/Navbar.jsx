import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleHome = () => {
    if (user?.role === 'superadmin') navigate('/superadmin');
    else if (user?.role === 'admin') navigate('/admin');
    else if (user?.role === 'teacher') navigate('/teacher');
    else if (user?.role === 'student') navigate('/student');
    else navigate('/');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={handleHome}>
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="brand-name">Edu<span className="brand-accent">Track</span></span>
          {user.selectedCollegeCode && user.role !== 'superadmin' && (
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              background: 'rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              padding: '2px 8px',
              borderRadius: '6px',
              marginLeft: '8px'
            }}>
              {user.selectedCollegeCode}
            </span>
          )}
        </div>

        <div className="navbar-center">
          {user.role === 'superadmin' && (
            <button
              className={`nav-link ${location.pathname === '/superadmin' ? 'active' : ''}`}
              onClick={() => navigate('/superadmin')}
            >
              👑 College Servers Portal
            </button>
          )}
          {user.role === 'admin' && (
            <button
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              🏢 College Admin Dashboard
            </button>
          )}
          {user.role === 'teacher' && (
            <>
              <button
                className={`nav-link ${location.pathname === '/teacher' ? 'active' : ''}`}
                onClick={() => navigate('/teacher')}
              >
                Dashboard
              </button>
              <button
                className={`nav-link ${location.pathname.includes('attendance') ? 'active' : ''}`}
                onClick={() => navigate('/attendance')}
              >
                Take Attendance
              </button>
            </>
          )}
          {user.role === 'student' && (
            <button
              className={`nav-link ${location.pathname === '/student' ? 'active' : ''}`}
              onClick={() => navigate('/student')}
            >
              My Dashboard
            </button>
          )}
        </div>

        <div className="navbar-right">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙'}
            style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginRight: '8px'
            }}
          >
            {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>

          <div className="user-chip">
            <div className="user-avatar-sm" style={{ background: user.role === 'superadmin' ? '#f59e0b' : user.role === 'admin' ? '#3b82f6' : undefined }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name-sm">{user.name?.split(' ')[0]}</span>
              <span className="user-role-sm">
                {user.role === 'superadmin' ? '👑 Main Admin' : user.role === 'admin' ? '🏢 College Admin' : user.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
              </span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
