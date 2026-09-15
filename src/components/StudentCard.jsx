import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getInitials, getAvatarColor } from '../mockData';
import './StudentCard.css';

const StudentCard = ({ student, status, onToggle, index }) => {
  const isPresent = status === 'present';
  const [c1, c2] = getAvatarColor(student.id);
  const initials = getInitials(student.name);

  return (
    <motion.div
      className={`student-card ${isPresent ? 'present' : 'absent'}`}
      onClick={() => onToggle(student.id)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      layout
    >
      {/* Status indicator top bar */}
      <div className={`card-status-bar ${isPresent ? 'bar-present' : 'bar-absent'}`} />

      {/* Status badge */}
      <div className="card-top-row">
        <span className="card-id">{student.rollNo}</span>
        <motion.div
          className={`status-badge ${isPresent ? 'badge-present' : 'badge-absent'}`}
          key={status}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {isPresent ? '✓ P' : '✕ A'}
        </motion.div>
      </div>

      {/* Avatar */}
      <div className="card-avatar-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            className={`card-avatar ${isPresent ? 'avatar-present' : 'avatar-absent'}`}
            style={{
              background: isPresent
                ? `linear-gradient(135deg, ${c1}, ${c2})`
                : 'linear-gradient(135deg, #7f1d1d, #991b1b)'
            }}
            initial={{ rotateY: 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="avatar-photo" />
            ) : (
              <span className="avatar-initials">{initials}</span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Glow ring */}
        <div className={`avatar-glow ${isPresent ? 'glow-present' : 'glow-absent'}`} />
      </div>

      {/* Student info */}
      <div className="card-info">
        <h3 className="card-name">{student.name}</h3>
        <p className="card-dept">{student.department} • Year {student.year}</p>
      </div>

      {/* Tap hint */}
      <p className="card-tap-hint">
        {isPresent ? 'Tap to mark absent' : 'Tap to mark present'}
      </p>
    </motion.div>
  );
};

export default StudentCard;
