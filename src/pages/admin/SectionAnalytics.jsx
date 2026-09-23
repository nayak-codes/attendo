import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, collection, doc, query, where, onSnapshot } from '../../firebase';
import './SectionAnalytics.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SectionAnalytics = ({ section, adminCollegeCode, onClose, onAddFaculty, onViewTimetable, onNavigateTab }) => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'students' | 'subjects' | 'faculty' | 'timetable'
  const [searchStudent, setSearchStudent] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'critical' | 'warning' | 'good' | 'fresh'

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
      const filtered = records.filter(r =>
        r.section === section.displayName ||
        r.section === section.sectionLetter
      );
      setAttendance(filtered);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [section, adminCollegeCode]);

  // Load teachers assigned to this section
  useEffect(() => {
    if (!section || !adminCollegeCode) return;
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'teacher'),
      where('collegeCode', '==', adminCollegeCode)
    );
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const disp = section.displayName;
      const letter = section.sectionLetter;
      const dept = section.department;

      const assigned = all.filter(t => {
        const secs = t.assignedSections || [];
        if (secs.length === 0) return t.department === dept;
        return secs.some(s => s === disp || s === letter || s === `${dept}-${letter}` || s === 'ALL');
      });
      setTeachers(assigned);
    });
    return () => unsub();
  }, [section, adminCollegeCode]);

  // Load timetable for this section
  useEffect(() => {
    if (!section || !adminCollegeCode) return;
    const yearClean = (section.year || '').replace(/\s/g, '');
    const ttId = section.id || `${adminCollegeCode}_${section.department}_${yearClean}_${section.sectionLetter}`;

    const unsub = onSnapshot(doc(db, 'timetables', ttId), (snap) => {
      if (snap.exists() && snap.data()?.schedule) {
        setTimetable(snap.data().schedule || {});
      } else {
        setTimetable({});
      }
    });
    return () => unsub();
  }, [section, adminCollegeCode]);

  // Helper to resolve cell from array or object schedule format
  const getTimetableCell = (day, periodNum) => {
    if (!timetable) return null;
    if (Array.isArray(timetable[day])) {
      return timetable[day].find(c => c.period === periodNum || Number(c.period) === Number(periodNum)) || null;
    }
    return timetable[`${day}_${periodNum}`] || timetable[`${day}_P${periodNum}`] || null;
  };

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
  const freshBaseline = studentStats.filter(s => s.percentage === null);

  // Filtered student list
  const filteredStudentsList = studentStats.filter(st => {
    const matchSearch = (st.name || '').toLowerCase().includes(searchStudent.toLowerCase()) ||
      (st.rollNo || st.collegeId || '').toLowerCase().includes(searchStudent.toLowerCase());
    
    if (!matchSearch) return false;
    if (statusFilter === 'critical') return st.percentage !== null && st.percentage < 50;
    if (statusFilter === 'warning') return st.percentage !== null && st.percentage >= 50 && st.percentage < 75;
    if (statusFilter === 'good') return st.percentage !== null && st.percentage >= 75;
    if (statusFilter === 'fresh') return st.percentage === null;
    return true;
  });

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
    if (rate === null) return '#3b82f6';
    if (rate >= 75) return '#10b981';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getRateLabel = (rate) => {
    if (rate === null) return 'Fresh Baseline ✨';
    if (rate >= 75) return 'Good ✅';
    if (rate >= 50) return 'Warning ⚠️';
    return 'Critical 🚨';
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Helper for timetable periods
  const periodSlots = [1, 2, 3, 4, 5, 6, 7];

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
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="sa-panel-header" style={{ '--dept-color': getDeptColor(section.department) }}>
          <div className="sa-section-title-block">
            <div className="sa-header-top-row">
              <span className="sa-dept-pill" style={{ background: `${getDeptColor(section.department)}18`, color: getDeptColor(section.department), borderColor: `${getDeptColor(section.department)}40` }}>
                {section.department}
              </span>
              <span className="sa-year-pill">{section.year}</span>
              <span className="sa-count-pill">👥 {students.length} Enrolled</span>
            </div>
            <div className="sa-section-big-badge">Section {section.displayName}</div>
          </div>
          <button className="sa-close-btn" onClick={onClose} title="Close drawer">✕</button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="sa-quick-actions">
          <button
            className={`sa-action-btn ${activeView === 'overview' ? 'active-view' : ''}`}
            onClick={() => setActiveView('overview')}
          >
            <span className="sa-action-icon">📊</span>
            <span>Overview</span>
          </button>
          <button
            className={`sa-action-btn ${activeView === 'students' ? 'active-view' : ''}`}
            onClick={() => setActiveView('students')}
          >
            <span className="sa-action-icon">👥</span>
            <span>Students ({students.length})</span>
          </button>
          <button
            className={`sa-action-btn ${activeView === 'subjects' ? 'active-view' : ''}`}
            onClick={() => setActiveView('subjects')}
          >
            <span className="sa-action-icon">📚</span>
            <span>Subjects</span>
          </button>
          <button
            className={`sa-action-btn ${activeView === 'faculty' ? 'active-view' : ''}`}
            onClick={() => setActiveView('faculty')}
          >
            <span className="sa-action-icon">👨‍🏫</span>
            <span>Faculty ({teachers.length})</span>
          </button>
          <button
            className={`sa-action-btn ${activeView === 'timetable' ? 'active-view' : ''}`}
            onClick={() => setActiveView('timetable')}
          >
            <span className="sa-action-icon">📅</span>
            <span>Timetable</span>
          </button>
        </div>

        <div className="sa-panel-body">
          {loading ? (
            <div className="sa-loading">
              <div className="sa-spinner" />
              <span>Loading Section Analytics...</span>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeView === 'overview' && (
                <div className="sa-overview">
                  {/* Overall Attendance Card */}
                  <div className="sa-overall-card">
                    <div className="sa-overall-left">
                      <div className="sa-overall-label">OVERALL SECTION ATTENDANCE</div>
                      <div className="sa-overall-rate">
                        {overallRate !== null ? `${overallRate}%` : '0%'}
                      </div>
                      <div className="sa-overall-status" style={{ color: getRateColor(overallRate) }}>
                        {getRateLabel(overallRate)}
                      </div>
                      <div className="sa-overall-classes">
                        {attendance.length > 0
                          ? `${attendance.length} attendance sessions recorded`
                          : 'No attendance sessions recorded yet'}
                      </div>
                    </div>

                    <div className="sa-rate-donut">
                      <svg viewBox="0 0 36 36" width="72" height="72" className="donut-svg">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-subtle)" strokeWidth="3.2" />
                        {overallRate !== null && overallRate > 0 && (
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={getRateColor(overallRate)}
                            strokeWidth="3.2"
                            strokeDasharray={`${overallRate} ${100 - overallRate}`}
                            strokeDashoffset="25"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                      <div className="donut-label">{overallRate !== null ? `${overallRate}%` : '0%'}</div>
                    </div>
                  </div>

                  {/* Alert Cards Grid */}
                  <div className="sa-alert-cards">
                    <div
                      className={`sa-alert-card ${below50.length > 0 ? 'critical' : ''}`}
                      onClick={() => { setActiveView('students'); setStatusFilter('critical'); }}
                    >
                      <div className="sa-alert-icon">🚨</div>
                      <div className="sa-alert-num">{below50.length}</div>
                      <div className="sa-alert-lbl">Below 50%</div>
                      {below50.length > 0 && <div className="sa-alert-action">View & Alert →</div>}
                    </div>

                    <div
                      className={`sa-alert-card ${below75.length > 0 ? 'warning' : ''}`}
                      onClick={() => { setActiveView('students'); setStatusFilter('warning'); }}
                    >
                      <div className="sa-alert-icon">⚠️</div>
                      <div className="sa-alert-num">{below75.length}</div>
                      <div className="sa-alert-lbl">50–75% Risk</div>
                      {below75.length > 0 && <div className="sa-alert-action">View List →</div>}
                    </div>

                    <div
                      className="sa-alert-card good"
                      onClick={() => { setActiveView('students'); setStatusFilter('good'); }}
                    >
                      <div className="sa-alert-icon">✅</div>
                      <div className="sa-alert-num">{above75.length}</div>
                      <div className="sa-alert-lbl">Above 75%</div>
                    </div>
                  </div>

                  {/* Subject Summary */}
                  {subjectList.length > 0 ? (
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
                  ) : (
                    <div className="sa-no-data-card">
                      <div className="sa-no-data-icon">📱</div>
                      <div className="sa-no-data-title">Ready for Live Attendance</div>
                      <div className="sa-no-data-sub">
                        Faculty assigned to <strong>{section.displayName}</strong> can take attendance via the mobile app. Records will update here instantly in real-time.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STUDENTS TAB */}
              {activeView === 'students' && (
                <div className="sa-students-view">
                  <div className="sa-student-controls">
                    <div className="sa-search-input-wrap">
                      <span className="sa-search-icon">🔍</span>
                      <input
                        type="text"
                        className="sa-search-input"
                        placeholder="Search student by name or roll no..."
                        value={searchStudent}
                        onChange={e => setSearchStudent(e.target.value)}
                      />
                      {searchStudent && (
                        <button className="sa-search-clear" onClick={() => setSearchStudent('')}>✕</button>
                      )}
                    </div>

                    <div className="sa-filter-chips">
                      <button
                        className={`sa-filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                      >
                        All ({studentStats.length})
                      </button>
                      {below50.length > 0 && (
                        <button
                          className={`sa-filter-chip chip-critical ${statusFilter === 'critical' ? 'active' : ''}`}
                          onClick={() => setStatusFilter('critical')}
                        >
                          🚨 Critical ({below50.length})
                        </button>
                      )}
                      {below75.length > 0 && (
                        <button
                          className={`sa-filter-chip chip-warning ${statusFilter === 'warning' ? 'active' : ''}`}
                          onClick={() => setStatusFilter('warning')}
                        >
                          ⚠️ Risk ({below75.length})
                        </button>
                      )}
                      <button
                        className={`sa-filter-chip chip-fresh ${statusFilter === 'fresh' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('fresh')}
                      >
                        ✨ Fresh ({freshBaseline.length})
                      </button>
                    </div>
                  </div>

                  {below50.length > 0 && statusFilter === 'all' && (
                    <div className="sa-critical-banner">
                      🚨 <strong>{below50.length} students</strong> are below 50% attendance — Immediate follow-up recommended!
                    </div>
                  )}

                  <div className="sa-student-list">
                    {filteredStudentsList.length === 0 ? (
                      <div className="sa-no-data">
                        <div className="sa-no-data-icon">👨‍🎓</div>
                        <div>No matching students found</div>
                        <div className="sa-no-data-sub">Try changing your search term or status filter</div>
                      </div>
                    ) : (
                      filteredStudentsList.map(student => {
                        const pct = student.percentage;
                        const isCritical = pct !== null && pct < 50;
                        const isWarning = pct !== null && pct >= 50 && pct < 75;
                        const isGood = pct !== null && pct >= 75;
                        const isFresh = pct === null;

                        return (
                          <div
                            key={student.id}
                            className={`sa-student-card ${isCritical ? 'critical-card' : isWarning ? 'warning-card' : isGood ? 'good-card' : ''}`}
                          >
                            <div className="sa-student-left">
                              <div className="sa-student-avatar">
                                {getInitials(student.name)}
                              </div>
                              <div className="sa-student-info">
                                <div className="sa-student-name">
                                  <span>{student.name}</span>
                                  {isCritical && <span className="sa-badge-tag critical">CRITICAL</span>}
                                  {isWarning && <span className="sa-badge-tag warning">AT RISK</span>}
                                  {isFresh && <span className="sa-badge-tag fresh">FRESH</span>}
                                </div>
                                <div className="sa-student-meta-row">
                                  <span className="sa-roll-badge">{student.rollNo || student.collegeId}</span>
                                  <span className="sa-dot">•</span>
                                  <span className="sa-classes-count">
                                    {isFresh ? '0 Classes Marked' : `${student.presentCount}/${student.totalClasses} Present`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="sa-student-right">
                              {pct !== null ? (
                                <div className="sa-pct-block">
                                  <div className="sa-pct-value" style={{ color: getRateColor(pct) }}>
                                    {pct}%
                                  </div>
                                  <div className="sa-pct-bar-track">
                                    <div className="sa-pct-bar-fill" style={{ width: `${pct}%`, background: getRateColor(pct) }} />
                                  </div>
                                </div>
                              ) : (
                                <div className="sa-fresh-status">
                                  <span className="sa-fresh-pill">0% Baseline</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SUBJECTS TAB */}
              {activeView === 'subjects' && (
                <div className="sa-subjects-view">
                  {subjectList.length === 0 ? (
                    <div className="sa-no-data-card">
                      <div className="sa-no-data-icon">📚</div>
                      <div className="sa-no-data-title">No Subject Records Yet</div>
                      <div className="sa-no-data-sub">
                        Subject wise analytics will populate automatically as teachers submit attendance for Operating Systems, DBMS, Networks, etc.
                      </div>
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
                          {sub.classes} classes conducted • Avg {sub.avgPresent} students present
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* FACULTY TAB */}
              {activeView === 'faculty' && (
                <div className="sa-faculty-view">
                  <div className="sa-tab-header-row">
                    <div>
                      <h4 className="sa-tab-title">👨‍🏫 Faculty Assigned to {section.displayName}</h4>
                      <p className="sa-tab-sub">Teachers registered for {section.department} / {section.displayName}</p>
                    </div>
                    <button
                      className="btn-sa-edit-action"
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) onNavigateTab('teachers', section.displayName);
                      }}
                    >
                      ⚙️ Manage Faculty Roster →
                    </button>
                  </div>

                  {teachers.length === 0 ? (
                    <div className="sa-no-data-card">
                      <div className="sa-no-data-icon">👨‍🏫</div>
                      <div className="sa-no-data-title">No Faculty Assigned Yet</div>
                      <div className="sa-no-data-sub">
                        Go to the Faculty tab to assign teachers and subjects to section <strong>{section.displayName}</strong>.
                      </div>
                      <button
                        className="btn-sa-cta"
                        onClick={() => {
                          onClose();
                          if (onNavigateTab) onNavigateTab('teachers', section.displayName);
                        }}
                      >
                        ➕ Register / Assign Faculty Now
                      </button>
                    </div>
                  ) : (
                    <div className="sa-faculty-grid">
                      {teachers.map(t => {
                        const subjs = t.assignedSubjects?.length ? t.assignedSubjects : [t.subject || 'Operating Systems'];
                        const secs = t.assignedSections?.length ? t.assignedSections : ['A'];
                        return (
                          <div key={t.id} className="sa-faculty-card">
                            <div className="sa-faculty-card-top">
                              <div className="sa-faculty-avatar">
                                {t.name?.charAt(0) || 'T'}
                              </div>
                              <div className="sa-faculty-info">
                                <div className="sa-faculty-name">{t.name}</div>
                                <div className="sa-faculty-id">ID: <span>{t.collegeId}</span> | {t.department || section.department}</div>
                              </div>
                            </div>
                            <div className="sa-faculty-badges">
                              <div className="sa-badge-lbl">ASSIGNED SUBJECTS:</div>
                              <div className="sa-chips-row">
                                {subjs.map(sub => (
                                  <span key={sub} className="sa-chip-subj">📚 {sub}</span>
                                ))}
                              </div>
                              <div className="sa-badge-lbl" style={{ marginTop: 6 }}>SECTIONS:</div>
                              <div className="sa-chips-row">
                                {secs.map(s => (
                                  <span key={s} className="sa-chip-sec">Sec {s}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TIMETABLE TAB */}
              {activeView === 'timetable' && (
                <div className="sa-timetable-view">
                  <div className="sa-tab-header-row">
                    <div>
                      <h4 className="sa-tab-title">📅 Live Weekly Timetable — Section {section.displayName}</h4>
                      <p className="sa-tab-sub">Weekly schedule auto-synced to Mobile App for teachers and students</p>
                    </div>
                    <button
                      className="btn-sa-edit-action primary"
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) onNavigateTab('timetable', section.displayName);
                      }}
                    >
                      ✏️ Edit in Full Builder →
                    </button>
                  </div>

                  {/* Compact Interactive Schedule Grid */}
                  <div className="sa-tt-grid-wrapper">
                    <div className="sa-tt-grid">
                      <div className="sa-tt-cell sa-tt-corner">PERIOD</div>
                      {DAYS.map(day => (
                        <div key={day} className="sa-tt-cell sa-tt-day-header">{day.slice(0, 3).toUpperCase()}</div>
                      ))}

                      {periodSlots.map(period => (
                        <React.Fragment key={`p-${period}`}>
                          <div className="sa-tt-cell sa-tt-period-label">
                            P{period}
                          </div>
                          {DAYS.map(day => {
                            const cell = getTimetableCell(day, period);
                            return (
                              <div
                                key={`${day}-${period}`}
                                className={`sa-tt-cell sa-tt-data-cell ${cell ? 'has-schedule' : ''}`}
                                onClick={() => {
                                  onClose();
                                  if (onNavigateTab) onNavigateTab('timetable', section.displayName);
                                }}
                              >
                                {cell ? (
                                  <div className="sa-tt-cell-inner">
                                    <div className="sa-tt-sub-name">{cell.subject}</div>
                                    <div className="sa-tt-fac-name">{cell.teacherName || 'Faculty'}</div>
                                  </div>
                                ) : (
                                  <span className="sa-tt-empty-dash">—</span>
                                )}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
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
