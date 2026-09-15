import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { MOCK_SUBJECTS, MOCK_SESSIONS, MOCK_SECTIONS, MOCK_YEARS } from '../mockData';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { sessions } = useAttendance();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    department: 'CSE',
    year: '3rd Year',
    section: 'A',
    subject: MOCK_SUBJECTS[0],
    session: MOCK_SESSIONS[0],
    date: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStart = () => {
    navigate('/attendance', { state: { sessionInfo: form } });
  };

  const todaySessions = sessions.filter(s =>
    s.date === new Date().toISOString().split('T')[0]
  );

  const totalStudentsMarked = todaySessions.reduce((acc, s) => acc + s.attendance.length, 0);

  const stats = [
    { label: "Today's Sessions", value: todaySessions.length, icon: '📋', color: '#4f8ef7' },
    { label: 'Students Marked', value: totalStudentsMarked, icon: '✅', color: '#10b981' },
    { label: 'Subjects Covered', value: new Set(todaySessions.map(s => s.subject)).size, icon: '📚', color: '#8b5cf6' },
    { label: 'Avg Attendance', value: totalStudentsMarked > 0 ? `${Math.round((todaySessions.reduce((a, s) => a + s.attendance.filter(x => x.status === 'present').length, 0) / totalStudentsMarked) * 100)}%` : '—', icon: '📊', color: '#f59e0b' },
  ];

  return (
    <div className="teacher-dashboard page-wrapper">
      <div className="bg-mesh" />

      <div className="container">
        {/* Header */}
        <motion.div
          className="dash-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="dash-greeting">Good {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋</h1>
            <p className="dash-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="teacher-badge">
            <span>👨‍🏫</span>
            <div>
              <p className="badge-name">{user?.name}</p>
              <p className="badge-subject">{user?.subject} • {user?.department}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="stat-card glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Take Attendance Form */}
        <motion.div
          className="attendance-form-card glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="form-card-header">
            <div>
              <h2 className="form-card-title">📋 Take Attendance</h2>
              <p className="form-card-desc">Configure session details before marking attendance</p>
            </div>
          </div>

          <div className="att-form-grid">
            <div className="form-group">
              <label className="form-label">Department</label>
              <input name="department" value={form.department} onChange={handleChange} className="input-field" placeholder="e.g. CSE" />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select name="year" value={form.year} onChange={handleChange} className="input-field">
                {MOCK_YEARS.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Section</label>
              <select name="section" value={form.section} onChange={handleChange} className="input-field">
                {MOCK_SECTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select name="subject" value={form.subject} onChange={handleChange} className="input-field">
                {MOCK_SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Session</label>
              <select name="session" value={form.session} onChange={handleChange} className="input-field">
                {MOCK_SESSIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" />
            </div>
          </div>

          <button id="start-attendance-btn" className="btn-primary start-btn" onClick={handleStart}>
            🚀 Start Taking Attendance
          </button>
        </motion.div>

        {/* Recent sessions */}
        {todaySessions.length > 0 && (
          <motion.div
            className="recent-sessions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="section-title">Today's Sessions</h2>
            <div className="sessions-list">
              {todaySessions.map((session, i) => {
                const present = session.attendance.filter(a => a.status === 'present').length;
                const total = session.attendance.length;
                const pct = Math.round((present / total) * 100);
                return (
                  <div key={session.id} className="session-item glass-card">
                    <div className="session-left">
                      <span className="session-subject">{session.subject}</span>
                      <span className="session-meta">{session.session} • Section {session.section}</span>
                    </div>
                    <div className="session-right">
                      <span className="session-stat present-text">{present} Present</span>
                      <span className="session-stat absent-text">{total - present} Absent</span>
                      <span className={`session-pct ${pct >= 75 ? 'pct-good' : 'pct-low'}`}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
};

export default TeacherDashboard;
