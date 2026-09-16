import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, collection, query, where, onSnapshot } from '../../firebase';
import './SectionAnalytics.css';

const SectionAnalytics = ({ section, adminCollegeCode, onClose, onAddFaculty, onViewTimetable }) => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'students' | 'subjects'

  // Load students in this section
  useEffect(() => {
    if (!section || !adminCollegeCode) return;
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('collegeCode', '==', adminCollegeCode)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter by this section (displayName like CSE-A OR section letter like A)
      const filtered = all.filter(s =>
        s.section === section.displayName ||
        s.section === section.sectionLetter ||
        (s.section === section.sectionLetter && s.department === section.department)
      );
      setStudents(filtered);
    });
    return () => unsub();
  }, [section, adminCollegeCode]);

  // Load attendance records for this section
  useEffect(() => {
    if (!section || !adminCollegeCode) return;
    const q = query(
      collection(db, 'attendance'),
      where('collegeCode', '==', adminCollegeCode)
    );
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter by section
      const filtered = records.filter(r =>
        r.section === section.displayName ||
        r.section === section.sectionLetter
      );
      setAttendance(filtered);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [section, adminCollegeCode]);

  // Compute per-student attendance stats
  const studentStats = students.map(student => {
    let totalClasses = 0;
    let presentCount = 0;

    attendance.forEach(record => {
      const studentEntry = (record.students || []).find(
        s => s.rollNo === student.rollNo ||
             s.rollNo === student.collegeId ||
             s.name === student.name
      );
      if (studentEntry !== undefined) {
        totalClasses++;
        if (studentEntry.status === 'present') presentCount++;
      }
    });

    const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : null;
    return { ...student, totalClasses, presentCount, percentage };
  });

  // Categorize students
  const below50 = studentStats.filter(s => s.percentage !== null && s.percentage < 50);
  const below75 = studentStats.filter(s => s.percentage !== null && s.percentage >= 50 && s.percentage < 75);
  const above75 = studentStats.filter(s => s.percentage !== null && s.percentage >= 75);
  const noData = studentStats.filter(s => s.percentage === null);

  // Subject-wise breakdown
  const subjectStats = {};
  attendance.forEach(record => {
    if (!record.subject) return;
    if (!subjectStats[record.subject]) {
      subjectStats[record.subject] = { total: 0, present: 0, classes: 0 };
    }
    const students = record.students || [];
    subjectStats[record.subject].classes++;
    subjectStats[record.subject].total += students.length;
    subjectStats[record.subject].present += students.filter(s => s.status === 'present').length;
  });

  const subjectList = Object.entries(subjectStats).map(([name, data]) => ({
    name,
    rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    classes: data.classes,
    avgPresent: data.classes > 0 ? Math.round(data.present / data.classes) : 0,
  })).sort((a, b) => a.rate - b.rate);

  // Overall section attendance rate
  let totalPresent = 0, totalAll = 0;
  attendance.forEach(r => {
    const st = r.students || [];
    totalAll += st.length;
    totalPresent += st.filter(s => s.status === 'present').length;
  });
  const overallRate = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : null;

  const getRateColor = (rate) => {
    if (rate === null) return '#6b7280';
    if (rate >= 75) return '#10b981';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getRateLabel = (rate) => {
    if (rate === null) return 'No Data';
    if (rate >= 75) return 'Good ✅';
    if (rate >= 50) return 'Warning ⚠️';
    return 'Critical 🚨';
  };

  return (
    <motion.div
      className="section-analytics-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="section-analytics-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="sa-panel-header" style={{ '--dept-color': getDeptColor(section.department) }}>
          <div className="sa-section-title-block">
            <div className="sa-section-big-badge">{section.displayName}</div>
            <div className="sa-section-meta">
              <span>{section.year}</span>
              <span>•</span>
              <span>{section.department}</span>
              <span>•</span>
              <span>{students.length} Students</span>
            </div>
          </div>
          <button className="sa-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Quick Action Buttons */}
        <div className="sa-quick-actions">
          <button className="sa-action-btn teacher-action" onClick={() => onAddFaculty(section)}>
            <span className="sa-action-icon">👨‍🏫</span>
            <span>Add Faculty</span>
          </button>
          <button className="sa-action-btn timetable-action" onClick={() => onViewTimetable(section)}>
            <span className="sa-action-icon">📅</span>
            <span>View Timetable</span>
          </button>
          <button
            className={`sa-action-btn view-action ${activeView === 'students' ? 'active-view' : ''}`}
            onClick={() => setActiveView(activeView === 'students' ? 'overview' : 'students')}
          >
            <span className="sa-action-icon">👥</span>
            <span>Students</span>
          </button>
          <button
            className={`sa-action-btn subject-action ${activeView === 'subjects' ? 'active-view' : ''}`}
            onClick={() => setActiveView(activeView === 'subjects' ? 'overview' : 'subjects')}
          >
            <span className="sa-action-icon">📚</span>
            <span>Subjects</span>
          </button>
        </div>

        <div className="sa-panel-body">
          {loading ? (
            <div className="sa-loading">Loading analytics...</div>
          ) : (
            <>
              {/* OVERVIEW */}
              {activeView === 'overview' && (
                <div className="sa-overview">
                  {/* Overall Rate */}
                  <div className="sa-overall-card" style={{ '--rate-color': getRateColor(overallRate) }}>
                    <div className="sa-overall-left">
                      <div className="sa-overall-label">OVERALL ATTENDANCE</div>
                      <div className="sa-overall-rate">
                        {overallRate !== null ? `${overallRate}%` : 'No Records Yet'}
                      </div>
                      <div className="sa-overall-status" style={{ color: getRateColor(overallRate) }}>
                        {getRateLabel(overallRate)}
                      </div>
                      <div className="sa-overall-classes">{attendance.length} classes recorded</div>
                    </div>
                    <div className="sa-rate-donut">
                      <svg viewBox="0 0 36 36" className="donut-svg">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none"
                          stroke={getRateColor(overallRate)}
                          strokeWidth="3"
                          strokeDasharray={`${overallRate || 0} ${100 - (overallRate || 0)}`}
                          strokeDashoffset="25"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="donut-label">{overallRate !== null ? `${overallRate}%` : '—'}</div>
                    </div>
                  </div>

                  {/* Alert Cards */}
                  <div className="sa-alert-cards">
                    {below50.length > 0 && (
                      <div className="sa-alert-card critical">
                        <div className="sa-alert-icon">🚨</div>
                        <div className="sa-alert-num">{below50.length}</div>
                        <div className="sa-alert-lbl">Students Below 50%</div>
                        <div className="sa-alert-action" onClick={() => setActiveView('students')}>View List →</div>
                      </div>
                    )}
                    {below75.length > 0 && (
                      <div className="sa-alert-card warning">
                        <div className="sa-alert-icon">⚠️</div>
                        <div className="sa-alert-num">{below75.length}</div>
                        <div className="sa-alert-lbl">Students 50–75%</div>
                        <div className="sa-alert-action" onClick={() => setActiveView('students')}>View List →</div>
                      </div>
                    )}
                    <div className="sa-alert-card good">
                      <div className="sa-alert-icon">✅</div>
                      <div className="sa-alert-num">{above75.length}</div>
                      <div className="sa-alert-lbl">Students Above 75%</div>
                    </div>
                  </div>

                  {/* Subject Summary (top 4) */}
                  {subjectList.length > 0 && (
                    <div className="sa-subjects-preview">
                      <div className="sa-section-label">SUBJECT ATTENDANCE RATES</div>
                      {subjectList.slice(0, 4).map(sub => (
                        <div key={sub.name} className="sa-subj-row">
                          <div className="sa-subj-name">{sub.name}</div>
                          <div className="sa-subj-bar-wrap">
                            <div
                              className="sa-subj-bar-fill"
                              style={{ width: `${sub.rate}%`, background: getRateColor(sub.rate) }}
                            />
                          </div>
                          <div className="sa-subj-rate" style={{ color: getRateColor(sub.rate) }}>
                            {sub.rate}%
                          </div>
                        </div>
                      ))}
                      {subjectList.length > 4 && (
                        <button className="sa-view-all-btn" onClick={() => setActiveView('subjects')}>
                          View all {subjectList.length} subjects →
                        </button>
                      )}
                    </div>
                  )}

                  {attendance.length === 0 && (
                    <div className="sa-no-data">
                      <div className="sa-no-data-icon">📊</div>
                      <div>No attendance records yet for {section.displayName}</div>
                      <div className="sa-no-data-sub">Records appear once teachers mark attendance on the mobile app</div>
                    </div>
                  )}
                </div>
              )}

              {/* STUDENTS LIST */}
              {activeView === 'students' && (
                <div className="sa-students-view">
                  {/* Critical Warning Banner */}
                  {below50.length > 0 && (
                    <div className="sa-critical-banner">
                      🚨 <strong>{below50.length} students</strong> are below 50% — Requires immediate attention!
                    </div>
                  )}

                  {/* Sort: critical first */}
                  {studentStats
                    .sort((a, b) => {
                      const pa = a.percentage ?? 999;
                      const pb = b.percentage ?? 999;
                      return pa - pb;
                    })
                    .map(student => {
                      const pct = student.percentage;
                      const isCritical = pct !== null && pct < 50;
                      const isWarning = pct !== null && pct >= 50 && pct < 75;
                      const isGood = pct !== null && pct >= 75;

                      return (
                        <div
                          key={student.id}
                          className={`sa-student-row ${isCritical ? 'critical-row' : isWarning ? 'warning-row' : isGood ? 'good-row' : ''}`}
                        >
                          <div className="sa-student-avatar">
                            {student.name?.charAt(0) || 'S'}
                          </div>
                          <div className="sa-student-info">
                            <div className="sa-student-name">
                              {student.name}
                              {isCritical && <span className="sa-critical-tag">CRITICAL</span>}
                              {isWarning && <span className="sa-warning-tag">AT RISK</span>}
                            </div>
                            <div className="sa-student-roll">
                              {student.rollNo || student.collegeId} • {student.totalClasses} classes
                            </div>
                          </div>
                          <div className="sa-student-pct" style={{ color: getRateColor(pct) }}>
                            {pct !== null ? `${pct}%` : 'No data'}
                          </div>
                        </div>
                      );
                    })
                  }

                  {students.length === 0 && (
                    <div className="sa-no-data">
                      <div>No students enrolled in {section.displayName}</div>
                      <div className="sa-no-data-sub">Go to Students tab to enroll students in this section</div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBJECTS VIEW */}
              {activeView === 'subjects' && (
                <div className="sa-subjects-view">
                  {subjectList.length === 0 ? (
                    <div className="sa-no-data">
                      <div className="sa-no-data-icon">📚</div>
                      <div>No subject attendance data yet</div>
                    </div>
                  ) : (
                    subjectList.map(sub => (
                      <div key={sub.name} className="sa-subject-card">
                        <div className="sa-subj-card-top">
                          <div className="sa-subj-card-name">{sub.name}</div>
                          <div className="sa-subj-card-rate" style={{ color: getRateColor(sub.rate) }}>
                            {sub.rate}%
                          </div>
                        </div>
                        <div className="sa-subj-full-bar">
                          <div
                            className="sa-subj-full-fill"
                            style={{ width: `${sub.rate}%`, background: getRateColor(sub.rate) }}
                          />
                        </div>
                        <div className="sa-subj-card-meta">
                          {sub.classes} classes • Avg {sub.avgPresent} present
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const getDeptColor = (dept) => {
  const colors = {
    CSE: '#3b82f6', CSD: '#8b5cf6', CSM: '#06b6d4',
    ECE: '#f59e0b', EEE: '#10b981', MECH: '#ef4444',
    CIVIL: '#84cc16', IT: '#f97316'
  };
  return colors[dept] || '#3b82f6';
};

export default SectionAnalytics;
