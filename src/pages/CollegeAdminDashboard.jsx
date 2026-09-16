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
import SectionManager from './admin/SectionManager';
import TimetableBuilder from './admin/TimetableBuilder';
import AttendanceOverview from './admin/AttendanceOverview';
import './CollegeAdminDashboard.css';

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
  { id: 'sections', label: '🏢 Sections', shortLabel: 'Sections' },
  { id: 'timetable', label: '📅 Timetable', shortLabel: 'Timetable' },
  { id: 'teachers', label: '👨‍🏫 Faculty', shortLabel: 'Faculty' },
  { id: 'students', label: '👨‍🎓 Students', shortLabel: 'Students' },
  { id: 'attendance', label: '📊 Attendance', shortLabel: 'Attendance' },
];

const CollegeAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('sections');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [assignModalTeacher, setAssignModalTeacher] = useState(null);
  const [editStudentModal, setEditStudentModal] = useState(null);

  // Form: Add Teacher
  const [newTeacher, setNewTeacher] = useState({
    name: '', collegeId: '', department: 'CSE', subject: 'Operating Systems', password: 'teacher123',
  });
  const [tSections, setTSections] = useState(['A']);
  const [tSubjects, setTSubjects] = useState(['Operating Systems']);

  // Form: Add Student
  const [newStudent, setNewStudent] = useState({
    name: '', rollNo: '', department: 'CSE', section: '', year: '3rd Year', password: 'student123',
  });

  // Allocation Modal
  const [assignedSecs, setAssignedSecs] = useState([]);
  const [assignedSubjs, setAssignedSubjs] = useState([]);
  const [customSubjInput, setCustomSubjInput] = useState('');

  const adminCollegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';

  // Real-time Firestore listeners
  useEffect(() => {
    const qTeachers = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsubTeachers = onSnapshot(qTeachers, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeachers(list.filter(t => isUserBelongingToCollege(t, adminCollegeCode)));
    }, err => console.warn('Teachers listener:', err.message));

    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(list.filter(s => isUserBelongingToCollege(s, adminCollegeCode)));
    }, err => console.warn('Students listener:', err.message));

    return () => { unsubTeachers(); unsubStudents(); };
  }, [adminCollegeCode]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Compute section options from dynamic sections
  const sectionOptions = sections.map(s => s.displayName);

  // Add Teacher
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
      triggerToast(`🎉 Faculty "${payload.name}" registered & synced with Mobile App!`);
      setShowAddTeacherModal(false);
      setNewTeacher({ name: '', collegeId: '', department: 'CSE', subject: 'Operating Systems', password: 'teacher123' });
      setTSections(['A']);
    } catch (err) {
      alert('Failed to add teacher: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Add Student
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
      triggerToast(`🎓 Student "${payload.name}" enrolled & synced with Mobile App!`);
      setShowAddStudentModal(false);
      setNewStudent({ name: '', rollNo: '', department: 'CSE', section: '', year: '3rd Year', password: 'student123' });
    } catch (err) {
      alert('Failed to add student: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Edit Student
  const handleEditStudentSubmit = async () => {
    if (!editStudentModal) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', editStudentModal.id), {
        section: editStudentModal.section,
        year: editStudentModal.year,
        department: editStudentModal.department,
      });
      try {
        await updateDoc(doc(db, 'students', editStudentModal.id), {
          section: editStudentModal.section,
          year: editStudentModal.year,
          department: editStudentModal.department,
        });
      } catch (_) {}
      triggerToast(`✏️ ${editStudentModal.name}'s details updated!`);
      setEditStudentModal(null);
    } catch (err) {
      alert('Failed to update student: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Delete
  const handleDeleteUser = async (id, name, userRole) => {
    if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
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

  // Assign modal
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
    if (customSubjInput.trim() && !assignedSubjs.includes(customSubjInput.trim())) {
      setAssignedSubjs(prev => [...prev, customSubjInput.trim()]);
      setCustomSubjInput('');
    }
  };

  const handleSaveAssignmentsSubmit = async () => {
    if (!assignModalTeacher) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', assignModalTeacher.id), {
        assignedSections: assignedSecs, assignedSubjects: assignedSubjs,
      });
      triggerToast(`🎯 Updated allocations for ${assignModalTeacher.name}!`);
      setAssignModalTeacher(null);
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Filtering
  const filteredTeachers = teachers.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.collegeId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudents = students.filter(s => {
    const matchSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.rollNo || s.collegeId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSection = sectionFilter === 'ALL' || s.section === sectionFilter;
    return matchSearch && matchSection;
  });

  // All unique sections from dynamic sections + students
  const dynamicSectionLabels = sections.map(s => s.displayName);
  const studentSections = [...new Set(students.map(s => s.section).filter(Boolean))];
  const allSectionOptions = [...new Set([...dynamicSectionLabels, ...studentSections])];

  return (
    <div className="admin-web-page">
      <div className="admin-bg-mesh" />
      <div className="admin-web-container">

        {/* Top Header */}
        <header className="admin-web-header">
          <div>
            <div className="admin-web-badge">
              <span className="pulse-dot-green" />
              <span>COLLEGE ADMIN PORTAL • {adminCollegeCode} • LIVE FIREBASE SYNC</span>
            </div>
            <h1 className="admin-web-title">
              College Operations <span>Management Hub</span>
            </h1>
            <p className="admin-web-subtitle">
              Manage Sections, Timetables, Faculty & Students — all synced to Mobile App in real-time.
            </p>
          </div>
          <div className="admin-header-actions">
            {activeTab === 'teachers' && (
              <button className="btn-primary-add teacher-btn" onClick={() => setShowAddTeacherModal(true)}>
                ➕ Register Faculty
              </button>
            )}
            {activeTab === 'students' && (
              <button className="btn-primary-add student-btn" onClick={() => setShowAddStudentModal(true)}>
                👨‍🎓 Enroll Student
              </button>
            )}
            <button className="btn-logout" onClick={logout}>🚪 Logout</button>
          </div>
        </header>

        {/* Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div className="toast-banner-web" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics */}
        <div className="metrics-grid">
          <div className="metric-card green-border">
            <div className="metric-icon">🏢</div>
            <div>
              <div className="metric-value">{sections.length}</div>
              <div className="metric-label">Active Sections</div>
            </div>
          </div>
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
          <div className="metric-card gold-border">
            <div className="metric-icon">📲</div>
            <div>
              <div className="metric-value">Realtime</div>
              <div className="metric-label">Mobile Sync Active</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="admin-nav-bar">
          <div className="tab-group">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setSectionFilter('ALL'); }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search (only for faculty/students) */}
          {(activeTab === 'teachers' || activeTab === 'students') && (
            <div className="search-filter-group">
              {activeTab === 'students' && (
                <div className="section-select-wrapper">
                  <span className="filter-label">Section:</span>
                  {['ALL', ...allSectionOptions].map(sec => (
                    <button
                      key={sec}
                      className={`sec-filter-btn ${sectionFilter === sec ? 'active' : ''}`}
                      onClick={() => setSectionFilter(sec)}
                    >{sec}</button>
                  ))}
                </div>
              )}
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder={`Search ${activeTab === 'teachers' ? 'faculty' : 'student'}...`}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* TAB: SECTIONS */}
        {activeTab === 'sections' && (
          <SectionManager
            adminCollegeCode={adminCollegeCode}
            onSectionsChange={setSections}
          />
        )}

        {/* TAB: TIMETABLE */}
        {activeTab === 'timetable' && (
          <TimetableBuilder
            adminCollegeCode={adminCollegeCode}
            sections={sections}
            teachers={teachers}
          />
        )}

        {/* TAB: FACULTY ROSTER */}
        {activeTab === 'teachers' && (
          <div className="roster-grid">
            {filteredTeachers.length === 0 ? (
              <div className="empty-state">No faculty found. Click "Register Faculty" to add.</div>
            ) : (
              filteredTeachers.map(t => {
                const secs = t.assignedSections?.length ? t.assignedSections : ['—'];
                const subjs = t.assignedSubjects?.length ? t.assignedSubjects : [t.subject || '—'];
                return (
                  <div key={t.id} className="faculty-card">
                    <div className="faculty-card-top">
                      <div className="faculty-avatar">{t.name?.charAt(0) || 'T'}</div>
                      <div className="faculty-info">
                        <h3 className="faculty-name">{t.name}</h3>
                        <p className="faculty-sub">
                          ID: <span className="highlight-txt">{t.collegeId}</span> | {t.department || 'CSE'}
                        </p>
                      </div>
                      <button className="btn-icon-delete" onClick={() => handleDeleteUser(t.id, t.name, 'teacher')}>🗑️</button>
                    </div>
                    <div className="allocation-box">
                      <div className="box-title">ASSIGNED SECTIONS & SUBJECTS:</div>
                      <div className="badges-row">
                        {secs.map(s => <span key={s} className="sec-badge">Sec {s}</span>)}
                        {subjs.map(sub => <span key={sub} className="subj-badge">📚 {sub}</span>)}
                      </div>
                      <button className="btn-assign-gear" onClick={() => handleOpenAssignModal(t)}>
                        ⚙️ Edit Section & Subject Allocations
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: STUDENTS ROSTER */}
        {activeTab === 'students' && (
          <div className="roster-grid">
            {filteredStudents.length === 0 ? (
              <div className="empty-state">No students found.</div>
            ) : (
              filteredStudents.map(s => (
                <div key={s.id} className="student-card">
                  <div className="student-card-left">
                    <div className="student-avatar">{s.name?.charAt(0) || 'S'}</div>
                    <div>
                      <h4 className="student-name">{s.name}</h4>
                      <p className="student-sub">
                        Roll: <span className="highlight-txt">{s.rollNo || s.collegeId}</span> |
                        Sec: <span className="sec-tag">{s.section || '—'}</span>
                      </p>
                      <p className="student-meta">{s.department || 'CSE'} • {s.year || '3rd Year'}</p>
                    </div>
                  </div>
                  <div className="student-card-actions">
                    <button
                      className="btn-icon-edit"
                      onClick={() => setEditStudentModal({ ...s })}
                      title="Edit Student"
                    >✏️</button>
                    <button
                      className="btn-icon-delete"
                      onClick={() => handleDeleteUser(s.id, s.name, 'student')}
                      title="Delete Student"
                    >🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: ATTENDANCE OVERVIEW */}
        {activeTab === 'attendance' && (
          <AttendanceOverview
            adminCollegeCode={adminCollegeCode}
            sections={sections}
          />
        )}

        {/* ========== MODALS ========== */}

        {/* ADD TEACHER MODAL */}
        <AnimatePresence>
          {showAddTeacherModal && (
            <div className="modal-overlay">
              <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="modal-header">
                  <h2>👨‍🏫 Register New Faculty</h2>
                  <button className="close-btn" onClick={() => setShowAddTeacherModal(false)}>✕</button>
                </div>
                <form onSubmit={handleAddTeacherSubmit} className="modal-form">
                  <div className="form-group">
                    <label>Faculty Full Name</label>
                    <input type="text" placeholder="e.g. Dr. Ramesh Kumar" value={newTeacher.name}
                      onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })} required />
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>College Faculty ID</label>
                      <input type="text" placeholder="e.g. VJIT-T-003" value={newTeacher.collegeId}
                        onChange={e => setNewTeacher({ ...newTeacher, collegeId: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" value={newTeacher.department}
                        onChange={e => setNewTeacher({ ...newTeacher, department: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Primary Subject</label>
                    <input type="text" placeholder="e.g. Operating Systems" value={newTeacher.subject}
                      onChange={e => setNewTeacher({ ...newTeacher, subject: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="text" placeholder="Default: teacher123" value={newTeacher.password}
                      onChange={e => setNewTeacher({ ...newTeacher, password: e.target.value })} />
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
                    <input type="text" placeholder="e.g. Vikram Rao" value={newStudent.name}
                      onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} required />
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Roll Number</label>
                      <input type="text" placeholder="e.g. CE21021" value={newStudent.rollNo}
                        onChange={e => setNewStudent({ ...newStudent, rollNo: e.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label>Section</label>
                      <select className="modal-select" value={newStudent.section}
                        onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}>
                        <option value="">— Select Section —</option>
                        {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        {sectionOptions.length === 0 && (
                          <>
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                            <option value="C">Section C</option>
                            <option value="D">Section D</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" value={newStudent.department}
                        onChange={e => setNewStudent({ ...newStudent, department: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Academic Year</label>
                      <select className="modal-select" value={newStudent.year}
                        onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}>
                        <option>1st Year</option>
                        <option>2nd Year</option>
                        <option>3rd Year</option>
                        <option>4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="text" placeholder="Default: student123" value={newStudent.password}
                      onChange={e => setNewStudent({ ...newStudent, password: e.target.value })} />
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

        {/* EDIT STUDENT MODAL */}
        <AnimatePresence>
          {editStudentModal && (
            <div className="modal-overlay">
              <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                <div className="modal-header">
                  <h2>✏️ Edit Student — {editStudentModal.name}</h2>
                  <button className="close-btn" onClick={() => setEditStudentModal(null)}>✕</button>
                </div>
                <div className="modal-form" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
                  <div className="form-group">
                    <label>Move to Section</label>
                    <select className="modal-select" value={editStudentModal.section || ''}
                      onChange={e => setEditStudentModal({ ...editStudentModal, section: e.target.value })}>
                      <option value="">— Select Section —</option>
                      {allSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" className="modal-text-input" value={editStudentModal.department || ''}
                        onChange={e => setEditStudentModal({ ...editStudentModal, department: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Academic Year</label>
                      <select className="modal-select" value={editStudentModal.year || ''}
                        onChange={e => setEditStudentModal({ ...editStudentModal, year: e.target.value })}>
                        <option>1st Year</option>
                        <option>2nd Year</option>
                        <option>3rd Year</option>
                        <option>4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-cancel" onClick={() => setEditStudentModal(null)}>Cancel</button>
                    <button className="btn-save-green" onClick={handleEditStudentSubmit} disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ASSIGN SECTIONS & SUBJECTS MODAL */}
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
                    <label className="section-label">Select Sections:</label>
                    <div className="chips-wrapper">
                      {[...allSectionOptions, ...assignedSecs.filter(s => !allSectionOptions.includes(s))].map(sec => (
                        <button key={sec} type="button"
                          className={`chip-toggle ${assignedSecs.includes(sec) ? 'sec-selected' : ''}`}
                          onClick={() => handleToggleSection(sec)}>
                          {assignedSecs.includes(sec) ? '✓ ' : ''}{sec}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="alloc-section">
                    <label className="section-label">Select Subjects:</label>
                    <div className="chips-wrapper">
                      {DEFAULT_SUBJECTS.map(subj => (
                        <button key={subj} type="button"
                          className={`chip-toggle ${assignedSubjs.includes(subj) ? 'subj-selected' : ''}`}
                          onClick={() => handleToggleSubject(subj)}>
                          {assignedSubjs.includes(subj) ? '✓ ' : '+ '}{subj}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="alloc-section">
                    <label className="section-label">Add Custom Subject:</label>
                    <div className="custom-input-row">
                      <input type="text" className="modal-text-input" placeholder="e.g. Artificial Intelligence"
                        value={customSubjInput} onChange={e => setCustomSubjInput(e.target.value)} />
                      <button type="button" className="btn-add-custom" onClick={handleAddCustomSubject}>Add</button>
                    </div>
                  </div>
                  <div className="summary-box">
                    <span className="summary-lbl">ALLOCATION SUMMARY:</span>
                    <div><strong className="txt-blue">Sections:</strong> {assignedSecs.join(', ')}</div>
                    <div><strong className="txt-purple">Subjects:</strong> {assignedSubjs.join(', ')}</div>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setAssignModalTeacher(null)}>Cancel</button>
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
