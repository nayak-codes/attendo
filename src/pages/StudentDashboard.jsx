import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAttendance } from '../context/AttendanceContext';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user } = useAuth();
  const {
    loading,
    attendanceRecords,
    notifications,
    getStudentAttendance,
    markNotificationRead,
    sessions,
  } = useAttendance();

  const [activeTab, setActiveTab] = useState('overview');

  const rollNo = user?.rollNo || user?.collegeId || '';

  // 100% Live Firestore data — zero mock
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
          {['overview', 'subjects', 'recent'].map(tab => (
            <button
              key={tab}
              id={`tab-${tab}`}
              className={`std-tab ${activeTab === tab ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'subjects' && '📚 Subjects'}
              {tab === 'recent' && `🕐 Recent${unreadNotifs.length > 0 ? ` (${unreadNotifs.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* ═══ Overview tab ═══ */}
        {activeTab === 'overview' && (
          <motion.div
            className="subjects-grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
