import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from '../firebase';
import './CollegeAdminDashboard.css';

const DEFAULT_SECTIONS = ['A', 'B', 'C', 'D'];
const DEFAULT_SUBJECTS = [
  'Operating Systems',
  'DBMS',
  'Machine Learning',
  'Computer Networks',
  'Data Structures',
  'Web Development',
  'Python Programming',
  'Software Engineering',
];

function isUserBelongingToCollege(userDoc, targetCollegeCode) {
  if (!userDoc || !targetCollegeCode) return false;
  const target = targetCollegeCode.toUpperCase().trim();

  // 1. Explicit collegeCode check
  if (userDoc.collegeCode) {
    return userDoc.collegeCode.toUpperCase().trim() === target;
  }
  if (userDoc.selectedCollegeCode) {
    return userDoc.selectedCollegeCode.toUpperCase().trim() === target;
  }

  // 2. Check if ID starts with or contains the college code
  const idStr = String(userDoc.collegeId || userDoc.rollNo || userDoc.id || '').toUpperCase();
  if (idStr.startsWith(target) || idStr.includes(`${target}-`)) {
    return true;
  }

  // 3. Strict fallback: Sample default data (CE21001, VJIT-T-001, 24J41A05EZ) strictly belongs ONLY to VJIT
  if (target === 'VJIT' && (idStr.includes('VJIT') || idStr.startsWith('CE') || idStr.startsWith('24J') || idStr === 'S001' || idStr === 'S002' || idStr === 'T001' || idStr === 'T002')) {
    return true;
  }

  return false;
}

const CollegeAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' | 'students' | 'timetables'
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [assignModalTeacher, setAssignModalTeacher] = useState(null);

  // Form State: Add Teacher
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    collegeId: '',
    department: 'CSE',
    subject: 'Operating Systems',
    password: 'teacher123',
  });
  const [tSections, setTSections] = useState(['A']);
  const [tSubjects, setTSubjects] = useState(['Operating Systems']);

  // Form State: Add Student
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    department: 'CSE',
    section: 'A',
    year: '3rd Year',
    password: 'student123',
  });

  // Form State: Allocation Modal
  const [assignedSecs, setAssignedSecs] = useState([]);
  const [assignedSubjs, setAssignedSubjs] = useState([]);
  const [customSubjInput, setCustomSubjInput] = useState('');

  const adminCollegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';

  // Real-time Firestore Listeners (Filtered strictly by College)
  useEffect(() => {
    // Teachers listener
    const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = list.filter(t => isUserBelongingToCollege(t, adminCollegeCode));
      setTeachers(filtered);
    }, (err) => {
      console.warn('Teachers subscription fallback:', err.message);
    });

    // Students listener
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filtered = list.filter(s => isUserBelongingToCollege(s, adminCollegeCode));
      setStudents(filtered);
    }, (err) => {
      console.warn('Students subscription fallback:', err.message);
    });

    return () => {
      unsubTeachers();
      unsubStudents();
    };
  }, [adminCollegeCode]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Add New Teacher
  const handleAddTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!newTeacher.name.trim() || !newTeacher.collegeId.trim()) {
      alert('Please fill out Teacher Name and College ID');
      return;
    }
    setIsSubmitting(true);
    const teacherId = `T_${Date.now().toString().slice(-6)}`;
    const payload = {
      collegeId: newTeacher.collegeId.trim(),
      password: newTeacher.password.trim() || 'teacher123',
      name: newTeacher.name.trim(),
      role: 'teacher',
      department: newTeacher.department || 'CSE',
      subject: newTeacher.subject.trim(),
      collegeCode: adminCollegeCode,
      assignedSections: tSections,
      assignedSubjects: Array.from(new Set([newTeacher.subject.trim(), ...tSubjects])),
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', teacherId), payload);
      triggerToast(`🎉 Faculty "${payload.name}" registered for ${adminCollegeCode} & synced with Mobile App!`);
      setShowAddTeacherModal(false);
      setNewTeacher({ name: '', collegeId: '', department: 'CSE', subject: 'Operating Systems', password: 'teacher123' });
    } catch (err) {
      alert('Failed to add teacher: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Add New Student
  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.rollNo.trim()) {
      alert('Please fill out Student Name and Roll Number');
      return;
    }
    setIsSubmitting(true);
    const studentId = `S_${Date.now().toString().slice(-6)}`;
    const payload = {
      collegeId: newStudent.rollNo.trim(),
      rollNo: newStudent.rollNo.trim(),
      password: newStudent.password.trim() || 'student123',
      name: newStudent.name.trim(),
      role: 'student',
      department: newStudent.department || 'CSE',
      section: newStudent.section || 'A',
      year: newStudent.year || '3rd Year',
      collegeCode: adminCollegeCode,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', studentId), payload);
      await setDoc(doc(db, 'students', studentId), {
        name: payload.name,
        rollNo: payload.rollNo,
        department: payload.department,
        section: payload.section,
        year: payload.year,
        collegeCode: adminCollegeCode,
      });
      triggerToast(`🎓 Student "${payload.name}" enrolled for ${adminCollegeCode} & synced with Mobile App!`);
      setShowAddStudentModal(false);
      setNewStudent({ name: '', rollNo: '', department: 'CSE', section: 'A', year: '3rd Year', password: 'student123' });
    } catch (err) {
      alert('Failed to add student: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Delete User
  const handleDeleteUser = async (id, name, userRole) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the system?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
        if (userRole === 'student') {
          try { await deleteDoc(doc(db, 'students', id)); } catch (e) {}
        }
        triggerToast(`🗑️ Removed ${name}`);
      } catch (err) {
        alert('Failed to delete user: ' + err.message);
      }
    }
  };

  // Open Allocation Modal for Teacher
  const handleOpenAssignModal = (teacher) => {
    setAssignModalTeacher(teacher);
    setAssignedSecs(
      teacher.assignedSections && teacher.assignedSections.length > 0
        ? teacher.assignedSections
        : ['A']
    );
    setAssignedSubjs(
      teacher.assignedSubjects && teacher.assignedSubjects.length > 0
        ? teacher.assignedSubjects
        : [teacher.subject || 'Operating Systems']
    );
  };

  const handleToggleSection = (sec) => {
    setAssignedSecs((prev) =>
      prev.includes(sec) ? (prev.length > 1 ? prev.filter((s) => s !== sec) : prev) : [...prev, sec]
    );
  };

  const handleToggleSubject = (subj) => {
    setAssignedSubjs((prev) =>
      prev.includes(subj) ? (prev.length > 1 ? prev.filter((s) => s !== subj) : prev) : [...prev, subj]
    );
  };

  const handleAddCustomSubject = () => {
    if (customSubjInput.trim() && !assignedSubjs.includes(customSubjInput.trim())) {
      setAssignedSubjs((prev) => [...prev, customSubjInput.trim()]);
      setCustomSubjInput('');
    }
  };

  const handleSaveAssignmentsSubmit = async () => {
    if (!assignModalTeacher) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', assignModalTeacher.id), {
        assignedSections: assignedSecs,
        assignedSubjects: assignedSubjs,
      });
      triggerToast(`🎯 Updated section & subject allocations for ${assignModalTeacher.name}! Live synced to mobile.`);
      setAssignModalTeacher(null);
    } catch (err) {
      alert('Failed to update assignments: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Filtering
  const filteredTeachers = teachers.filter(
    (t) =>
      (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.collegeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.rollNo || s.collegeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = sectionFilter === 'ALL' || s.section === sectionFilter;
    return matchesSearch && matchesSection;
  });

  return (
    <div className="admin-web-page">
      <div className="admin-bg-mesh" />

      <div className="admin-web-container">
        {/* Top Header */}
        <header className="admin-web-header">
          <div>
            <div className="admin-web-badge">
              <span className="pulse-dot-green" />
              <span>COLLEGE ADMIN PORTAL • LIVE FIREBASE SYNC</span>
            </div>
            <h1 className="admin-web-title">
              College Operations <span>Management Hub</span>
            </h1>
            <p className="admin-web-subtitle">
              Manage Faculty registrations, Student roster, Section allocations, and Master Timetables directly synced to EduTrack Mobile App.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              className="btn-primary-add teacher-btn"
              onClick={() => setShowAddTeacherModal(true)}
            >
              <span>➕ Register Faculty</span>
            </button>

            <button
              className="btn-primary-add student-btn"
              onClick={() => setShowAddStudentModal(true)}
            >
              <span>👨‍🎓 Enroll Student</span>
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              className="toast-banner-web"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card blue-border">
            <div className="metric-icon">👨‍🏫</div>
            <div>
              <div className="metric-value">{teachers.length}</div>
              <div className="metric-label">Registered Faculty</div>
            </div>
          </div>

          <div className="metric-card purple-border">
            <div className="metric-icon">👨‍🎓</div>
            <div>
              <div className="metric-value">{students.length}</div>
              <div className="metric-label">Enrolled Students</div>
            </div>
          </div>

          <div className="metric-card green-border">
            <div className="metric-icon">🏢</div>
            <div>
              <div className="metric-value">4</div>
              <div className="metric-label">Active Sections (A, B, C, D)</div>
            </div>
          </div>

          <div className="metric-card gold-border">
            <div className="metric-icon">📲</div>
            <div>
              <div className="metric-value">Realtime</div>
              <div className="metric-label">Mobile App Live Sync</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Controls */}
        <div className="admin-nav-bar">
          <div className="tab-group">
            <button
              className={`nav-tab-btn ${activeTab === 'teachers' ? 'active' : ''}`}
              onClick={() => setActiveTab('teachers')}
            >
              👨‍🏫 Faculty Roster ({teachers.length})
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              👨‍🎓 Student Roster ({students.length})
            </button>
          </div>

          <div className="search-filter-group">
            {activeTab === 'students' && (
              <div className="section-select-wrapper">
                <span className="filter-label">Section:</span>
                {['ALL', 'A', 'B', 'C', 'D'].map((sec) => (
                  <button
                    key={sec}
                    className={`sec-filter-btn ${sectionFilter === sec ? 'active' : ''}`}
                    onClick={() => setSectionFilter(sec)}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            )}

            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="admin-search-input"
                placeholder={`Search ${activeTab === 'teachers' ? 'faculty name or ID' : 'student name or roll no'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TAB 1: TEACHERS / FACULTY ROSTER */}
        {activeTab === 'teachers' && (
          <div className="roster-grid">
            {filteredTeachers.length === 0 ? (
              <div className="empty-state">No faculty members found. Click "Register Faculty" to add.</div>
            ) : (
              filteredTeachers.map((t) => {
                const secs = t.assignedSections && t.assignedSections.length > 0 ? t.assignedSections : ['A'];
                const subjs = t.assignedSubjects && t.assignedSubjects.length > 0 ? t.assignedSubjects : [t.subject || 'Operating Systems'];
                return (
                  <div key={t.id} className="faculty-card">
                    <div className="faculty-card-top">
                      <div className="faculty-avatar">
                        {t.name ? t.name.charAt(0) : 'T'}
                      </div>
                      <div className="faculty-info">
                        <h3 className="faculty-name">{t.name}</h3>
                        <p className="faculty-sub">
                          ID: <span className="highlight-txt">{t.collegeId}</span> | Dept: {t.department || 'CSE'}
                        </p>
                      </div>
                      <button
                        className="btn-icon-delete"
                        onClick={() => handleDeleteUser(t.id, t.name, 'teacher')}
                        title="Delete Faculty"
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Assigned Badges */}
                    <div className="allocation-box">
                      <div className="box-title">ASSIGNED SECTIONS & SUBJECTS:</div>
                      <div className="badges-row">
                        {secs.map((s) => (
                          <span key={s} className="sec-badge">
                            Sec {s}
                          </span>
                        ))}
                        {subjs.map((sub) => (
                          <span key={sub} className="subj-badge">
                            📚 {sub}
                          </span>
                        ))}
                      </div>

                      <button
                        className="btn-assign-gear"
                        onClick={() => handleOpenAssignModal(t)}
                      >
                        ⚙️ Edit Section & Subject Allocations
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: STUDENTS ROSTER */}
        {activeTab === 'students' && (
          <div className="roster-grid">
            {filteredStudents.length === 0 ? (
              <div className="empty-state">No students found for this filter.</div>
            ) : (
              filteredStudents.map((s) => (
                <div key={s.id} className="student-card">
                  <div className="student-card-left">
                    <div className="student-avatar">{s.name ? s.name.charAt(0) : 'S'}</div>
                    <div>
                      <h4 className="student-name">{s.name}</h4>
                      <p className="student-sub">
                        Roll: <span className="highlight-txt">{s.rollNo || s.collegeId}</span> | Sec: <span className="sec-tag">{s.section || 'A'}</span>
                      </p>
                      <p className="student-meta">
                        Dept: {s.department || 'CSE'} • {s.year || '3rd Year'}
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn-icon-delete"
                    onClick={() => handleDeleteUser(s.id, s.name, 'student')}
                    title="Delete Student"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ADD TEACHER MODAL */}
        <AnimatePresence>
          {showAddTeacherModal && (
            <div className="modal-overlay">
              <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="modal-header">
                  <h2>👨‍🏫 Register New Faculty Member</h2>
                  <button className="close-btn" onClick={() => setShowAddTeacherModal(false)}>✕</button>
                </div>

                <form onSubmit={handleAddTeacherSubmit} className="modal-form">
                  <div className="form-group">
                    <label>Faculty Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Ramesh Kumar"
                      value={newTeacher.name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>College Faculty ID</label>
                      <input
                        type="text"
                        placeholder="e.g. VJIT-T-003"
                        value={newTeacher.collegeId}
                        onChange={(e) => setNewTeacher({ ...newTeacher, collegeId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        value={newTeacher.department}
                        onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Primary Assigned Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Operating Systems"
                      value={newTeacher.subject}
                      onChange={(e) => setNewTeacher({ ...newTeacher, subject: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="text"
                      placeholder="Default: teacher123"
                      value={newTeacher.password}
                      onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowAddTeacherModal(false)}>Cancel</button>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Registering...' : 'Register & Sync Mobile'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ADD STUDENT MODAL */}
        <AnimatePresence>
          {showAddStudentModal && (
            <div className="modal-overlay">
              <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="modal-header">
                  <h2>👨‍🎓 Enroll New Student</h2>
                  <button className="close-btn" onClick={() => setShowAddStudentModal(false)}>✕</button>
                </div>

                <form onSubmit={handleAddStudentSubmit} className="modal-form">
                  <div className="form-group">
                    <label>Student Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Rao"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Roll Number / College ID</label>
                      <input
                        type="text"
                        placeholder="e.g. CE21021"
                        value={newStudent.rollNo}
                        onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Section</label>
                      <select
                        className="modal-select"
                        value={newStudent.section}
                        onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                      >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                        <option value="D">Section D</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        value={newStudent.department}
                        onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Academic Year</label>
                      <input
                        type="text"
                        value={newStudent.year}
                        onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="text"
                      placeholder="Default: student123"
                      value={newStudent.password}
                      onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    />
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowAddStudentModal(false)}>Cancel</button>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Enrolling...' : 'Enroll & Sync Mobile'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ALLOCATE SECTION & SUBJECT MODAL */}
        <AnimatePresence>
          {assignModalTeacher && (
            <div className="modal-overlay">
              <motion.div className="modal-content wide-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="modal-header">
                  <h2>⚙️ Assign Sections & Subjects</h2>
                  <button className="close-btn" onClick={() => setAssignModalTeacher(null)}>✕</button>
                </div>

                <div className="modal-body-content">
                  <p className="modal-sub-txt">
                    Faculty: <strong className="txt-blue">{assignModalTeacher.name}</strong> ({assignModalTeacher.collegeId})
                  </p>

                  <div className="alloc-section">
                    <label className="section-label">Select Allowed Sections:</label>
                    <div className="chips-wrapper">
                      {DEFAULT_SECTIONS.map((sec) => {
                        const isSelected = assignedSecs.includes(sec);
                        return (
                          <button
                            key={sec}
                            type="button"
                            className={`chip-toggle ${isSelected ? 'sec-selected' : ''}`}
                            onClick={() => handleToggleSection(sec)}
                          >
                            {isSelected ? '✓ Section ' : 'Section '}
                            {sec}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="alloc-section">
                    <label className="section-label">Select Assigned Subjects:</label>
                    <div className="chips-wrapper">
                      {DEFAULT_SUBJECTS.map((subj) => {
                        const isSelected = assignedSubjs.includes(subj);
                        return (
                          <button
                            key={subj}
                            type="button"
                            className={`chip-toggle ${isSelected ? 'subj-selected' : ''}`}
                            onClick={() => handleToggleSubject(subj)}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {subj}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="alloc-section">
                    <label className="section-label">Add Custom Subject:</label>
                    <div className="custom-input-row">
                      <input
                        type="text"
                        className="modal-text-input"
                        placeholder="e.g. Artificial Intelligence"
                        value={customSubjInput}
                        onChange={(e) => setCustomSubjInput(e.target.value)}
                      />
                      <button type="button" className="btn-add-custom" onClick={handleAddCustomSubject}>
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="summary-box">
                    <span className="summary-lbl">ACTIVE ALLOCATION SUMMARY:</span>
                    <div>
                      <strong className="txt-blue">Sections:</strong> {assignedSecs.join(', ')}
                    </div>
                    <div>
                      <strong className="txt-purple">Subjects:</strong> {assignedSubjs.join(', ')}
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setAssignModalTeacher(null)}>
                      Cancel
                    </button>
                    <button type="button" className="btn-save-green" onClick={handleSaveAssignmentsSubmit} disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save & Live Sync Mobile App'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CollegeAdminDashboard;
