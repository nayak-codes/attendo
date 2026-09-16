import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  db, collection, doc, setDoc, deleteDoc, onSnapshot, query, where, serverTimestamp
} from '../../firebase';
import './SectionManager.css';

const DEPARTMENTS = ['CSE', 'CSD', 'CSM', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const SectionManager = ({ adminCollegeCode, onSectionsChange }) => {
  const [sections, setSections] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

  const [newSection, setNewSection] = useState({
    department: 'CSE',
    sectionLetter: 'A',
    year: '3rd Year',
  });

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Real-time Firestore listener for sections
  useEffect(() => {
    if (!adminCollegeCode) return;
    const q = query(
      collection(db, 'sections'),
      where('collegeCode', '==', adminCollegeCode)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        if (a.department !== b.department) return a.department.localeCompare(b.department);
        if (a.year !== b.year) return a.year.localeCompare(b.year);
        return a.sectionLetter.localeCompare(b.sectionLetter);
      });
      setSections(list);
      if (onSectionsChange) onSectionsChange(list);
    }, err => {
      console.warn('Sections listener error:', err.message);
    });
    return () => unsub();
  }, [adminCollegeCode]);

  const handleAddSection = async (e) => {
    e.preventDefault();
    const displayName = `${newSection.department}-${newSection.sectionLetter}`;
    const sectionId = `${adminCollegeCode}_${newSection.department}_${newSection.year.replace(/\s/g, '')}_${newSection.sectionLetter}`;

    // Check duplicate
    const exists = sections.find(
      s => s.department === newSection.department &&
           s.sectionLetter === newSection.sectionLetter &&
           s.year === newSection.year
    );
    if (exists) {
      alert(`Section ${displayName} for ${newSection.year} already exists!`);
      return;
    }

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'sections', sectionId), {
        collegeCode: adminCollegeCode,
        department: newSection.department,
        sectionLetter: newSection.sectionLetter,
        year: newSection.year,
        displayName,
        fullLabel: `${displayName} — ${newSection.year}`,
        studentCount: 0,
        createdAt: new Date().toISOString(),
      });
      triggerToast(`✅ Section ${displayName} (${newSection.year}) created!`);
      setShowAddModal(false);
      setNewSection({ department: 'CSE', sectionLetter: 'A', year: '3rd Year' });
    } catch (err) {
      alert('Failed to create section: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const handleDeleteSection = async (section) => {
    try {
      await deleteDoc(doc(db, 'sections', section.id));
      triggerToast(`🗑️ Section ${section.displayName} deleted`);
      setShowDeleteConfirm(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // Group sections by department
  const filteredSections = sections.filter(s => {
    const matchDept = filterDept === 'ALL' || s.department === filterDept;
    const matchYear = filterYear === 'ALL' || s.year === filterYear;
    return matchDept && matchYear;
  });

  const groupedByDept = filteredSections.reduce((acc, sec) => {
    if (!acc[sec.department]) acc[sec.department] = [];
    acc[sec.department].push(sec);
    return acc;
  }, {});

  const deptColors = {
    CSE: '#3b82f6', CSD: '#8b5cf6', CSM: '#06b6d4',
    ECE: '#f59e0b', EEE: '#10b981', MECH: '#ef4444',
    CIVIL: '#84cc16', IT: '#f97316'
  };

  return (
    <div className="section-manager">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div className="sec-toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sec-manager-header">
        <div>
          <h2 className="sec-manager-title">🏢 Section Management</h2>
          <p className="sec-manager-sub">
            Create department-wise sections (CSE-A, ECE-B) and assign students to them
          </p>
        </div>
        <button className="btn-create-section" onClick={() => setShowAddModal(true)}>
          ➕ Create New Section
        </button>
      </div>

      {/* Stats Row */}
      <div className="sec-stats-row">
        <div className="sec-stat-pill">
          <span className="sec-stat-num">{sections.length}</span>
          <span className="sec-stat-lbl">Total Sections</span>
        </div>
        <div className="sec-stat-pill">
          <span className="sec-stat-num">{[...new Set(sections.map(s => s.department))].length}</span>
          <span className="sec-stat-lbl">Departments</span>
        </div>
        <div className="sec-stat-pill">
          <span className="sec-stat-num">{sections.reduce((a, s) => a + (s.studentCount || 0), 0)}</span>
          <span className="sec-stat-lbl">Total Students</span>
        </div>
      </div>

      {/* Filters */}
      <div className="sec-filters-bar">
        <div className="sec-filter-group">
          <span className="sec-filter-label">Dept:</span>
          {['ALL', ...DEPARTMENTS].map(d => (
            <button
              key={d}
              className={`sec-filter-chip ${filterDept === d ? 'active' : ''}`}
              onClick={() => setFilterDept(d)}
            >{d}</button>
          ))}
        </div>
        <div className="sec-filter-group">
          <span className="sec-filter-label">Year:</span>
          {['ALL', ...YEARS].map(y => (
            <button
              key={y}
              className={`sec-filter-chip ${filterYear === y ? 'active' : ''}`}
              onClick={() => setFilterYear(y)}
            >{y === 'ALL' ? 'ALL' : y.replace(' Year', 'Y')}</button>
          ))}
        </div>
      </div>

      {/* Sections Grid — Grouped by Department */}
      {Object.keys(groupedByDept).length === 0 ? (
        <div className="sec-empty-state">
          <div className="sec-empty-icon">🏢</div>
          <h3>No Sections Created Yet</h3>
          <p>Click "Create New Section" to add your first section (e.g., CSE-A for 3rd Year)</p>
        </div>
      ) : (
        <div className="dept-groups-container">
          {Object.entries(groupedByDept).map(([dept, deptSections]) => (
            <div key={dept} className="dept-group">
              <div className="dept-group-header">
                <span className="dept-badge" style={{ background: deptColors[dept] + '22', borderColor: deptColors[dept] + '55', color: deptColors[dept] }}>
                  {dept}
                </span>
                <span className="dept-count">{deptSections.length} section{deptSections.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="sections-row">
                {deptSections.map(sec => (
                  <motion.div
                    key={sec.id}
                    className="section-card"
                    style={{ '--dept-color': deptColors[sec.department] || '#3b82f6' }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="section-card-top">
                      <div className="section-name-badge">
                        {sec.displayName}
                      </div>
                      <button
                        className="sec-delete-btn"
                        onClick={() => setShowDeleteConfirm(sec)}
                        title="Delete section"
                      >✕</button>
                    </div>
                    <div className="section-year-tag">{sec.year}</div>
                    <div className="section-card-footer">
                      <span className="section-student-count">
                        👥 {sec.studentCount || 0} students
                      </span>
                      <span className="section-dept-tag">{sec.department}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD SECTION MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="modal-overlay">
            <motion.div
              className="sec-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>🏢 Create New Section</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAddSection} className="modal-form">
                {/* Preview */}
                <div className="section-preview-box">
                  <span className="preview-label">SECTION PREVIEW:</span>
                  <div className="preview-name">
                    {newSection.department}-{newSection.sectionLetter}
                    <span className="preview-year"> — {newSection.year}</span>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      className="modal-select"
                      value={newSection.department}
                      onChange={e => setNewSection({ ...newSection, department: e.target.value })}
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Section Letter *</label>
                    <select
                      className="modal-select"
                      value={newSection.sectionLetter}
                      onChange={e => setNewSection({ ...newSection, sectionLetter: e.target.value })}
                    >
                      {SECTION_LETTERS.map(l => <option key={l} value={l}>Section {l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Academic Year *</label>
                  <div className="year-chips">
                    {YEARS.map(y => (
                      <button
                        key={y}
                        type="button"
                        className={`chip-toggle ${newSection.year === y ? 'sec-selected' : ''}`}
                        onClick={() => setNewSection({ ...newSection, year: y })}
                      >{y}</button>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : '✅ Create Section'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="modal-overlay">
            <motion.div
              className="sec-modal-content confirm-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="confirm-icon">⚠️</div>
              <h3>Delete Section {showDeleteConfirm.displayName}?</h3>
              <p>
                Students assigned to this section will NOT be deleted, but will lose their section assignment.
                This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                <button className="btn-delete-confirm" onClick={() => handleDeleteSection(showDeleteConfirm)}>
                  🗑️ Delete Section
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SectionManager;
