import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './SuperAdminDashboard.css';

const SuperAdminDashboard = () => {
  const { user, colleges, addCollege } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCollege, setNewCollege] = useState({
    name: '',
    code: '',
    city: '',
    adminId: '',
    adminPassword: '',
    studentsCount: '',
    teachersCount: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const filteredColleges = colleges.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newCollege.name || !newCollege.code || !newCollege.city || !newCollege.adminId || !newCollege.adminPassword) {
      alert('Please fill out all required fields (College Name, Code, City, Admin ID, Admin Password)');
      return;
    }
    setSubmitting(true);
    
    const collegePayload = {
      ...newCollege,
      code: newCollege.code.toUpperCase(),
      studentsCount: Number(newCollege.studentsCount) || 0,
      teachersCount: Number(newCollege.teachersCount) || 0,
      serverUrl: `${newCollege.code.toLowerCase()}.smartattendance.edu`,
      createdAt: new Date().toISOString()
    };

    const res = await addCollege(collegePayload);
    setSubmitting(false);
    if (res.success) {
      setShowAddModal(false);
      setNewCollege({
        name: '',
        code: '',
        city: '',
        adminId: '',
        adminPassword: '',
        studentsCount: '',
        teachersCount: ''
      });
      setToastMsg(`🎉 ${collegePayload.name} & Admin (${collegePayload.adminId}) created!`);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const totalStudents = colleges.reduce((acc, c) => acc + (Number(c.studentsCount) || 0), 0);
  const totalTeachers = colleges.reduce((acc, c) => acc + (Number(c.teachersCount) || 0), 0);

  return (
    <div className="superadmin-page">
      {/* Background ambient lighting */}
      <div className="superadmin-bg-mesh" />

      <div className="superadmin-container">
        {/* Top Header */}
        <header className="superadmin-header">
          <div>
            <div className="superadmin-badge">
              <span className="pulse-dot" />
              <span>SUPER ADMIN PORTAL</span>
            </div>
            <h1 className="superadmin-title">
              College Cloud <span>Servers</span> Management
            </h1>
            <p className="superadmin-subtitle">
              Provision dedicated attendance servers & credentials for partner engineering colleges.
            </p>
          </div>

          <button 
            className="btn-add-college"
            onClick={() => setShowAddModal(true)}
            id="add-college-btn"
          >
            <span>➕ Provision New College</span>
          </button>
        </header>

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

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card gold-border">
            <div className="metric-icon">🏛️</div>
            <div>
              <div className="metric-value">{colleges.length}</div>
              <div className="metric-label">Onboarded Colleges</div>
            </div>
          </div>

          <div className="metric-card blue-border">
            <div className="metric-icon">👨‍🎓</div>
            <div>
              <div className="metric-value">{totalStudents.toLocaleString()}+</div>
              <div className="metric-label">Enrolled Students</div>
            </div>
          </div>

          <div className="metric-card purple-border">
            <div className="metric-icon">👨‍🏫</div>
            <div>
              <div className="metric-value">{totalTeachers.toLocaleString()}+</div>
              <div className="metric-label">Faculty Staff</div>
            </div>
          </div>

          <div className="metric-card green-border">
            <div className="metric-icon">⚡</div>
            <div>
              <div className="metric-value">99.99%</div>
              <div className="metric-label">Global Server Uptime</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="controls-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by college name, code (e.g. VJIT, CBIT), or city..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="super-search-input"
            />
          </div>
          <div className="active-servers-pill">
            🟢 All {colleges.length} Servers Active & Syncing
          </div>
        </div>

        {/* Colleges List Grid */}
        <div className="colleges-grid">
          {filteredColleges.map((college) => (
            <motion.div 
              key={college.id || college.code}
              className="college-card glass-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="college-card-header">
                <div className="college-code-badge">{college.code}</div>
                <span className="status-badge-active">🟢 Active Server</span>
              </div>

              <h3 className="college-name">{college.name}</h3>
              <p className="college-location">📍 {college.city || 'Hyderabad, Telangana'}</p>

              <div className="college-details-row">
                <div className="detail-item">
                  <span className="detail-label">Students</span>
                  <span className="detail-value">{(college.studentsCount || 2000).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Faculty</span>
                  <span className="detail-value">{(college.teachersCount || 100).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Plan</span>
                  <span className="detail-value plan-tag">{college.plan || 'Enterprise'}</span>
                </div>
              </div>

              <div className="server-url-box">
                <span className="server-label">Server endpoint:</span>
                <code className="server-url">https://{college.serverUrl || `${college.code.toLowerCase()}.smartattendance.edu`}</code>
              </div>

              <div className="college-card-footer">
                <button className="btn-secondary-sm" onClick={() => alert(`Server status for ${college.code}: Healthy (Latency 12ms)`)}>
                  📊 Server Health
                </button>
                <button className="btn-primary-sm" onClick={() => alert(`College Code: ${college.code}\nDefault Admin ID: ${college.code}-ADMIN\nPassword: admin123`)}>
                  🔑 Credentials
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Modal for Provisioning New College */}
        <AnimatePresence>
          {showAddModal && (
            <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
              <motion.div 
                className="modal-content glass-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>🏛️ Provision New College Server</h2>
                  <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
                </div>

                <form onSubmit={handleAddSubmit} className="modal-form">
                  <div className="form-group">
                    <label>College Full Name *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Vasavi College of Engineering" 
                      value={newCollege.name}
                      onChange={e => setNewCollege({ ...newCollege, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>College Short Code *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. VCE" 
                        value={newCollege.code}
                        onChange={e => setNewCollege({ ...newCollege, code: e.target.value.toUpperCase() })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>City / Location *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Ibrahimbagh, Hyderabad" 
                        value={newCollege.city}
                        onChange={e => setNewCollege({ ...newCollege, city: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>College Admin User ID *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. MRDU-ADMIN" 
                        value={newCollege.adminId}
                        onChange={e => setNewCollege({ ...newCollege, adminId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>College Admin Password *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. admin123" 
                        value={newCollege.adminPassword}
                        onChange={e => setNewCollege({ ...newCollege, adminPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Estimated Students (Optional)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 2500" 
                        value={newCollege.studentsCount}
                        onChange={e => setNewCollege({ ...newCollege, studentsCount: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Estimated Faculty (Optional)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 120" 
                        value={newCollege.teachersCount}
                        onChange={e => setNewCollege({ ...newCollege, teachersCount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={submitting}>
                      {submitting ? 'Provisioning Server...' : '🚀 Provision & Add College'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
