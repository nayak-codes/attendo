import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_STUDENTS } from '../mockData';
import StudentCard from '../components/StudentCard';
import { useAttendance } from '../context/AttendanceContext';
import './AttendancePage.css';

const AttendancePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionInfo = location.state?.sessionInfo || {};

  const targetSection = (sessionInfo.section || 'A').toUpperCase();

  // Filter students matching selected section
  const sectionStudents = useMemo(() => {
    return MOCK_STUDENTS.filter(s => (s.section || 'A').toUpperCase() === targetSection);
  }, [targetSection]);

  // Initialize students in this section as PRESENT (default)
  const [attendance, setAttendance] = useState(() => {
    const init = {};
    sectionStudents.forEach(s => { init[s.id] = 'present'; });
    return init;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Toggle student status
  const toggleStudent = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }));
  };

  // Mark all present
  const markAllPresent = () => {
    const all = {};
    sectionStudents.forEach(s => { all[s.id] = 'present'; });
    setAttendance(all);
  };

  // Mark all absent
  const markAllAbsent = () => {
    const all = {};
    sectionStudents.forEach(s => { all[s.id] = 'absent'; });
    setAttendance(all);
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;
  const total = sectionStudents.length;
  const presentPct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return sectionStudents;
    const q = searchQuery.toLowerCase();
    return sectionStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    );
  }, [sectionStudents, searchQuery]);

  const handlePreview = () => setShowPreview(true);

  if (showPreview) {
    return <AttendancePreview
      sessionInfo={sessionInfo}
      attendance={attendance}
      students={sectionStudents}
      presentCount={presentCount}
      absentCount={absentCount}
      onBack={() => setShowPreview(false)}
      navigate={navigate}
    />;
  }

  return (
    <div className="attendance-page page-wrapper">
      <div className="bg-mesh" />

      {/* Session header */}
      <div className="att-header">
        <div className="container">
          <div className="att-header-inner">
            <div className="att-session-info">
              <button className="back-btn" onClick={() => navigate('/teacher')}>
                ← Back
              </button>
              <div>
                <h1 className="att-title">📋 Attendance — {sessionInfo.subject || 'Session'}</h1>
                <p className="att-meta">
                  {sessionInfo.department} • {sessionInfo.year} • Section {sessionInfo.section} • {sessionInfo.session} • {sessionInfo.date}
                </p>
              </div>
            </div>

            {/* Live counter bar */}
            <div className="live-counter">
              <div className="counter-item present-counter">
                <span className="counter-num">{presentCount}</span>
                <span className="counter-label">Present</span>
              </div>
              <div className="counter-divider" />
              <div className="counter-item absent-counter">
                <span className="counter-num">{absentCount}</span>
                <span className="counter-label">Absent</span>
              </div>
              <div className="counter-divider" />
              <div className="counter-item total-counter">
                <span className="counter-num">{total}</span>
                <span className="counter-label">Total</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="att-progress-bar-wrapper">
            <div className="att-progress-bar">
              <motion.div
                className="att-progress-fill"
                initial={{ width: '100%' }}
                animate={{ width: `${presentPct}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <span className="att-progress-label">{presentPct}% Present</span>
          </div>
        </div>
      </div>

      <div className="container att-body">
        {/* Controls */}
        <div className="att-controls">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              id="student-search"
              type="text"
              className="input-field search-input"
              placeholder="Search by name or roll no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bulk-actions">
            <button className="bulk-btn present-bulk" onClick={markAllPresent} id="mark-all-present">
              ✅ All Present
            </button>
            <button className="bulk-btn absent-bulk" onClick={markAllAbsent} id="mark-all-absent">
              ❌ All Absent
            </button>
          </div>
        </div>

        {/* Instruction */}
        <div className="att-instruction">
          <span className="pulse-dot green-pulse" />
          All students marked <strong>Present</strong> by default. Tap a card to mark <strong>Absent</strong>.
        </div>

        {/* Student grid */}
        <motion.div
          className="student-grid"
          layout
        >
          <AnimatePresence>
            {filteredStudents.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                status={attendance[student.id]}
                onToggle={toggleStudent}
                index={i}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredStudents.length === 0 && (
          <div className="no-results">
            <p>No students found for "{searchQuery}"</p>
          </div>
        )}

        {/* Preview button sticky */}
        <div className="preview-sticky">
          <div className="preview-summary">
            <span className="summary-chip present-chip">✅ {presentCount} Present</span>
            <span className="summary-chip absent-chip">❌ {absentCount} Absent</span>
          </div>
          <button
            id="preview-attendance-btn"
            className="btn-primary preview-btn"
            onClick={handlePreview}
          >
            👁️ Preview & Submit
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Preview & Submit Component ───────────────────────────
const AttendancePreview = ({ sessionInfo, attendance, students, presentCount, absentCount, onBack, navigate }) => {
  const { submitAttendance } = useAttendance();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const absentStudents = students.filter(s => attendance[s.id] === 'absent');
  const presentStudents = students.filter(s => attendance[s.id] === 'present');

  const handleSubmit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    submitAttendance({
      ...sessionInfo,
      attendance: students.map(s => ({
        studentId: s.id,
        name: s.name,
        rollNo: s.rollNo,
        status: attendance[s.id],
      })),
    });
    setSubmitted(true);
    setTimeout(() => navigate('/teacher'), 2500);
  };

  if (submitted) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="success-card glass-card"
          style={{ textAlign: 'center', padding: '48px 40px', maxWidth: '420px' }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>Attendance Submitted!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {presentCount} Present • {absentCount} Absent • Student dashboards updated!
          </p>
          <div style={{ width: '100%', height: '3px', background: 'var(--bg-card-hover)', borderRadius: '999px', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'var(--present-color)', borderRadius: '999px' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5 }}
            />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '10px' }}>Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="preview-page page-wrapper">
      <div className="bg-mesh" />
      <div className="container" style={{ paddingTop: '32px', paddingBottom: '60px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button className="back-btn" onClick={onBack} style={{ marginBottom: '20px' }}>← Edit Attendance</button>

          <h1 className="att-title">👁️ Preview Attendance</h1>
          <p className="att-meta" style={{ marginBottom: '24px' }}>
            {sessionInfo.subject} • {sessionInfo.date} • {sessionInfo.session}
          </p>

          {/* Summary cards */}
          <div className="preview-summary-grid">
            <div className="preview-stat-card present-stat">
              <div className="preview-stat-num">{presentCount}</div>
              <div className="preview-stat-label">✅ Present</div>
            </div>
            <div className="preview-stat-card absent-stat">
              <div className="preview-stat-num">{absentCount}</div>
              <div className="preview-stat-label">❌ Absent</div>
            </div>
            <div className="preview-stat-card">
              <div className="preview-stat-num">{Math.round((presentCount / students.length) * 100)}%</div>
              <div className="preview-stat-label">📊 Attendance</div>
            </div>
          </div>

          {/* Absent list */}
          {absentStudents.length > 0 && (
            <div className="preview-section glass-card" style={{ marginBottom: '16px' }}>
              <h3 className="preview-section-title absent-title">❌ Absent Students ({absentCount})</h3>
              <div className="preview-list">
                {absentStudents.map(s => (
                  <div key={s.id} className="preview-row absent-row">
                    <span className="preview-roll">{s.rollNo}</span>
                    <span className="preview-name">{s.name}</span>
                    <span className="preview-badge absent-badge">ABSENT</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Present list */}
          <div className="preview-section glass-card" style={{ marginBottom: '32px' }}>
            <h3 className="preview-section-title present-title">✅ Present Students ({presentCount})</h3>
            <div className="preview-list">
              {presentStudents.map(s => (
                <div key={s.id} className="preview-row">
                  <span className="preview-roll">{s.rollNo}</span>
                  <span className="preview-name">{s.name}</span>
                  <span className="preview-badge present-badge">PRESENT</span>
                </div>
              ))}
            </div>
          </div>

          <div className="preview-actions">
            <button className="btn-secondary" onClick={onBack}>← Edit</button>
            <button
              id="submit-attendance-btn"
              className="btn-primary submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <span className="loading-dots"><span /><span /><span /></span>
              ) : (
                '🚀 Submit Attendance'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AttendancePage;
