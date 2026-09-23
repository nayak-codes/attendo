import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import './StudentDashboard.css';

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
  const cfg = config || {
    startTime: '09:00',
    periodsPerDay: 7,
    periodDuration: 50,
    hasLunchBreak: true,
    lunchAfterPeriod: 4,
    lunchDuration: 45,
  };
  const map = {};
  let current = cfg.startTime || '09:00';
  for (let i = 1; i <= (cfg.periodsPerDay || 7); i++) {
    const end = addMinutes(current, cfg.periodDuration || 50);
    map[i] = { period: i, start: current, end, label: `Period ${i}` };
    current = end;
    if (cfg.hasLunchBreak && i === cfg.lunchAfterPeriod) {
      const lunchEnd = addMinutes(current, cfg.lunchDuration || 45);
      current = lunchEnd;
    }
  }
  return map;
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const {
    loading,
    attendanceRecords,
    notifications,
    timetables,
    collegeConfig,
    getStudentAttendance,
    markNotificationRead,
  } = useAttendance();

  const [activeTab, setActiveTab] = useState('overview');

  // Current day calculation
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const realDayName = dayNames[new Date().getDay()];
  const defaultDay = realDayName === 'Sunday' ? 'Monday' : realDayName;
  const [selectedTtDay, setSelectedTtDay] = useState(defaultDay);

  const rollNo = user?.rollNo || user?.collegeId || '';
  const studentSection = user?.section || 'A';

  // Find matching section timetable from Firestore live list
  const sectionTtDoc = timetables.find(tt => {
    if (!tt.section) return false;
    const sec = tt.section.toLowerCase().trim();
    const target = studentSection.toLowerCase().trim();
    return sec === target || sec.includes(target) || target.includes(sec);
  }) || timetables[0] || null;

  const timelineMap = buildTimelineMap(collegeConfig);

  const getDaySchedule = (dayName) => {
    if (!sectionTtDoc || !sectionTtDoc.schedule) return [];
    const dayCells = sectionTtDoc.schedule[dayName] || [];
    return dayCells
      .map(cell => {
        const timeInfo = timelineMap[cell.period] || { start: '09:00', end: '09:50', label: `Period ${cell.period}` };
        return {
          period: cell.period,
          periodLabel: timeInfo.label,
          start: timeInfo.start,
          end: timeInfo.end,
          subject: cell.subject,
          teacherName: cell.teacherName || '—',
        };
      })
      .sort((a, b) => a.period - b.period);
  };

  const todayScheduleSlots = getDaySchedule(defaultDay);
  const selectedDayScheduleSlots = getDaySchedule(selectedTtDay);

  // 100% Live Firestore data
  const subjectData = getStudentAttendance(rollNo);
  const subjects = Object.entries(subjectData);

  const totalClasses = subjects.reduce((a, [, v]) => a + v.total, 0);
  const totalAttended = subjects.reduce((a, [, v]) => a + v.attended, 0);
  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  const unreadNotifs = notifications.filter(n => !n.read);

  const getStatus = (pct) => {
    if (pct >= 85) return { label: 'Excellent', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
    if (pct >= 75) return { label: 'Good', color: '#4f8ef7', bg: 'rgba(79, 142, 247, 0.12)' };
    if (pct >= 65) return { label: 'Low', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
    return { label: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  };

  const overall = totalClasses > 0 ? getStatus(overallPct) : { label: 'No Data', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };

  // Recent sessions from live attendance records
  const recentRecords = attendanceRecords.slice(0, 8);

  const EmptyState = ({ icon, title, subtitle }) => (
    <div className="empty-state glass-card">
      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{icon}</div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{title}</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px' }}>{subtitle}</p>
    </div>
  );

  return (
    <div className="student-dashboard page-wrapper">
      <div className="bg-mesh" />

      <div className="container std-container">

        {/* Unread notification banners */}
        {unreadNotifs.slice(0, 2).map(notif => (
          <motion.div
            key={notif.id}
            className="notif-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => markNotificationRead(notif.id)}
          >
            <span>🔔</span>
            <span>{notif.message}</span>
            <button className="notif-dismiss">✕</button>
          </motion.div>
        ))}

        {/* Profile header */}
        <motion.div
          className="std-header glass-card"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="std-profile">
            <div className="std-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="std-profile-info">
              <h1 className="std-name">{user?.name || 'Student'}</h1>
              <div className="std-tags">
                <span className="std-tag">🎓 {rollNo || '—'}</span>
                <span className="std-tag">🏛️ {user?.department || 'CSE'} — {user?.year || '3rd Year'}</span>
                <span className="std-tag">📍 Section {user?.section || 'A'}</span>
              </div>
            </div>
            {unreadNotifs.length > 0 && (
              <div className="notif-bell-badge" onClick={() => setActiveTab('recent')}>
                🔔 <span className="bell-count">{unreadNotifs.length}</span>
              </div>
            )}
          </div>

          {/* Overall attendance */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading your attendance...</p>
            </div>
          ) : totalClasses === 0 ? (
            <div className="no-data-state">
              <span className="no-data-icon">📋</span>
              <p className="no-data-title">No Attendance Records Yet</p>
              <p className="no-data-sub">Your attendance stats will appear here once your teacher marks attendance.</p>
            </div>
          ) : (
            <div className="std-overall">
              <div className="overall-circle" style={{ '--pct': overallPct }}>
                <svg viewBox="0 0 120 120" className="circle-svg">
                  <circle cx="60" cy="60" r="50" className="circle-bg" />
                  <circle
                    cx="60" cy="60" r="50"
                    className="circle-progress"
                    style={{
                      strokeDashoffset: `${314 - (314 * overallPct) / 100}`,
                      stroke: overall.color
                    }}
                  />
                </svg>
                <div className="circle-content">
                  <span className="circle-pct" style={{ color: overall.color }}>{overallPct}%</span>
                  <span className="circle-label">Overall</span>
                </div>
              </div>
              <div className="overall-meta">
                <div className="overall-stat">
                  <span className="overall-stat-val">{totalAttended}</span>
                  <span className="overall-stat-label">Classes Attended</span>
                </div>
                <div className="overall-stat">
                  <span className="overall-stat-val">{totalClasses - totalAttended}</span>
                  <span className="overall-stat-label">Classes Missed</span>
                </div>
                <div className="overall-stat">
                  <span className="overall-stat-val">{totalClasses}</span>
                  <span className="overall-stat-label">Total Classes</span>
                </div>
                <div
                  className="status-pill"
                  style={{ background: overall.bg, color: overall.color, border: `1px solid ${overall.color}40` }}
                >
                  {overallPct >= 75 ? '✅' : '⚠️'} {overall.label}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Below 75% warning */}
        {!loading && totalClasses > 0 && overallPct < 75 && (
          <motion.div
            className="shortage-warning glass-card"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span>⚠️</span>
            <p>Attendance below 75%! Need <strong>{Math.ceil((0.75 * totalClasses - totalAttended) / 0.25)} more classes</strong> to reach 75%.</p>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="std-tabs">
          {['overview', 'timetable', 'subjects', 'recent'].map(tab => (
            <button
              key={tab}
              id={`tab-${tab}`}
              className={`std-tab ${activeTab === tab ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'timetable' && '📅 Timetable'}
              {tab === 'subjects' && '📚 Subjects'}
              {tab === 'recent' && `🕐 Recent${unreadNotifs.length > 0 ? ` (${unreadNotifs.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* ═══ Overview tab ═══ */}
        {activeTab === 'overview' && (
          <motion.div
            className="overview-tab-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* TODAY'S CLASSES WIDGET */}
            <div className="std-today-widget glass-card" style={{ marginBottom: 20 }}>
              <div className="today-widget-header">
                <div>
                  <span className="live-badge">● TODAY'S SCHEDULE ({defaultDay})</span>
                  <h3 className="widget-title">Classes for Section {studentSection}</h3>
                </div>
                <button className="btn-view-full-tt" onClick={() => setActiveTab('timetable')}>
                  View Full Week →
                </button>
              </div>

              {todayScheduleSlots.length === 0 ? (
                <p className="no-today-classes">☕ No classes scheduled for today in section timetable.</p>
              ) : (
                <div className="today-slots-row">
                  {todayScheduleSlots.map((slot, i) => (
                    <div key={i} className="today-slot-pill">
                      <div className="slot-period-num">P{slot.period}</div>
                      <div>
                        <div className="slot-sub-title">{slot.subject}</div>
                        <div className="slot-sub-time">{slot.start}–{slot.end} • {slot.teacherName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUBJECT CARDS */}
            <div className="subjects-grid">
              {loading ? null : subjects.length === 0 ? (
                <EmptyState
                  icon="📊"
                  title="No Subject Data"
                  subtitle="Subject-wise attendance will appear once your teacher marks attendance."
                />
              ) : (
                subjects.map(([subject, data], i) => {
                  const pct = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
                  const status = getStatus(pct);
                  const needed = pct < 75 ? Math.ceil((0.75 * data.total - data.attended) / 0.25) : 0;

                  return (
                    <motion.div
                      key={subject}
                      className="subject-card glass-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ y: -3 }}
                    >
                      <div className="subj-header">
                        <div className="subj-icon">📖</div>
                        <div className="subj-badge" style={{ background: status.bg, color: status.color }}>
                          {status.label}
                        </div>
                      </div>
                      <h3 className="subj-name">{subject}</h3>
                      <div className="subj-progress">
                        <div className="subj-progress-bar">
                          <motion.div
                            className="subj-progress-fill"
                            style={{ background: status.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.08 }}
                          />
                        </div>
                        <span className="subj-pct" style={{ color: status.color }}>{pct}%</span>
                      </div>
                      <div className="subj-stats">
                        <span className="subj-stat">{data.attended}/{data.total} classes</span>
                        {needed > 0 && <span className="subj-warning">Need {needed} more</span>}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ Timetable tab ═══ */}
        {activeTab === 'timetable' && (
          <motion.div className="std-timetable-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="std-tt-card glass-card">
              <div className="std-tt-header">
                <div>
                  <div className="tt-live-badge">
                    <span className="pulse-dot-green" /> REAL-TIME ADMIN SYNC
                  </div>
                  <h2>🗓️ Weekly Timetable — Section {studentSection}</h2>
                  <p className="std-tt-sub">Official schedule configured by College Admin</p>
                </div>
                <div className="std-day-pills">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      className={`std-day-btn ${selectedTtDay === day ? 'active' : ''} ${defaultDay === day ? 'is-today' : ''}`}
                      onClick={() => setSelectedTtDay(day)}
                    >
                      {day.slice(0, 3)}
                      {defaultDay === day && <span className="today-dot">•</span>}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDayScheduleSlots.length === 0 ? (
                <EmptyState
                  icon="☕"
                  title={`No Classes for ${selectedTtDay}`}
                  subtitle={`No timetable entries configured for Section ${studentSection} on ${selectedTtDay}.`}
                />
              ) : (
                <div className="std-tt-list">
                  {selectedDayScheduleSlots.map((slot, i) => (
                    <div key={i} className="std-tt-slot-card glass-card">
                      <div className="std-tt-time-col">
                        <span className="std-p-badge">P{slot.period}</span>
                        <span className="std-slot-time">{slot.start} – {slot.end}</span>
                      </div>
                      <div className="std-tt-main-col">
                        <h4 className="std-slot-subject">{slot.subject}</h4>
                        <p className="std-slot-teacher">👨‍🏫 Faculty: <strong>{slot.teacherName}</strong></p>
                      </div>
                      <div className="std-tt-status-col">
                        <span className="std-period-label">{slot.periodLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══ Subjects detail tab ═══ */}
        {activeTab === 'subjects' && (
          <motion.div className="subjects-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {subjects.length === 0 ? (
              <EmptyState
                icon="📚"
                title="No Subject Records"
                subtitle="Your subject-wise breakdown will appear after attendance is marked."
              />
            ) : (
              subjects.map(([subject, data], i) => {
                const pct = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
                const status = getStatus(pct);
                return (
                  <motion.div
                    key={subject}
                    className="subject-row glass-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <div className="subj-row-left">
                      <div className="subj-row-icon" style={{ background: status.bg, color: status.color }}>
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="subj-row-name">{subject}</h3>
                        <p className="subj-row-meta">{data.attended} attended / {data.total} total</p>
                      </div>
                    </div>
                    <div className="subj-row-right">
                      <div className="subj-row-bar">
                        <div className="subj-row-fill" style={{ width: `${pct}%`, background: status.color }} />
                      </div>
                      <span className="subj-row-pct" style={{ color: status.color }}>{pct}%</span>
                      <span className="subj-row-label" style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* ═══ Recent tab ═══ */}
        {activeTab === 'recent' && (
          <motion.div className="recent-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Notifications */}
            {notifications.length > 0 && (
              <div className="notifications-section">
                <h3 className="section-heading">🔔 Notifications</h3>
                {notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    className={`notif-item glass-card ${notif.read ? 'notif-read' : 'notif-unread'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => !notif.read && markNotificationRead(notif.id)}
                  >
                    <span className="notif-item-icon">🔔</span>
                    <div className="notif-item-body">
                      <p className="notif-item-msg">{notif.message}</p>
                      <p className="notif-item-time">{notif.date} {notif.session}</p>
                    </div>
                    {!notif.read && <span className="unread-dot" />}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Recent records */}
            <h3 className="section-heading">📋 Recent Sessions</h3>
            {recentRecords.length === 0 ? (
              <EmptyState
                icon="📭"
                title="No Recent Records"
                subtitle="Records will appear here after your teacher takes attendance."
              />
            ) : (
              recentRecords.map((rec, i) => {
                const isPresent = rec.status === 'present';
                return (
                  <motion.div
                    key={rec.id}
                    className={`recent-item glass-card ${isPresent ? 'recent-present' : 'recent-absent'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <div className="recent-left">
                      <span className={`recent-status-icon ${isPresent ? 'icon-present' : 'icon-absent'}`}>
                        {isPresent ? '✅' : '❌'}
                      </span>
                      <div>
                        <p className="recent-subject">{rec.subject}</p>
                        <p className="recent-meta">{rec.session} • {rec.date}</p>
                      </div>
                    </div>
                    <span className={`recent-badge ${isPresent ? 'badge-present' : 'badge-absent'}`}>
                      {isPresent ? 'PRESENT' : 'ABSENT'}
                    </span>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default StudentDashboard;
