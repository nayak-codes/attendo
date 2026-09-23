import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import { MOCK_SESSIONS, MOCK_YEARS } from '../mockData';
import './TeacherDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const addMinutes = (time, mins) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const buildTimelineMap = (config) => {
  const cfg = config || { startTime: '09:00', periodsPerDay: 7, periodDuration: 50, hasLunchBreak: true, lunchAfterPeriod: 4, lunchDuration: 45 };
  const map = {};
  let current = cfg.startTime || '09:00';
  for (let i = 1; i <= (cfg.periodsPerDay || 7); i++) {
    const end = addMinutes(current, cfg.periodDuration || 50);
    map[i] = { period: i, start: current, end, label: `Period ${i}` };
    current = end;
    if (cfg.hasLunchBreak && i === cfg.lunchAfterPeriod) {
      current = addMinutes(current, cfg.lunchDuration || 45);
    }
  }
  return map;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const TABS = [
  { id: 'home', icon: '🏠', label: 'Dashboard' },
  { id: 'timetable', icon: '🗓️', label: 'Timetable' },
  { id: 'attendance', icon: '📋', label: 'Mark Attendance' },
  { id: 'sessions', icon: '📊', label: 'Sessions' },
];

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { sessions, timetables, collegeConfig } = useAttendance();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const realDayName = dayNames[new Date().getDay()];
  const defaultDay = realDayName === 'Sunday' ? 'Monday' : realDayName;

  const [activeTab, setActiveTab] = useState('home');
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  // Derive assigned sections & subjects
  const assignedSections = useMemo(() => {
    if (user?.assignedSections?.length) return user.assignedSections;
    if (user?.sections?.length) return user.sections;
    if (user?.section) return Array.isArray(user.section) ? user.section : [user.section];
    return ['A', 'B'];
  }, [user]);

  const assignedSubjects = useMemo(() => {
    if (user?.assignedSubjects?.length) return user.assignedSubjects;
    if (user?.subject) return Array.isArray(user.subject) ? user.subject : [user.subject];
    return ['Operating Systems', 'Data Structures'];
  }, [user]);

  const [form, setForm] = useState({
    department: user?.department || 'CSE',
    year: '3rd Year',
    section: assignedSections[0] || 'A',
    subject: assignedSubjects[0] || '',
    session: MOCK_SESSIONS[0],
    date: today,
  });

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleStart = () => navigate('/attendance', { state: { sessionInfo: form } });

  const handleStartFromSlot = (slot) => {
    setForm(prev => ({
      ...prev,
      subject: slot.subject,
      section: slot.section,
      session: `${slot.periodLabel} (${slot.start}–${slot.end})`,
    }));
    setActiveTab('attendance');
  };

  // Build timetable from Firestore
  const timelineMap = buildTimelineMap(collegeConfig);

  const teacherSlotsByDay = useMemo(() => {
    const map = {};
    DAYS.forEach(d => { map[d] = []; });

    (timetables || []).forEach(tt => {
      const secName = tt.section || '—';
      const schedule = tt.schedule || {};
      DAYS.forEach(d => {
        (schedule[d] || []).forEach(cell => {
          const isMyClass = (
            (cell.teacherId && (cell.teacherId === user?.id || cell.teacherId === user?.uid)) ||
            (cell.teacherName && user?.name && cell.teacherName.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
            (user?.assignedSubjects?.includes(cell.subject))
          );
          if (isMyClass && cell.subject) {
            const timeInfo = timelineMap[cell.period] || { start: '09:00', end: '09:50', label: `Period ${cell.period}` };
            map[d].push({
              period: cell.period,
              periodLabel: timeInfo.label,
              start: timeInfo.start,
              end: timeInfo.end,
              subject: cell.subject,
              section: secName,
              teacherName: cell.teacherName || user?.name || '',
            });
          }
        });
      });
    });

    DAYS.forEach(d => { map[d].sort((a, b) => a.period - b.period); });
    return map;
  }, [timetables, collegeConfig, user]);

  const activeDaySlots = teacherSlotsByDay[selectedDay] || [];
  const todaySlots = teacherSlotsByDay[defaultDay] || [];

  // Live session stats
  const todaySessions = sessions.filter(s => s.date === today);
  const totalStudentsMarked = todaySessions.reduce((acc, s) => acc + (s.attendance?.length || 0), 0);
  const totalPresentToday = todaySessions.reduce((acc, s) => acc + (s.attendance?.filter(a => a.status === 'present').length || 0), 0);
  const avgPctToday = totalStudentsMarked > 0 ? Math.round((totalPresentToday / totalStudentsMarked) * 100) : 0;

  const statsData = [
    { label: "Today's Classes", value: todaySlots.length, icon: '🗓️', color: '#4f8ef7', glow: 'rgba(79,142,247,0.15)' },
    { label: 'Sessions Done', value: todaySessions.length, icon: '✅', color: '#10b981', glow: 'rgba(16,185,129,0.15)' },
    { label: 'Students Marked', value: totalStudentsMarked, icon: '👥', color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)' },
    { label: 'Avg Attendance', value: avgPctToday ? `${avgPctToday}%` : '—', icon: '📊', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  ];

  return (
    <div className="teacher-dashboard page-wrapper">
      <div className="bg-mesh" />

      <div className="tdc-container">

        {/* ── HERO BANNER ── */}
        <motion.div className="tdc-hero glass-card" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tdc-hero-left">
            <div className="tdc-live-chip">
              <span className="pulse-green" /> LIVE SYNC
            </div>
            <h1 className="tdc-greeting">
              {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Teacher'}</span> 👋
            </h1>
            <p className="tdc-subtext">
              {assignedSubjects.join(' • ')} &nbsp;|&nbsp; Dept. of {user?.department || 'CSE'}
            </p>
            <p className="tdc-date">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="tdc-hero-stats">
            {statsData.map((s, i) => (
              <motion.div
                key={s.label}
                className="tdc-stat-chip"
                style={{ background: s.glow, borderColor: s.color + '40' }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
              >
                <span className="tdc-stat-icon">{s.icon}</span>
                <span className="tdc-stat-val" style={{ color: s.color }}>{s.value}</span>
                <span className="tdc-stat-lbl">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── TABS ── */}
        <div className="tdc-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tdc-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══ HOME TAB ══ */}
          {activeTab === 'home' && (
            <motion.div key="home" className="tdc-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Today's Schedule Quick View */}
              <div className="tdc-section-header">
                <h2 className="tdc-section-title">📅 Today's Classes <span className="tdc-today-chip">{defaultDay}</span></h2>
                <button className="tdc-see-all" onClick={() => setActiveTab('timetable')}>Full Week →</button>
              </div>

              {todaySlots.length === 0 ? (
                <div className="tdc-empty glass-card">
                  <div className="tdc-empty-icon">☕</div>
                  <p>No classes assigned today in Admin Timetable.</p>
                  <p className="tdc-empty-sub">Your admin needs to assign subjects in the Timetable Builder.</p>
                </div>
              ) : (
                <div className="tdc-today-slots">
                  {todaySlots.map((slot, i) => (
                    <motion.div
                      key={i}
                      className="tdc-slot-card glass-card"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ y: -3 }}
                    >
                      <div className="tdc-slot-left">
                        <div className="tdc-period-badge">P{slot.period}</div>
                        <div className="tdc-slot-time">{slot.start} – {slot.end}</div>
                      </div>
                      <div className="tdc-slot-mid">
                        <div className="tdc-slot-subject">{slot.subject}</div>
                        <div className="tdc-slot-meta">
                          <span className="tdc-sec-chip">🏢 Sec {slot.section}</span>
                        </div>
                      </div>
                      <button className="tdc-slot-btn btn-primary" onClick={() => handleStartFromSlot(slot)}>
                        🚀 Start
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Today's completed sessions */}
              {todaySessions.length > 0 && (
                <>
                  <div className="tdc-section-header" style={{ marginTop: 28 }}>
                    <h2 className="tdc-section-title">✅ Completed Sessions Today</h2>
                    <button className="tdc-see-all" onClick={() => setActiveTab('sessions')}>View All →</button>
                  </div>
                  <div className="tdc-sessions-list">
                    {todaySessions.map((sess, i) => {
                      const present = sess.attendance?.filter(a => a.status === 'present').length || 0;
                      const total = sess.attendance?.length || 0;
                      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                      return (
                        <motion.div
                          key={sess.id}
                          className="tdc-sess-item glass-card"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className="tdc-sess-left">
                            <div className={`tdc-pct-ring ${pct >= 75 ? 'ring-good' : 'ring-low'}`}>{pct}%</div>
                            <div>
                              <div className="tdc-sess-subj">{sess.subject}</div>
                              <div className="tdc-sess-meta">{sess.session} • Sec {sess.section}</div>
                            </div>
                          </div>
                          <div className="tdc-sess-right">
                            <span className="tdc-sess-stat present">{present} Present</span>
                            <span className="tdc-sess-stat absent">{total - present} Absent</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ══ TIMETABLE TAB ══ */}
          {activeTab === 'timetable' && (
            <motion.div key="timetable" className="tdc-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="tdc-tt-card glass-card">
                <div className="tdc-tt-header">
                  <div>
                    <div className="tdc-live-chip"><span className="pulse-green" /> LIVE ADMIN TIMETABLE SYNC</div>
                    <h2 className="tdc-tt-title">🗓️ My Teaching Schedule</h2>
                    <p className="tdc-tt-sub">Assigned periods from College Timetable Builder</p>
                  </div>
                  <div className="tdc-day-pills">
                    {DAYS.map(day => (
                      <button
                        key={day}
                        className={`tdc-day-pill ${selectedDay === day ? 'active' : ''} ${defaultDay === day ? 'today' : ''}`}
                        onClick={() => setSelectedDay(day)}
                      >
                        {day.slice(0, 3)}
                        {defaultDay === day && <span className="today-dot">•</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tdc-slots-body">
                  {activeDaySlots.length === 0 ? (
                    <div className="tdc-empty">
                      <div className="tdc-empty-icon">☕</div>
                      <p>No classes assigned for <strong>{selectedDay}</strong>.</p>
                      <p className="tdc-empty-sub">Ask your admin to assign you in the Timetable Builder.</p>
                    </div>
                  ) : (
                    activeDaySlots.map((slot, i) => (
                      <motion.div
                        key={i}
                        className="tdc-slot-card glass-card"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ y: -2 }}
                      >
                        <div className="tdc-slot-left">
                          <div className="tdc-period-badge">P{slot.period}</div>
                          <div className="tdc-slot-time">{slot.start} – {slot.end}</div>
                        </div>
                        <div className="tdc-slot-mid">
                          <div className="tdc-slot-subject">{slot.subject}</div>
                          <div className="tdc-slot-meta">
                            <span className="tdc-sec-chip">🏢 Sec {slot.section}</span>
                            <span className="tdc-teacher-chip">👨‍🏫 {slot.teacherName}</span>
                          </div>
                        </div>
                        <button className="tdc-slot-btn btn-primary" onClick={() => handleStartFromSlot(slot)}>
                          🚀 Start Attendance
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ MARK ATTENDANCE TAB ══ */}
          {activeTab === 'attendance' && (
            <motion.div key="attendance" className="tdc-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="tdc-form-card glass-card">
                <div className="tdc-form-header">
                  <div>
                    <h2 className="tdc-form-title">📋 Configure Session</h2>
                    <p className="tdc-form-desc">Set session details before marking attendance</p>
                  </div>
                </div>

                <div className="tdc-form-grid">
                  <div className="tdc-form-group">
                    <label className="tdc-label">Department</label>
                    <input name="department" value={form.department} onChange={handleChange} className="input-field" placeholder="e.g. CSE" />
                  </div>
                  <div className="tdc-form-group">
                    <label className="tdc-label">Year</label>
                    <select name="year" value={form.year} onChange={handleChange} className="input-field">
                      {MOCK_YEARS.map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="tdc-form-group">
                    <label className="tdc-label">Section</label>
                    <select name="section" value={form.section} onChange={handleChange} className="input-field">
                      {assignedSections.map(s => <option key={s} value={s}>Section {s}</option>)}
                    </select>
                  </div>
                  <div className="tdc-form-group">
                    <label className="tdc-label">Subject</label>
                    <select name="subject" value={form.subject} onChange={handleChange} className="input-field">
                      {assignedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="tdc-form-group">
                    <label className="tdc-label">Session / Period</label>
                    <select name="session" value={form.session} onChange={handleChange} className="input-field">
                      {MOCK_SESSIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="tdc-form-group">
                    <label className="tdc-label">Date</label>
                    <input type="date" name="date" value={form.date} onChange={handleChange} className="input-field" />
                  </div>
                </div>

                <div className="tdc-form-preview">
                  <span className="tdc-preview-chip">📚 {form.subject || '—'}</span>
                  <span className="tdc-preview-chip">🏢 Sec {form.section}</span>
                  <span className="tdc-preview-chip">🏛️ {form.department}</span>
                  <span className="tdc-preview-chip">📅 {form.date}</span>
                </div>

                <button id="start-attendance-btn" className="btn-primary tdc-start-btn" onClick={handleStart}>
                  🚀 Launch Attendance — {form.subject || 'Select Subject'} (Sec {form.section})
                </button>
              </div>
            </motion.div>
          )}

          {/* ══ ALL SESSIONS TAB ══ */}
          {activeTab === 'sessions' && (
            <motion.div key="sessions" className="tdc-tab-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {sessions.length === 0 ? (
                <div className="tdc-empty glass-card">
                  <div className="tdc-empty-icon">📭</div>
                  <p>No sessions submitted yet today.</p>
                  <p className="tdc-empty-sub">Start marking attendance from the Timetable or Mark Attendance tab.</p>
                </div>
              ) : (
                <div className="tdc-sessions-list">
                  {[...sessions].reverse().map((sess, i) => {
                    const present = sess.attendance?.filter(a => a.status === 'present').length || 0;
                    const total = sess.attendance?.length || 0;
                    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                    return (
                      <motion.div
                        key={sess.id}
                        className="tdc-sess-item glass-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className="tdc-sess-left">
                          <div className={`tdc-pct-ring ${pct >= 75 ? 'ring-good' : 'ring-low'}`}>{pct}%</div>
                          <div>
                            <div className="tdc-sess-subj">{sess.subject}</div>
                            <div className="tdc-sess-meta">{sess.session} • Sec {sess.section} • {sess.date}</div>
                          </div>
                        </div>
                        <div className="tdc-sess-right">
                          <span className="tdc-sess-stat present">{present} Present</span>
                          <span className="tdc-sess-stat absent">{total - present} Absent</span>
                          <span className={`tdc-sess-badge ${pct >= 75 ? 'badge-good' : 'badge-low'}`}>{pct}%</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default TeacherDashboard;
