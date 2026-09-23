import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  db, collection, doc, setDoc, onSnapshot, query, where, getDocs
} from '../../firebase';
import './TimetableBuilder.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_PERIODS = 7;
const DEFAULT_START = '09:00';
const DEFAULT_PERIOD_DURATION = 50;
const DEFAULT_LUNCH_AFTER = 4;
const DEFAULT_LUNCH_DURATION = 45;

const addMinutes = (time, mins) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

const buildTimeline = (config) => {
  const slots = [];
  let current = config.startTime;
  for (let i = 1; i <= config.periodsPerDay; i++) {
    const end = addMinutes(current, config.periodDuration);
    slots.push({ period: i, label: `Period ${i}`, start: current, end, isLunch: false });
    current = end;
    if (config.hasLunchBreak && i === config.lunchAfterPeriod) {
      const lunchEnd = addMinutes(current, config.lunchDuration);
      slots.push({ period: 'L', label: 'Lunch Break', start: current, end: lunchEnd, isLunch: true });
      current = lunchEnd;
    }
  }
  return slots;
};

const TimetableBuilder = ({ adminCollegeCode, sections = [], teachers = [], initialSection }) => {
  const [selectedSectionObj, setSelectedSectionObj] = useState(null);
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [timetable, setTimetable] = useState({});
  const [cellModal, setCellModal] = useState(null); // { day, period }
  const [subjects, setSubjects] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [saved, setSaved] = useState(false);

  // Default config
  const defaultConfig = {
    periodsPerDay: DEFAULT_PERIODS,
    periodDuration: DEFAULT_PERIOD_DURATION,
    startTime: DEFAULT_START,
    hasLunchBreak: true,
    lunchAfterPeriod: DEFAULT_LUNCH_AFTER,
    lunchDuration: DEFAULT_LUNCH_DURATION,
  };

  const [draftConfig, setDraftConfig] = useState({ ...defaultConfig });

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Helper to build unique timetable ID per department + year + sectionLetter
  const getTtId = (sec) => {
    if (!sec) return '';
    if (typeof sec === 'object') {
      if (sec.id) return sec.id;
      const yr = (sec.year || '').replace(/\s/g, '');
      return `${adminCollegeCode}_${sec.department}_${yr}_${sec.sectionLetter}`;
    }
    return `${adminCollegeCode}_${String(sec).replace(/[\s-]/g, '_')}`;
  };

  // Auto-select initialSection or first section
  useEffect(() => {
    if (sections && sections.length > 0) {
      if (initialSection) {
        const initialName = typeof initialSection === 'object' ? initialSection.displayName : initialSection;
        const initialYear = typeof initialSection === 'object' ? initialSection.year : null;
        const initialId = typeof initialSection === 'object' ? initialSection.id : initialSection;

        const match = sections.find(s =>
          s.id === initialId ||
          (s.displayName === initialName && (!initialYear || s.year === initialYear)) ||
          s.displayName === initialName
        );
        if (match) {
          setSelectedSectionObj(match);
          return;
        }
      }
      if (!selectedSectionObj || !sections.some(s => s.id === selectedSectionObj.id)) {
        setSelectedSectionObj(sections[0]);
      }
    }
  }, [initialSection, sections]);

  // Load college config from Firestore
  useEffect(() => {
    if (!adminCollegeCode) return;
    const configDocRef = doc(db, 'collegeConfig', adminCollegeCode);
    const unsub = onSnapshot(configDocRef, (snap) => {
      if (snap.exists()) {
        setConfig(snap.data());
        setDraftConfig(snap.data());
      } else {
        setConfig(defaultConfig);
        setDraftConfig(defaultConfig);
      }
      setLoadingConfig(false);
    }, () => {
      setConfig(defaultConfig);
      setDraftConfig(defaultConfig);
      setLoadingConfig(false);
    });
    return () => unsub();
  }, [adminCollegeCode]);

  // Load timetable when section changes
  useEffect(() => {
    if (!selectedSectionObj || !adminCollegeCode) return;
    const ttId = getTtId(selectedSectionObj);
    const unsub = onSnapshot(doc(db, 'timetables', ttId), (snap) => {
      if (snap.exists() && snap.data()?.schedule) {
        setTimetable(snap.data().schedule || {});
      } else {
        setTimetable({});
      }
    });
    return () => unsub();
  }, [selectedSectionObj, adminCollegeCode]);

  // Collect subjects from teachers
  useEffect(() => {
    const allSubjects = new Set();
    teachers.forEach(t => {
      (t.assignedSubjects || [t.subject]).forEach(s => s && allSubjects.add(s));
    });
    setSubjects(Array.from(allSubjects));
  }, [teachers]);

  const handleSaveConfig = async () => {
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'collegeConfig', adminCollegeCode), {
        ...draftConfig,
        collegeCode: adminCollegeCode,
        updatedAt: new Date().toISOString(),
      });
      setShowConfigModal(false);
      triggerToast('⚙️ Timetable configuration saved!');
    } catch (err) {
      alert('Failed to save config: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const getCell = (day, periodNum) => {
    if (!timetable || !timetable[day]) return null;
    if (Array.isArray(timetable[day])) {
      return timetable[day].find(c => c.period === periodNum || Number(c.period) === Number(periodNum)) || null;
    }
    return timetable[`${day}_${periodNum}`] || null;
  };

  const handleCellClick = (day, period) => {
    if (period.isLunch) return;
    const existing = getCell(day, period.period);
    setCellModal({
      day,
      period: period.period,
      periodLabel: period.label,
      start: period.start,
      end: period.end,
      subject: existing?.subject || '',
      teacherId: existing?.teacherId || '',
      teacherName: existing?.teacherName || '',
    });
  };

  const handleSaveCell = async () => {
    if (!cellModal || !selectedSectionObj) return;
    const { day, period, subject, teacherId, teacherName } = cellModal;

    const newTimetable = { ...timetable };
    if (!newTimetable[day]) newTimetable[day] = [];

    // Remove existing cell for this period
    newTimetable[day] = newTimetable[day].filter(c => c.period !== period);

    if (subject || teacherId) {
      newTimetable[day].push({
        period,
        subject: subject || '',
        teacherId: teacherId || '',
        teacherName: teacherName || '',
      });
    }

    setTimetable(newTimetable);
    setCellModal(null);

    // Live sync to Firestore with unique section ID
    const ttId = getTtId(selectedSectionObj);
    try {
      await setDoc(doc(db, 'timetables', ttId), {
        collegeCode: adminCollegeCode,
        section: selectedSectionObj.displayName,
        year: selectedSectionObj.year,
        department: selectedSectionObj.department,
        sectionId: selectedSectionObj.id,
        schedule: newTimetable,
        updatedAt: new Date().toISOString(),
      });
      triggerToast(`⚡ Live updated P${period} (${day}) for ${selectedSectionObj.displayName} (${selectedSectionObj.year})!`);
    } catch (err) {
      console.warn('Live save error:', err);
    }
  };

  const handleSaveTimetable = async () => {
    if (!selectedSectionObj) return;
    setIsSubmitting(true);
    const ttId = getTtId(selectedSectionObj);
    try {
      await setDoc(doc(db, 'timetables', ttId), {
        collegeCode: adminCollegeCode,
        section: selectedSectionObj.displayName,
        year: selectedSectionObj.year,
        department: selectedSectionObj.department,
        sectionId: selectedSectionObj.id,
        schedule: timetable,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      triggerToast(`📅 Timetable for ${selectedSectionObj.displayName} (${selectedSectionObj.year}) saved & synced to Mobile!`);
    } catch (err) {
      alert('Failed to save timetable: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const clearCell = async (day, period) => {
    if (!selectedSectionObj) return;
    const newTimetable = { ...timetable };
    if (newTimetable[day]) {
      newTimetable[day] = newTimetable[day].filter(c => c.period !== period);
    }
    setTimetable(newTimetable);

    // Live sync to Firestore
    const ttId = getTtId(selectedSectionObj);
    try {
      await setDoc(doc(db, 'timetables', ttId), {
        collegeCode: adminCollegeCode,
        section: selectedSectionObj.displayName,
        year: selectedSectionObj.year,
        department: selectedSectionObj.department,
        sectionId: selectedSectionObj.id,
        schedule: newTimetable,
        updatedAt: new Date().toISOString(),
      });
      triggerToast(`🗑️ Cleared P${period} (${day}) for ${selectedSectionObj.displayName} (${selectedSectionObj.year})`);
    } catch (err) {
      console.warn('Live clear error:', err);
    }
  };

  if (loadingConfig) {
    return <div className="tt-loading">Loading timetable config...</div>;
  }

  const timeline = buildTimeline(config);
  const teacherMap = {};
  teachers.forEach(t => { teacherMap[t.id] = t; });

  const subjectColors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'
  ];
  const subjectColorMap = {};
  subjects.forEach((s, i) => { subjectColorMap[s] = subjectColors[i % subjectColors.length]; });

  return (
    <div className="timetable-builder">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div className="tt-toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="tt-header">
        <div>
          <h2 className="tt-title">📅 Timetable Builder</h2>
          <p className="tt-sub">Build weekly schedules for each section & year — auto-synced to Mobile App</p>
        </div>
        <div className="tt-header-actions">
          <button className="btn-tt-config" onClick={() => setShowConfigModal(true)}>
            ⚙️ Configure Periods
          </button>
          {selectedSectionObj && (
            <button
              className={`btn-tt-save ${saved ? 'saved' : ''}`}
              onClick={handleSaveTimetable}
              disabled={isSubmitting}
            >
              {saved ? '✅ Saved!' : isSubmitting ? 'Saving...' : '💾 Save & Sync'}
            </button>
          )}
        </div>
      </div>

      {/* Config Summary */}
      <div className="tt-config-summary">
        <span>🕘 Start: <strong>{config.startTime}</strong></span>
        <span>⏱ {config.periodsPerDay} periods × {config.periodDuration} min</span>
        {config.hasLunchBreak && (
          <span>🍱 Lunch after Period {config.lunchAfterPeriod} ({config.lunchDuration} min)</span>
        )}
        <span className="tt-config-edit-link" onClick={() => setShowConfigModal(true)}>Edit ✏️</span>
      </div>

      {/* Section Selector */}
      <div className="tt-section-selector">
        <label className="tt-selector-label">Select Section & Academic Year to Edit Timetable:</label>
        <div className="tt-sections-list">
          {sections.length === 0 ? (
            <p className="tt-no-sections">⚠️ No sections created yet. Go to "Sections" tab first.</p>
          ) : (
            sections.map(sec => {
              const isSelected = selectedSectionObj?.id === sec.id;
              return (
                <button
                  key={sec.id}
                  className={`tt-sec-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedSectionObj(sec)}
                >
                  {sec.displayName}
                  <span className="tt-sec-year">{sec.year}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Timetable Grid */}
      {selectedSectionObj ? (
        <div className="tt-grid-wrapper">
          <div className="tt-grid" style={{ gridTemplateColumns: `120px repeat(${DAYS.length}, 1fr)` }}>
            {/* Header Row */}
            <div className="tt-cell tt-corner">PERIOD / DAY</div>
            {DAYS.map(day => (
              <div key={day} className="tt-cell tt-day-header">{day.slice(0, 3).toUpperCase()}</div>
            ))}

            {/* Period Rows */}
            {timeline.map((slot) => (
              <React.Fragment key={`row-${slot.period}`}>
                {/* Period Label */}
                <div className={`tt-cell tt-period-label ${slot.isLunch ? 'lunch-label' : ''}`}>
                  {slot.isLunch ? (
                    <div className="lunch-slot-label">
                      <span>🍱</span>
                      <span>LUNCH</span>
                      <span className="slot-time">{slot.start}–{slot.end}</span>
                    </div>
                  ) : (
                    <div className="period-slot-label">
                      <span className="period-num">P{slot.period}</span>
                      <span className="slot-time">{slot.start}–{slot.end}</span>
                    </div>
                  )}
                </div>

                {/* Day Cells */}
                {DAYS.map(day => {
                  if (slot.isLunch) {
                    return (
                      <div key={`${day}-lunch`} className="tt-cell lunch-cell">
                        🍱 Lunch Break
                      </div>
                    );
                  }
                  const cell = getCell(day, slot.period);
                  const cellColor = cell?.subject ? subjectColorMap[cell.subject] || '#3b82f6' : null;

                  return (
                    <div
                      key={`${day}-${slot.period}`}
                      className={`tt-cell data-cell ${cell ? 'has-data' : 'empty-cell'}`}
                      style={cell ? { '--cell-color': cellColor } : {}}
                      onClick={() => handleCellClick(day, slot)}
                    >
                      {cell ? (
                        <div className="cell-content">
                          <div className="cell-subject">{cell.subject}</div>
                          <div className="cell-teacher">{cell.teacherName || '—'}</div>
                          <button
                            className="cell-clear-btn"
                            onClick={e => { e.stopPropagation(); clearCell(day, slot.period); }}
                          >✕</button>
                        </div>
                      ) : (
                        <div className="cell-add-hint">+ Add</div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="tt-no-section-selected">
          <div className="tt-empty-icon">📅</div>
          <h3>Select a Section to Build its Timetable</h3>
          <p>Choose a section above to start building the weekly schedule</p>
        </div>
      )}

      {/* CELL EDIT MODAL */}
      <AnimatePresence>
        {cellModal && (
          <div className="tt-modal-overlay">
            <motion.div
              className="tt-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="tt-modal-header">
                <h3>
                  Assign Slot — {cellModal.day}, P{cellModal.period} ({cellModal.start}–{cellModal.end})
                </h3>
                <button className="tt-modal-close" onClick={() => setCellModal(null)}>✕</button>
              </div>

              <div className="tt-modal-body">
                {/* Subject Selection */}
                <div className="tt-form-group">
                  <label>Subject</label>
                  <select
                    className="tt-input-select"
                    value={cellModal.subject}
                    onChange={e => setCellModal({ ...cellModal, subject: e.target.value })}
                  >
                    <option value="">— Select Subject —</option>
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Subject Input */}
                <div className="tt-form-group">
                  <label>Or Type Custom Subject Name</label>
                  <input
                    type="text"
                    className="tt-input-text"
                    placeholder="e.g. Artificial Intelligence"
                    value={cellModal.subject}
                    onChange={e => setCellModal({ ...cellModal, subject: e.target.value })}
                  />
                </div>

                {/* Teacher Selection */}
                <div className="tt-form-group">
                  <label>Faculty / Teacher</label>
                  <select
                    className="tt-input-select"
                    value={cellModal.teacherId}
                    onChange={e => {
                      const tId = e.target.value;
                      const teacher = teacherMap[tId];
                      setCellModal({
                        ...cellModal,
                        teacherId: tId,
                        teacherName: teacher ? teacher.name : '',
                      });
                    }}
                  >
                    <option value="">— Select Faculty —</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.department || 'CSE'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tt-modal-actions">
                  <button
                    className="btn-tt-clear"
                    onClick={() => { clearCell(cellModal.day, cellModal.period); setCellModal(null); }}
                  >
                    Clear Slot
                  </button>
                  <div className="tt-actions-right">
                    <button className="btn-tt-cancel" onClick={() => setCellModal(null)}>Cancel</button>
                    <button className="btn-tt-confirm" onClick={handleSaveCell}>
                      Set Slot
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TIMETABLE CONFIG MODAL */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="tt-modal-overlay">
            <motion.div
              className="tt-modal-content config-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="tt-modal-header">
                <h3>⚙️ Timetable Period & Lunch Configuration</h3>
                <button className="tt-modal-close" onClick={() => setShowConfigModal(false)}>✕</button>
              </div>

              <div className="tt-modal-body">
                <div className="form-row-2">
                  <div className="tt-form-group">
                    <label>College Start Time</label>
                    <input
                      type="time"
                      className="tt-input-text"
                      value={draftConfig.startTime}
                      onChange={e => setDraftConfig({ ...draftConfig, startTime: e.target.value })}
                    />
                  </div>
                  <div className="tt-form-group">
                    <label>Periods Per Day</label>
                    <input
                      type="number"
                      min="4"
                      max="10"
                      className="tt-input-text"
                      value={draftConfig.periodsPerDay}
                      onChange={e => setDraftConfig({ ...draftConfig, periodsPerDay: parseInt(e.target.value) || 7 })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="tt-form-group">
                    <label>Period Duration (Minutes)</label>
                    <input
                      type="number"
                      min="30"
                      max="90"
                      className="tt-input-text"
                      value={draftConfig.periodDuration}
                      onChange={e => setDraftConfig({ ...draftConfig, periodDuration: parseInt(e.target.value) || 50 })}
                    />
                  </div>
                  <div className="tt-form-group">
                    <label>Lunch Break After Period #</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      className="tt-input-text"
                      value={draftConfig.lunchAfterPeriod}
                      onChange={e => setDraftConfig({ ...draftConfig, lunchAfterPeriod: parseInt(e.target.value) || 4 })}
                    />
                  </div>
                </div>

                <div className="tt-form-group">
                  <label>Lunch Duration (Minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="90"
                    className="tt-input-text"
                    value={draftConfig.lunchDuration}
                    onChange={e => setDraftConfig({ ...draftConfig, lunchDuration: parseInt(e.target.value) || 45 })}
                  />
                </div>

                <div className="tt-modal-actions">
                  <button className="btn-tt-cancel" onClick={() => setShowConfigModal(false)}>Cancel</button>
                  <button className="btn-tt-confirm" onClick={handleSaveConfig} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : '💾 Save Configuration'}
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

export default TimetableBuilder;
