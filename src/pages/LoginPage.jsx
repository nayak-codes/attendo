import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
  const { colleges, login } = useAuth();
  const [loginMode, setLoginMode] = useState('college'); // 'college' | 'superadmin'
  const [selectedCollegeCode, setSelectedCollegeCode] = useState('VJIT');
  const [role, setRole] = useState('student'); // 'teacher' | 'student' | 'admin'
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (loginMode === 'superadmin') {
      const result = await login('SUPERADMIN', password, 'superadmin');
      if (result.success) {
        navigate('/superadmin');
      } else {
        setError(result.error || 'Super Admin login failed');
      }
      setLoading(false);
      return;
    }

    if (!collegeId) {
      setError('Please enter your User / College ID');
      setLoading(false);
      return;
    }

    const result = await login(collegeId, password, role, selectedCollegeCode);
    if (result.success) {
      if (role === 'teacher') navigate('/teacher');
      else if (role === 'student') navigate('/student');
      else if (role === 'admin') navigate('/admin');
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const demoLogin = async (demoType) => {
    setLoading(true);
    setError('');

    if (demoType === 'superadmin') {
      setLoginMode('superadmin');
      const res = await login('SUPERADMIN', 'superadmin123', 'superadmin');
      if (res.success) navigate('/superadmin');
      else setError(res.error);
      setLoading(false);
      return;
    }

    setLoginMode('college');
    const creds = demoType === 'admin'
      ? { id: 'VJIT-ADMIN', pass: 'admin123', role: 'admin', college: 'VJIT' }
      : demoType === 'teacher'
      ? { id: 'VJIT-T-001', pass: 'teacher123', role: 'teacher', college: 'VJIT' }
      : { id: 'CE21001', pass: 'student123', role: 'student', college: 'VJIT' };

    setRole(creds.role);
    setSelectedCollegeCode(creds.college);
    setCollegeId(creds.id);
    setPassword(creds.pass);

    const result = await login(creds.id, creds.pass, creds.role, creds.college);
    if (result.success) {
      if (creds.role === 'admin') navigate('/admin');
      else if (creds.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } else setError(result.error || 'Demo login failed');
    setLoading(false);
  };

  const selectedColObj = colleges.find(c => c.code === selectedCollegeCode) || colleges[0];

  return (
    <div className="login-page">
      <div className="bg-mesh" />

      {/* Floating ambient light orbs */}
      <div className="login-orb orb-1" />
      <div className="login-orb orb-2" />
      <div className="login-orb orb-3" />

      <div className="login-wrapper">
        {/* Brand Header */}
        <motion.div
          className="login-brand"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <img src="/app-logo.png" alt="Knapsack Logo" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', marginBottom: 8 }} />
          <h1 className="login-title">Knap<span>sack</span></h1>
          <p className="login-subtitle">Multi-College Smart Attendance Cloud Platform</p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          className="login-card glass-card"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Mode Switcher Tabs */}
          <div className="mode-tabs">
            <button 
              type="button"
              className={`mode-tab ${loginMode === 'college' ? 'mode-active' : ''}`}
              onClick={() => { setLoginMode('college'); setError(''); }}
            >
              🏛️ College Portal
            </button>
            <button 
              type="button"
              className={`mode-tab ${loginMode === 'superadmin' ? 'mode-active super-active' : ''}`}
              onClick={() => { setLoginMode('superadmin'); setError(''); }}
            >
              👑 Main Super Admin
            </button>
          </div>

          <h2 className="card-heading">
            {loginMode === 'superadmin' ? 'Super Admin Portal 👑' : 'Welcome Back 👋'}
          </h2>
          <p className="card-desc">
            {loginMode === 'superadmin' 
              ? 'Access platform-wide college management & server provisioning'
              : 'Select your college and sign in to your dashboard'}
          </p>

          <form onSubmit={handleLogin} className="login-form">
            {loginMode === 'college' ? (
              <>
                {/* College Selection Dropdown */}
                <div className="form-group">
                  <label className="form-label">Select College Server</label>
                  <div className="college-select-wrapper">
                    <select
                      id="college-select"
                      className="input-field college-select"
                      value={selectedCollegeCode}
                      onChange={e => setSelectedCollegeCode(e.target.value)}
                    >
                      {colleges.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedColObj && (
                    <div className="college-info-chip">
                      <span>🟢 Server: <strong>{selectedColObj.code}</strong> Cloud Node</span>
                      <span>• {selectedColObj.city}</span>
                    </div>
                  )}
                </div>

                {/* Role Selector */}
                <div className="form-group">
                  <label className="form-label">Select Role</label>
                  <div className="role-selector role-selector-3">
                    <button
                      type="button"
                      className={`role-btn ${role === 'teacher' ? 'role-active' : ''}`}
                      onClick={() => { setRole('teacher'); setError(''); }}
                      id="role-teacher"
                    >
                      <span className="role-icon">👨‍🏫</span>
                      <span>Teacher</span>
                    </button>
                    <button
                      type="button"
                      className={`role-btn ${role === 'student' ? 'role-active' : ''}`}
                      onClick={() => { setRole('student'); setError(''); }}
                      id="role-student"
                    >
                      <span className="role-icon">👨‍🎓</span>
                      <span>Student</span>
                    </button>
                    <button
                      type="button"
                      className={`role-btn ${role === 'admin' ? 'role-active' : ''}`}
                      onClick={() => {
                        setRole('admin');
                        setCollegeId(`${selectedCollegeCode}-ADMIN`);
                        if (!password) setPassword('admin123');
                        setError('');
                      }}
                      id="role-admin"
                    >
                      <span className="role-icon">🏢</span>
                      <span>College Admin</span>
                    </button>
                  </div>
                </div>

                {/* College User ID */}
                <div className="form-group">
                  <label className="form-label">
                    {role === 'teacher'
                      ? 'Teacher ID / Employee Code'
                      : role === 'admin'
                      ? 'College Admin User ID'
                      : 'Student Roll Number / College ID'}
                  </label>
                  <input
                    id="college-id-input"
                    type="text"
                    className="input-field"
                    placeholder={
                      role === 'teacher'
                        ? 'e.g. VJIT-T-001'
                        : role === 'admin'
                        ? 'e.g. VJIT-ADMIN'
                        : 'e.g. CE21001'
                    }
                    value={collegeId}
                    onChange={e => setCollegeId(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              /* Super Admin Login Form */
              <div className="form-group">
                <label className="form-label">Master Admin User ID</label>
                <input
                  type="text"
                  className="input-field"
                  value="SUPERADMIN"
                  readOnly
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fbbf24', fontWeight: 'bold' }}
                />
              </div>
            )}

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-wrapper">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field password-input"
                  placeholder={loginMode === 'superadmin' ? 'Enter Super Admin Password' : 'Enter account password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="show-pass-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="error-msg"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="login-submit-btn"
              type="submit"
              className={`btn-primary login-btn ${loginMode === 'superadmin' ? 'super-login-btn' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="loading-dots">
                  <span /><span /><span />
                </span>
              ) : loginMode === 'superadmin' ? (
                '👑 Access Super Admin Portal'
              ) : (
                `Sign In as ${role === 'teacher' ? 'Teacher' : role === 'admin' ? 'College Admin' : 'Student'} (${selectedCollegeCode})`
              )}
            </button>
          </form>

          <div className="divider" />

          {/* Quick Demo Section */}
          <div className="demo-section">
            <p className="demo-label">🚀 One-Click Demo Logins</p>
            <div className="demo-btns">
              <button
                id="demo-teacher-btn"
                className="demo-btn"
                onClick={() => demoLogin('teacher')}
                disabled={loading}
              >
                👨‍🏫 Teacher
              </button>
              <button
                id="demo-student-btn"
                className="demo-btn"
                onClick={() => demoLogin('student')}
                disabled={loading}
              >
                👨‍🎓 Student
              </button>
              <button
                id="demo-superadmin-btn"
                className="demo-btn super-demo-btn"
                onClick={() => demoLogin('superadmin')}
                disabled={loading}
              >
                👑 Super Admin
              </button>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="login-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Multi-Tenant Engineering Platform • Dedicated College Cloud Servers
        </motion.p>
      </div>
    </div>
  );
};

export default LoginPage;
