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

const TimetableBuilder = ({ adminCollegeCode, sections, teachers }) => {
  const [selectedSection, setSelectedSection] = useState('');
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
    if (!selectedSection || !adminCollegeCode) return;
    const ttId = `${adminCollegeCode}_${selectedSection.replace(/[\s-]/g, '_')}`;
    const unsub = onSnapshot(doc(db, 'timetables', ttId), (snap) => {
      if (snap.exists()) {
        setTimetable(snap.data().schedule || {});
      } else {
        setTimetable({});
      }
    });
    return () => unsub();
  }, [selectedSection, adminCollegeCode]);

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
    return timetable[day]?.find(c => c.period === periodNum) || null;
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
    if (!cellModal) return;
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
  };

  const handleSaveTimetable = async () => {
    if (!selectedSection) return;
    setIsSubmitting(true);
    const ttId = `${adminCollegeCode}_${selectedSection.replace(/[\s-]/g, '_')}`;
    try {
      await setDoc(doc(db, 'timetables', ttId), {
        collegeCode: adminCollegeCode,
        section: selectedSection,
        schedule: timetable,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      triggerToast(`📅 Timetable for ${selectedSection} saved & synced to Mobile!`);
    } catch (err) {
      alert('Failed to save timetable: ' + err.message);
    }
    setIsSubmitting(false);
  };

  const clearCell = (day, period) => {
    const newTimetable = { ...timetable };
    if (newTimetable[day]) {
      newTimetable[day] = newTimetable[day].filter(c => c.period !== period);
    }
    setTimetable(newTimetable);
  };

  if (loadingConfig) {
    return <div className="tt-loading">Loading timetable config...</div>;
  }

  const timeline = buildTimeline(config);
  const periodSlots = timeline.filter(t => !t.isLunch);
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
          <p className="tt-sub">Build weekly schedules for each section — auto-synced to Mobile App</p>
        </div>
        <div className="tt-header-actions">
          <button className="btn-tt-config" onClick={() => setShowConfigModal(true)}>
            ⚙️ Configure Periods
          </button>
          {selectedSection && (
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
        <label className="tt-selector-label">Select Section to Edit Timetable:</label>
        <div className="tt-sections-list">
          {sections.length === 0 ? (
            <p className="tt-no-sections">⚠️ No sections created yet. Go to "Sections" tab first.</p>
          ) : (
            sections.map(sec => (
              <button
                key={sec.id}
                className={`tt-sec-btn ${selectedSection === sec.displayName ? 'active' : ''}`}
                onClick={() => setSelectedSection(sec.displayName)}
              >
                {sec.displayName}
                <span className="tt-sec-year">{sec.year}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Timetable Grid */}
      {selectedSection ? (
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

      {/* CELL ASSIGNMENT MODAL */}
      <AnimatePresence>
        {cellModal && (
          <div className="modal-overlay">
            <motion.div
              className="cell-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>📝 {cellModal.day} — {cellModal.periodLabel}</h2>
                <button className="close-btn" onClick={() => setCellModal(null)}>✕</button>
              </div>
              <p className="cell-modal-time">⏱ {cellModal.start} – {cellModal.end} | Section: <strong>{selectedSection}</strong></p>

              <div className="modal-form" style={{ gap: 16 }}>
                <div className="form-group">
                  <label>Subject</label>
                  <select
                    className="modal-select"
                    value={cellModal.subject}
                    onChange={e => setCellModal({ ...cellModal, subject: e.target.value })}
                  >
                    <option value="">— Select Subject —</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Assign Teacher</label>
                  <select
                    className="modal-select"
                    value={cellModal.teacherId}
                    onChange={e => {
                      const t = teachers.find(t => t.id === e.target.value);
                      setCellModal({ ...cellModal, teacherId: e.target.value, teacherName: t?.name || '' });
                    }}
                  >
                    <option value="">— Select Teacher —</option>
                    {teachers
                      .filter(t => !cellModal.subject || (t.assignedSubjects || [t.subject]).includes(cellModal.subject))
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setCellModal(null)}>Cancel</button>
                  <button className="btn-submit" onClick={handleSaveCell}>✅ Assign</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIG MODAL */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="modal-overlay">
            <motion.div
              className="cell-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>⚙️ Configure Timetable</h2>
                <button className="close-btn" onClick={() => setShowConfigModal(false)}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: '#9ca3af', marginTop: -8, marginBottom: 20 }}>
                These settings apply to all sections of your college.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      className="modal-select"
                      value={draftConfig.startTime}
                      onChange={e => setDraftConfig({ ...draftConfig, startTime: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Periods Per Day</label>
                    <div className="period-count-selector">
                      {[5, 6, 7, 8].map(n => (
                        <button
                          key={n}
                          type="button"
                          className={`period-count-btn ${draftConfig.periodsPerDay === n ? 'active' : ''}`}
                          onClick={() => setDraftConfig({ ...draftConfig, periodsPerDay: n })}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Period Duration (minutes)</label>
                    <div className="period-count-selector">
                      {[45, 50, 55, 60].map(n => (
                        <button
                          key={n}
                          type="button"
                          className={`period-count-btn ${draftConfig.periodDuration === n ? 'active' : ''}`}
                          onClick={() => setDraftConfig({ ...draftConfig, periodDuration: n })}
                        >{n}m</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Lunch Break</label>
                    <div className="period-count-selector">
                      <button
                        type="button"
                        className={`period-count-btn ${draftConfig.hasLunchBreak ? 'active' : ''}`}
                        onClick={() => setDraftConfig({ ...draftConfig, hasLunchBreak: true })}
                      >Yes</button>
                      <button
                        type="button"
                        className={`period-count-btn ${!draftConfig.hasLunchBreak ? 'active' : ''}`}
                        onClick={() => setDraftConfig({ ...draftConfig, hasLunchBreak: false })}
                      >No</button>
                    </div>
                  </div>
                </div>

                {draftConfig.hasLunchBreak && (
                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Lunch After Period</label>
                      <div className="period-count-selector">
                        {Array.from({ length: draftConfig.periodsPerDay - 1 }, (_, i) => i + 1).map(n => (
                          <button
                            key={n}
                            type="button"
                            className={`period-count-btn ${draftConfig.lunchAfterPeriod === n ? 'active' : ''}`}
                            onClick={() => setDraftConfig({ ...draftConfig, lunchAfterPeriod: n })}
                          >P{n}</button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Lunch Duration (minutes)</label>
                      <div className="period-count-selector">
                        {[30, 45, 60].map(n => (
                          <button
                            key={n}
                            type="button"
                            className={`period-count-btn ${draftConfig.lunchDuration === n ? 'active' : ''}`}
                            onClick={() => setDraftConfig({ ...draftConfig, lunchDuration: n })}
                          >{n}m</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div className="config-preview-box">
                  <div className="preview-label">SCHEDULE PREVIEW (Mon)</div>
                  <div className="config-preview-timeline">
                    {buildTimeline(draftConfig).map((slot, i) => (
                      <div key={i} className={`preview-slot ${slot.isLunch ? 'preview-lunch' : ''}`}>
                        <span>{slot.isLunch ? '🍱' : `P${slot.period}`}</span>
                        <span>{slot.start}–{slot.end}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowConfigModal(false)}>Cancel</button>
                  <button className="btn-submit" onClick={handleSaveConfig} disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : '💾 Save Config'}
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
