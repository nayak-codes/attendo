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
} from '../firebase';
import AttendanceOverview from './admin/AttendanceOverview';
import './CoordinatorDashboard.css';

const DEFAULT_SUBJECTS = [
  'Operating Systems', 'DBMS', 'Machine Learning', 'Computer Networks',
  'Data Structures', 'Web Development', 'Python Programming', 'Software Engineering',
];

function isUserBelongingToCollege(userDoc, targetCollegeCode) {
  if (!userDoc || !targetCollegeCode) return false;
  const target = targetCollegeCode.toUpperCase().trim();
  if (userDoc.collegeCode) return userDoc.collegeCode.toUpperCase().trim() === target;
  if (userDoc.selectedCollegeCode) return userDoc.selectedCollegeCode.toUpperCase().trim() === target;
  const idStr = String(userDoc.collegeId || userDoc.rollNo || userDoc.id || '').toUpperCase();
  if (idStr.startsWith(target) || idStr.includes(`${target}-`)) return true;
  if (target === 'VJIT' && (idStr.includes('VJIT') || idStr.startsWith('CE') || idStr.startsWith('24J') || idStr === 'S001' || idStr === 'S002' || idStr === 'T001' || idStr === 'T002')) return true;
  return false;
}

const TABS = [
  { id: 'teachers', label: '👨‍🏫 Dept. Faculty', shortLabel: 'Faculty' },
  { id: 'students', label: '👨‍🎓 Dept. Students', shortLabel: 'Students' },
  { id: 'attendance', label: '📊 Dept. Attendance', shortLabel: 'Attendance' },
];

const CoordinatorDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Department and College Code
  const dept = (user?.department || 'CSE').toUpperCase();
  const adminCollegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';

  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [assignModalTeacher, setAssignModalTeacher] = useState(null);
  const [editStudentModal, setEditStudentModal] = useState(null);

  // Form: Add Teacher
  const [newTeacher, setNewTeacher] = useState({
    name: '', collegeId: '', password: 'teacher123',
  });
  const [tSections, setTSections] = useState(['A']);
  const [tSubjects, setTSubjects] = useState(['Operating Systems']);
  const [customAddTeacherSubj, setCustomAddTeacherSubj] = useState('');

  // Form: Add Student
  const [newStudent, setNewStudent] = useState({
    name: '', rollNo: '', section: 'A', year: '3rd Year', password: 'student123',
  });

  // Allocation Modal
  const [assignedSecs, setAssignedSecs] = useState([]);
  const [assignedSubjs, setAssignedSubjs] = useState([]);
  const [customSubjInput, setCustomSubjInput] = useState('');

  // Real-time Firestore listeners
  useEffect(() => {
    // Teachers listener (filtered by college and department)
    const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const deptTeachers = list.filter(t => 
        isUserBelongingToCollege(t, adminCollegeCode) && 
        (t.department?.toUpperCase() === dept || !t.department)
      );
      setTeachers(deptTeachers);
    }, err => console.warn('Teachers listener:', err.message));

    // Students listener (filtered by college and department)
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const deptStudents = list.filter(s => 
        isUserBelongingToCollege(s, adminCollegeCode) && 
        (s.department?.toUpperCase() === dept || !s.department)
      );
      setStudents(deptStudents);
    }, err => console.warn('Students listener:', err.message));

    // Sections listener
    const qSections = query(collection(db, 'sections'), where('collegeCode', '==', adminCollegeCode));
    const unsubSections = onSnapshot(qSections, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const deptSections = list.filter(sec => !sec.department || sec.department.toUpperCase() === dept);
      setSections(deptSections);
    }, err => console.warn('Sections listener:', err.message));

    return () => { unsubTeachers(); unsubStudents(); unsubSections(); };
  }, [adminCollegeCode, dept]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const sectionOptions = sections.length > 0 ? sections.map(s => s.displayName) : ['A', 'B', 'C'];

  // Add Teacher Submit
  const handleAddTeacherSubmit = async (e) => {
    e.preventDefault();
    if (!newTeacher.name.trim() || !newTeacher.collegeId.trim()) {
      alert('Please fill out Teacher Name and College ID');
      return;
    }
    if (tSubjects.length === 0) {
      alert('Please select or add at least 1 subject for the faculty');
      return;
    }
    setIsSubmitting(true);
    const teacherId = `T_${Date.now().toString().slice(-6)}`;
    const finalSubjects = Array.from(new Set(tSubjects.filter(Boolean)));
    const payload = {
      collegeId: newTeacher.collegeId.trim(),
      password: newTeacher.password.trim() || 'teacher123',
      name: newTeacher.name.trim(),
      role: 'teacher',
      department: dept,
      subject: finalSubjects[0] || 'Operating Systems',
      collegeCode: adminCollegeCode,
      assignedSections: tSections.length ? tSections : ['A'],
      assignedSubjects: finalSubjects,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', teacherId), payload);
      triggerToast(`🎉 Faculty "${payload.name}" registered in ${dept} Department!`);
      setShowAddTeacherModal(false);
      setNewTeacher({ name: '', collegeId: '', password: 'teacher123' });
      setTSections(['A']);
      setTSubjects(['Operating Systems']);
      setCustomAddTeacherSubj('');
    } catch (err) {
      alert('Failed to add teacher: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Add Student Submit
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
      department: dept,
      section: newStudent.section || sectionOptions[0] || 'A',
      year: newStudent.year || '3rd Year',
      collegeCode: adminCollegeCode,
      createdAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', studentId), payload);
      await setDoc(doc(db, 'students', studentId), {
        name: payload.name, rollNo: payload.rollNo, department: payload.department,
        section: payload.section, year: payload.year, collegeCode: adminCollegeCode,
      });
      triggerToast(`🎓 Student "${payload.name}" enrolled in ${dept} Department!`);
      setShowAddStudentModal(false);
      setNewStudent({ name: '', rollNo: '', section: 'A', year: '3rd Year', password: 'student123' });
    } catch (err) {
      alert('Failed to add student: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Edit Student Submit
  const handleEditStudentSubmit = async () => {
    if (!editStudentModal) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', editStudentModal.id), {
        section: editStudentModal.section,
        year: editStudentModal.year,
        department: dept,
      });
      try {
        await updateDoc(doc(db, 'students', editStudentModal.id), {
          section: editStudentModal.section,
          year: editStudentModal.year,
          department: dept,
        });
      } catch (_) {}
      triggerToast(`✏️ ${editStudentModal.name}'s details updated!`);
      setEditStudentModal(null);
    } catch (err) {
      alert('Failed to update student: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Delete User
  const handleDeleteUser = async (id, name, userRole) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from ${dept} department?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
        if (userRole === 'student') {
          try { await deleteDoc(doc(db, 'students', id)); } catch (e) {}
        }
        triggerToast(`🗑️ Removed ${name}`);
      } catch (err) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  // Assign Modal
  const handleOpenAssignModal = (teacher) => {
    setAssignModalTeacher(teacher);
    setAssignedSecs(teacher.assignedSections?.length ? teacher.assignedSections : [sectionOptions[0] || 'A']);
    setAssignedSubjs(teacher.assignedSubjects?.length ? teacher.assignedSubjects : [teacher.subject || 'Operating Systems']);
  };

  const handleToggleSection = (sec) => {
    setAssignedSecs(prev => prev.includes(sec) ? (prev.length > 1 ? prev.filter(s => s !== sec) : prev) : [...prev, sec]);
  };
  const handleToggleSubject = (subj) => {
    setAssignedSubjs(prev => prev.includes(subj) ? (prev.length > 1 ? prev.filter(s => s !== subj) : prev) : [...prev, subj]);
  };

  const handleAddCustomSubject = () => {
    if (!customSubjInput.trim()) return;
    const clean = customSubjInput.trim();
    if (!assignedSubjs.includes(clean)) {
      setAssignedSubjs(prev => [...prev, clean]);
    }
    setCustomSubjInput('');
  };

  const handleSaveAllocations = async () => {
    if (!assignModalTeacher) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', assignModalTeacher.id), {
        assignedSections: assignedSecs,
        assignedSubjects: assignedSubjs,
        subject: assignedSubjs[0] || assignModalTeacher.subject || 'Operating Systems',
      });
      triggerToast(`⚙️ Updated allocations for ${assignModalTeacher.name}!`);
      setAssignModalTeacher(null);
    } catch (err) {
      alert('Failed to update allocations: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Filtered lists
  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.collegeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.collegeId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSec = sectionFilter === 'ALL' || s.section === sectionFilter;
    return matchesSearch && matchesSec;
  });

  return (
    <div className="coord-dashboard">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            className="toast-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <header className="coord-header">
        <div className="header-brand">
          <div className="brand-logo-glow">🏢</div>
          <div>
            <h1 className="header-title">
              {adminCollegeCode} • <span className="dept-highlight">{dept}</span> Department Coordinator
            </h1>
            <p className="header-subtitle">
              Managing Faculty, Students & Attendance for {dept} Branch
            </p>
          </div>
        </div>
        <div className="header-actions">
          <div className="user-badge">
            <span className="user-dot"></span>
            <span>{user?.name || `${dept} Coordinator`}</span>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign Out">
            🚪 Logout
          </button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="metrics-grid">
        <div className="metric-card" style={{ '--accent': '#3b82f6' }}>
          <div className="metric-icon">👨‍🏫</div>
          <div className="metric-data">
            <div className="metric-value">{teachers.length}</div>
            <div className="metric-label">{dept} Faculty Members</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--accent': '#10b981' }}>
          <div className="metric-icon">👨‍🎓</div>
          <div className="metric-data">
            <div className="metric-value">{students.length}</div>
            <div className="metric-label">{dept} Enrolled Students</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--accent': '#8b5cf6' }}>
          <div className="metric-icon">🏢</div>
          <div className="metric-data">
            <div className="metric-value">{sections.length || '3'}</div>
            <div className="metric-label">{dept} Active Sections</div>
          </div>
        </div>
        <div className="metric-card" style={{ '--accent': '#f59e0b' }}>
          <div className="metric-icon">⚡</div>
          <div className="metric-data">
            <div className="metric-value">Active</div>
            <div className="metric-label">Dept Status</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-bar">
        <div className="tabs-container">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            >
              <span className="tab-label-desktop">{tab.label}</span>
              <span className="tab-label-mobile">{tab.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content-area">
        {/* FACULTY TAB */}
        {activeTab === 'teachers' && (
          <div>
            <div className="tab-top-controls">
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={`Search ${dept} faculty by name or ID...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="btn-add-primary"
                onClick={() => setShowAddTeacherModal(true)}
              >
                ➕ Add {dept} Faculty
              </button>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👨‍🏫</div>
                <h3>No {dept} Faculty Registered</h3>
                <p>Click "Add {dept} Faculty" to register a new teacher for this department.</p>
              </div>
            ) : (
              <div className="roster-grid">
                {filteredTeachers.map(teacher => {
                  const assignedS = teacher.assignedSections?.length ? teacher.assignedSections : ['A'];
                  const assignedSub = teacher.assignedSubjects?.length ? teacher.assignedSubjects : [teacher.subject || 'Operating Systems'];

                  return (
                    <motion.div
                      key={teacher.id}
                      className="faculty-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="card-top-row">
                        <div className="faculty-avatar">
                          {teacher.name ? teacher.name.charAt(0).toUpperCase() : 'F'}
                        </div>
                        <div className="faculty-info">
                          <h3 className="faculty-name">{teacher.name}</h3>
                          <span className="faculty-id">ID: {teacher.collegeId || teacher.id}</span>
                        </div>
                        <button
                          className="btn-delete-icon"
                          onClick={() => handleDeleteUser(teacher.id, teacher.name, 'teacher')}
                          title="Remove Faculty"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="faculty-allocations">
                        <div className="alloc-group">
                          <span className="alloc-title">Sections:</span>
                          <div className="tag-flex">
                            {assignedS.map(s => (
                              <span key={s} className="tag-badge tag-sec">Sec {s}</span>
                            ))}
                          </div>
                        </div>

                        <div className="alloc-group">
                          <span className="alloc-title">Subjects:</span>
                          <div className="tag-flex">
                            {assignedSub.map(sub => (
                              <span key={sub} className="tag-badge tag-subj">{sub}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="card-footer-action">
                        <button
                          className="btn-assign-gear"
                          onClick={() => handleOpenAssignModal(teacher)}
                        >
                          ⚙️ Manage Sections & Subjects
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div>
            <div className="tab-top-controls">
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder={`Search ${dept} students by name or Roll No...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Section:</label>
                <select
                  className="filter-select"
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                >
                  <option value="ALL">All Sections</option>
                  {sectionOptions.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <button
                className="btn-add-primary"
                onClick={() => setShowAddStudentModal(true)}
              >
                🎓 Enroll {dept} Student
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👨‍🎓</div>
                <h3>No {dept} Students Found</h3>
                <p>Click "Enroll {dept} Student" to add students to this department.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Dept</th>
                      <th>Section</th>
                      <th>Year</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td><strong>{student.rollNo || student.collegeId}</strong></td>
                        <td>{student.name}</td>
                        <td><span className="dept-badge">{student.department || dept}</span></td>
                        <td><span className="sec-pill">Sec {student.section || 'A'}</span></td>
                        <td>{student.year || '3rd Year'}</td>
                        <td>
                          <div className="action-row">
                            <button
                              className="btn-action-edit"
                              onClick={() => setEditStudentModal({ ...student })}
                              title="Edit Details"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn-action-delete"
                              onClick={() => handleDeleteUser(student.id, student.name, 'student')}
                              title="Delete Student"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <AttendanceOverview
            adminCollegeCode={adminCollegeCode}
            sections={sections}
          />
        )}
      </div>

      {/* ── MODALS ── */}

      {/* ADD TEACHER MODAL */}
      <AnimatePresence>
        {showAddTeacherModal && (
          <div className="modal-overlay" onClick={() => setShowAddTeacherModal(false)}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>👨‍🏫 Register New {dept} Faculty</h2>
                <button className="close-btn" onClick={() => setShowAddTeacherModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddTeacherSubmit} className="modal-form">
                <div className="form-group">
                  <label>Faculty Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={newTeacher.name}
                    onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Faculty / Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder={`e.g. ${adminCollegeCode}-T-001`}
                    value={newTeacher.collegeId}
                    onChange={e => setNewTeacher({ ...newTeacher, collegeId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={dept}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="text"
                    required
                    value={newTeacher.password}
                    onChange={e => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Select Assigned Sections:</label>
                  <div className="checkbox-grid">
                    {sectionOptions.map(sec => (
                      <label key={sec} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={tSections.includes(sec)}
                          onChange={() => {
                            setTSections(prev =>
                              prev.includes(sec)
                                ? (prev.length > 1 ? prev.filter(s => s !== sec) : prev)
                                : [...prev, sec]
                            );
                          }}
                        />
                        Section {sec}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Select Assigned Subjects:</label>
                  <div className="checkbox-grid">
                    {DEFAULT_SUBJECTS.map(subj => (
                      <label key={subj} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={tSubjects.includes(subj)}
                          onChange={() => handleToggleAddTeacherSubject(subj)}
                        />
                        {subj}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Add Custom Subject</label>
                  <div className="custom-input-row">
                    <input
                      type="text"
                      placeholder="e.g. Cloud Computing"
                      value={customAddTeacherSubj}
                      onChange={e => setCustomAddTeacherSubj(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-add-custom"
                      onClick={handleAddCustomAddTeacherSubject}
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowAddTeacherModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : 'Register Faculty'}
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
          <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>🎓 Enroll New {dept} Student</h2>
                <button className="close-btn" onClick={() => setShowAddStudentModal(false)}>✕</button>
              </div>
              <form onSubmit={handleAddStudentSubmit} className="modal-form">
                <div className="form-group">
                  <label>Student Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ananya Sharma"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Roll Number / Student ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 21001"
                    value={newStudent.rollNo}
                    onChange={e => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={dept}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label>Assign Section</label>
                  <select
                    className="modal-select"
                    value={newStudent.section}
                    onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                  >
                    {sectionOptions.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Year of Study</label>
                  <select
                    className="modal-select"
                    value={newStudent.year}
                    onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="text"
                    required
                    value={newStudent.password}
                    onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowAddStudentModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save" disabled={isSubmitting}>
                    {isSubmitting ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT STUDENT MODAL */}
      <AnimatePresence>
        {editStudentModal && (
          <div className="modal-overlay" onClick={() => setEditStudentModal(null)}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>✏️ Edit Student Details</h2>
                <button className="close-btn" onClick={() => setEditStudentModal(null)}>✕</button>
              </div>
              <div className="modal-form">
                <div className="form-group">
                  <label>Student Name</label>
                  <input type="text" value={editStudentModal.name} disabled style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label>Roll Number</label>
                  <input type="text" value={editStudentModal.rollNo || editStudentModal.collegeId} disabled style={{ opacity: 0.7 }} />
                </div>
                <div className="form-group">
                  <label>Section</label>
                  <select
                    className="modal-select"
                    value={editStudentModal.section || 'A'}
                    onChange={e => setEditStudentModal({ ...editStudentModal, section: e.target.value })}
                  >
                    {sectionOptions.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <select
                    className="modal-select"
                    value={editStudentModal.year || '3rd Year'}
                    onChange={e => setEditStudentModal({ ...editStudentModal, year: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setEditStudentModal(null)}>Cancel</button>
                  <button className="btn-save" onClick={handleEditStudentSubmit} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANAGE ALLOCATIONS MODAL */}
      <AnimatePresence>
        {assignModalTeacher && (
          <div className="modal-overlay" onClick={() => setAssignModalTeacher(null)}>
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>⚙️ Manage Allocations for {assignModalTeacher.name}</h2>
                <button className="close-btn" onClick={() => setAssignModalTeacher(null)}>✕</button>
              </div>

              <div className="modal-form">
                <div className="form-group">
                  <label>Assigned Sections:</label>
                  <div className="checkbox-grid">
                    {sectionOptions.map(sec => (
                      <label key={sec} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={assignedSecs.includes(sec)}
                          onChange={() => handleToggleSection(sec)}
                        />
                        Section {sec}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Assigned Subjects:</label>
                  <div className="checkbox-grid">
                    {DEFAULT_SUBJECTS.map(subj => (
                      <label key={subj} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={assignedSubjs.includes(subj)}
                          onChange={() => handleToggleSubject(subj)}
                        />
                        {subj}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Add Custom Subject</label>
                  <div className="custom-input-row">
                    <input
                      type="text"
                      placeholder="e.g. Distributed Systems"
                      value={customSubjInput}
                      onChange={e => setCustomSubjInput(e.target.value)}
                    />
                    <button type="button" className="btn-add-custom" onClick={handleAddCustomSubject}>
                      ➕ Add
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setAssignModalTeacher(null)}>Cancel</button>
                  <button className="btn-save" onClick={handleSaveAllocations} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Allocations'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoordinatorDashboard;
