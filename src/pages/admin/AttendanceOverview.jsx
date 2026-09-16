import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, collection, query, where, getDocs, onSnapshot } from '../../firebase';
import './AttendanceOverview.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AttendanceOverview = ({ adminCollegeCode, sections }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, rate: 0 });

  useEffect(() => {
    if (!adminCollegeCode) return;
    setLoading(true);

    const q = query(
      collection(db, 'attendance'),
      where('collegeCode', '==', adminCollegeCode)
    );

    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAttendanceRecords(records);

      // Extract unique subjects
      const subjectSet = new Set();
      records.forEach(r => r.subject && subjectSet.add(r.subject));
      setSubjects(Array.from(subjectSet));

      setLoading(false);
    }, err => {
      console.warn('Attendance listener error:', err.message);
      setLoading(false);
    });
    return () => unsub();
  }, [adminCollegeCode]);

  // Filter records
  const filteredRecords = attendanceRecords.filter(r => {
    const matchSection = selectedSection === 'ALL' || r.section === selectedSection;
    const matchDate = !selectedDate || r.date === selectedDate;
    const matchSubject = selectedSubject === 'ALL' || r.subject === selectedSubject;
    return matchSection && matchDate && matchSubject;
  });

  // Compute stats from filtered records
  useEffect(() => {
    let totalStudents = 0;
    let presentCount = 0;
    filteredRecords.forEach(r => {
      const students = r.students || [];
      totalStudents += students.length;
      presentCount += students.filter(s => s.status === 'present').length;
    });
    const absent = totalStudents - presentCount;
    const rate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
    setStats({ total: totalStudents, present: presentCount, absent, rate });
  }, [filteredRecords]);

  // Export to CSV
  const exportToCSV = () => {
    const rows = [['Date', 'Section', 'Subject', 'Teacher', 'Student Name', 'Roll No', 'Status']];

    filteredRecords.forEach(record => {
      (record.students || []).forEach(student => {
        rows.push([
          record.date || '—',
          record.section || '—',
          record.subject || '—',
          record.teacherName || '—',
          student.name || '—',
          student.rollNo || student.collegeId || '—',
          student.status || 'absent',
        ]);
      });
    });

    const csvContent = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_${adminCollegeCode}_${selectedDate || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const uniqueSections = ['ALL', ...new Set(sections.map(s => s.displayName))];

  const getStatusColor = (rate) => {
    if (rate >= 75) return '#10b981';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="attendance-overview">
      {/* Header */}
      <div className="ao-header">
        <div>
          <h2 className="ao-title">📊 Attendance Overview</h2>
          <p className="ao-sub">Monitor attendance across all sections — filter by section, date, and subject</p>
        </div>
        <button className="btn-export-csv" onClick={exportToCSV} disabled={filteredRecords.length === 0}>
          📥 Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="ao-stats-grid">
        <div className="ao-stat-card" style={{ '--accent': '#60a5fa' }}>
          <div className="ao-stat-icon">📋</div>
          <div className="ao-stat-value">{filteredRecords.length}</div>
          <div className="ao-stat-label">Classes Recorded</div>
        </div>
        <div className="ao-stat-card" style={{ '--accent': '#10b981' }}>
          <div className="ao-stat-icon">✅</div>
          <div className="ao-stat-value">{stats.present}</div>
          <div className="ao-stat-label">Present</div>
        </div>
        <div className="ao-stat-card" style={{ '--accent': '#ef4444' }}>
          <div className="ao-stat-icon">❌</div>
          <div className="ao-stat-value">{stats.absent}</div>
          <div className="ao-stat-label">Absent</div>
        </div>
        <div className="ao-stat-card" style={{ '--accent': getStatusColor(stats.rate) }}>
          <div className="ao-stat-icon">📈</div>
          <div className="ao-stat-value" style={{ color: getStatusColor(stats.rate) }}>{stats.rate}%</div>
          <div className="ao-stat-label">Attendance Rate</div>
        </div>
      </div>

      {/* Filters */}
      <div className="ao-filters">
        <div className="ao-filter-group">
          <label>Section</label>
          <select
            className="ao-select"
            value={selectedSection}
            onChange={e => setSelectedSection(e.target.value)}
          >
            {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="ao-filter-group">
          <label>Subject</label>
          <select
            className="ao-select"
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
          >
            <option value="ALL">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="ao-filter-group">
          <label>Date</label>
          <input
            type="date"
            className="ao-select"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
        {selectedDate && (
          <button className="btn-clear-date" onClick={() => setSelectedDate('')}>✕ Clear Date</button>
        )}
      </div>

      {/* Records List */}
      {loading ? (
        <div className="ao-loading">Loading attendance records...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="ao-empty">
          <div className="ao-empty-icon">📊</div>
          <h3>No Attendance Records Found</h3>
          <p>Attendance records will appear here once teachers mark attendance using the mobile app.</p>
        </div>
      ) : (
        <div className="ao-records-list">
          {filteredRecords.map(record => {
            const students = record.students || [];
            const present = students.filter(s => s.status === 'present').length;
            const total = students.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            return (
              <motion.div
                key={record.id}
                className="ao-record-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="ao-record-top">
                  <div className="ao-record-info">
                    <div className="ao-record-main">
                      <span className="ao-section-badge">{record.section}</span>
                      <span className="ao-subject-name">{record.subject || 'No Subject'}</span>
                    </div>
                    <div className="ao-record-meta">
                      📅 {record.date || '—'} &nbsp;•&nbsp;
                      👨‍🏫 {record.teacherName || '—'} &nbsp;•&nbsp;
                      ⏰ {record.time || '—'}
                    </div>
                  </div>
                  <div className="ao-record-rate">
                    <div
                      className="ao-rate-circle"
                      style={{ '--rate-color': getStatusColor(rate) }}
                    >
                      <span className="ao-rate-value">{rate}%</span>
                    </div>
                    <div className="ao-rate-counts">
                      <span className="ao-present-count">✅ {present}</span>
                      <span className="ao-absent-count">❌ {total - present}</span>
                    </div>
                  </div>
                </div>

                {/* Student list */}
                {students.length > 0 && (
                  <div className="ao-student-chips">
                    {students.slice(0, 12).map((s, i) => (
                      <span
                        key={i}
                        className={`ao-student-chip ${s.status === 'present' ? 'present' : 'absent'}`}
                        title={s.name}
                      >
                        {s.rollNo || s.name?.split(' ')[0] || `S${i+1}`}
                      </span>
                    ))}
                    {students.length > 12 && (
                      <span className="ao-student-chip more">+{students.length - 12}</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceOverview;
