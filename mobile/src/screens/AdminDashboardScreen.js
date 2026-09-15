import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../theme/colors';
import HeaderBar from '../components/HeaderBar';
import { useAuth } from '../context/AuthContext';
import {
  addTeacher,
  addStudent,
  subscribeTeachers,
  subscribeStudents,
  deleteUser,
  updateTeacherAssignments,
} from '../firebase/adminService';

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

export default function AdminDashboardScreen({ onNavigate }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('teachers'); // 'teachers' | 'students'
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalType, setModalType] = useState(null); // 'teacher' | 'student' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Teacher Section & Subject Allocation State
  const [assignModalTeacher, setAssignModalTeacher] = useState(null);
  const [assignedSecs, setAssignedSecs] = useState([]);
  const [assignedSubjs, setAssignedSubjs] = useState([]);
  const [customSubjInput, setCustomSubjInput] = useState('');

  // Teacher Form State
  const [tName, setTName] = useState('');
  const [tCollegeId, setTCollegeId] = useState('');
  const [tSubject, setTSubject] = useState('');
  const [tDepartment, setTDepartment] = useState('CSE');
  const [tPassword, setTPassword] = useState('teacher123');
  const [tInitialSections, setTInitialSections] = useState(['A']);
  const [tInitialSubjects, setTInitialSubjects] = useState(['Operating Systems']);

  // Student Form State
  const [sName, setSName] = useState('');
  const [sRollNo, setSRollNo] = useState('');
  const [sDepartment, setSDepartment] = useState('CSE');
  const [sSection, setSSection] = useState('A');
  const [sYear, setSYear] = useState('3rd Year');
  const [sPassword, setSPassword] = useState('student123');

  const currentCollegeCode = user?.selectedCollegeCode || user?.collegeCode || 'VJIT';

  useEffect(() => {
    setLoading(true);
    const unsubTeachers = subscribeTeachers(data => {
      setTeachers(data || []);
      setLoading(false);
    }, currentCollegeCode);
    const unsubStudents = subscribeStudents(data => {
      setStudents(data || []);
      setLoading(false);
    }, currentCollegeCode);

    return () => {
      unsubTeachers();
      unsubStudents();
    };
  }, [currentCollegeCode]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleAddTeacherSubmit = async () => {
    if (!tName.trim() || !tCollegeId.trim() || !tSubject.trim()) {
      Alert.alert('Validation Error', 'Please fill in Name, College ID, and Subject.');
      return;
    }
    setIsSubmitting(true);
    try {
      const allSubjs = Array.from(new Set([tSubject.trim(), ...tInitialSubjects]));
      await addTeacher({
        name: tName,
        collegeId: tCollegeId,
        subject: tSubject,
        department: tDepartment,
        password: tPassword || 'teacher123',
        assignedSections: tInitialSections,
        assignedSubjects: allSubjs,
      });
      showToast(`✅ Teacher "${tName}" registered with assigned sections & subjects!`);
    } catch (err) {
      Alert.alert('Error', 'Failed to add teacher. Check your connection.');
      console.warn('Firestore write warning:', err.message);
    }
    setModalType(null);
    setTName('');
    setTCollegeId('');
    setTSubject('');
    setTPassword('teacher123');
    setIsSubmitting(false);
  };

  // Section & Subject Assignment Modal Handlers
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

  const handleToggleAssignSection = (sec) => {
    setAssignedSecs(prev =>
      prev.includes(sec) ? (prev.length > 1 ? prev.filter(s => s !== sec) : prev) : [...prev, sec]
    );
  };

  const handleToggleAssignSubject = (subj) => {
    setAssignedSubjs(prev =>
      prev.includes(subj) ? (prev.length > 1 ? prev.filter(s => s !== subj) : prev) : [...prev, subj]
    );
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
      await updateTeacherAssignments(assignModalTeacher.id, assignedSecs, assignedSubjs);
      showToast(`🎯 Updated allocation for ${assignModalTeacher.name}!`);
      setAssignModalTeacher(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to update section/subject allocation.');
      console.warn('Firestore update warning:', err.message);
    }
    setIsSubmitting(false);
  };

  const handleAddStudentSubmit = async () => {
    if (!sName.trim() || !sRollNo.trim()) {
      Alert.alert('Validation Error', 'Please fill in Student Name and Roll Number.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addStudent({
        name: sName,
        rollNo: sRollNo,
        department: sDepartment,
        section: sSection,
        year: sYear,
        password: sPassword || 'student123',
      });
      showToast(`✅ Student "${sName}" added successfully!`);
    } catch (err) {
      Alert.alert('Error', 'Failed to add student. Check your connection.');
      console.warn('Firestore write warning:', err.message);
    }
    setModalType(null);
    setSName('');
    setSRollNo('');
    setSPassword('student123');
    setIsSubmitting(false);
  };

  const handleDelete = (userId, name) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to remove "${name}" from the system?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteUser(userId);
            showToast(`🗑️ Removed ${name}`);
          },
        },
      ]
    );
  };

  const filteredTeachers = teachers.filter(
    t =>
      (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.collegeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(
    s =>
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.rollNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Admin Portal"
        subtitle="Manage College Roster"
        rightElement={
          <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); onNavigate('Login'); }}>
            <Text style={styles.logoutText}>Logout 🚪</Text>
          </TouchableOpacity>
        }
      />

      {toastMessage ? (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.adminBadge}>👑 SYSTEM ADMIN</Text>
            <Text style={styles.welcomeTitle}>{user?.name || 'Administrator'}</Text>
            <Text style={styles.welcomeSub}>Control panel for Teachers & Student registrations</Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👨‍🏫</Text>
            <Text style={styles.statValue}>{teachers.length}</Text>
            <Text style={styles.statLabel}>Total Teachers</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👨‍🎓</Text>
            <Text style={styles.statValue}>{students.length}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🏢</Text>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLORS.accentBlue }]}
            onPress={() => setModalType('teacher')}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnIcon}>➕</Text>
            <Text style={styles.addBtnText}>Add Teacher</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLORS.accentPurple || '#8B5CF6' }]}
            onPress={() => setModalType('student')}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnIcon}>➕</Text>
            <Text style={styles.addBtnText}>Add Student</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar & Tab Toggle */}
        <View style={styles.sectionHeader}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'teachers' && styles.tabBtnActive]}
              onPress={() => setActiveTab('teachers')}
            >
              <Text style={[styles.tabText, activeTab === 'teachers' && styles.tabTextActive]}>
                Teachers ({teachers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'students' && styles.tabBtnActive]}
              onPress={() => setActiveTab('students')}
            >
              <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
                Students ({students.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* List Content */}
        {activeTab === 'teachers' ? (
          filteredTeachers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No teachers found</Text>
            </View>
          ) : (
            filteredTeachers.map(item => {
              const itemSecs = item.assignedSections && item.assignedSections.length > 0
                ? item.assignedSections
                : ['A'];
              const itemSubjs = item.assignedSubjects && item.assignedSubjects.length > 0
                ? item.assignedSubjects
                : [item.subject || 'Operating Systems'];
              return (
                <View key={item.id} style={[styles.userCard, { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{item.name ? item.name[0] : 'T'}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userSub}>
                        ID: {item.collegeId} | Dept: {item.department || 'CSE'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id, item.name)}
                    >
                      <Text style={styles.deleteText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Section & Subject Badges & Edit Button */}
                  <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                    <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 }}>
                      ASSIGNED SECTIONS & SUBJECTS:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {itemSecs.map(sec => (
                        <View key={sec} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.4)' }}>
                          <Text style={{ fontSize: 11, color: '#60A5FA', fontWeight: 'bold' }}>Sec {sec}</Text>
                        </View>
                      ))}
                      {itemSubjs.map(subj => (
                        <View key={subj} style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.4)' }}>
                          <Text style={{ fontSize: 11, color: '#C084FC', fontWeight: 'bold' }}>📚 {subj}</Text>
                        </View>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => handleOpenAssignModal(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.assignBtnText}>⚙️ Assign Sections & Subjects</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          filteredStudents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No students found</Text>
            </View>
          ) : (
            filteredStudents.map(item => (
              <View key={item.id} style={styles.userCard}>
                <View style={[styles.avatarCircle, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.avatarText}>{item.name ? item.name[0] : 'S'}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userSub}>
                    Roll: {item.rollNo || item.collegeId} | Sec: {item.section || 'A'}
                  </Text>
                  <Text style={styles.userDetail}>
                    Dept: {item.department || 'CSE'} | Year: {item.year || '3rd'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <Text style={styles.deleteText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* ADD TEACHER MODAL */}
      <Modal visible={modalType === 'teacher'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>👨‍🏫 Add New Teacher</Text>
            <Text style={styles.modalSub}>Register faculty credentials in database</Text>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Dr. Ramesh Kumar"
              placeholderTextColor={COLORS.textMuted}
              value={tName}
              onChangeText={setTName}
            />

            <Text style={styles.fieldLabel}>College ID</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. VJIT-T-003"
              placeholderTextColor={COLORS.textMuted}
              value={tCollegeId}
              onChangeText={setTCollegeId}
            />

            <Text style={styles.fieldLabel}>Assigned Subject</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Operating Systems"
              placeholderTextColor={COLORS.textMuted}
              value={tSubject}
              onChangeText={setTSubject}
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Default: teacher123"
              placeholderTextColor={COLORS.textMuted}
              value={tPassword}
              onChangeText={setTPassword}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: COLORS.accentBlue }]}
                onPress={handleAddTeacherSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Teacher</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD STUDENT MODAL */}
      <Modal visible={modalType === 'student'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>👨‍🎓 Add New Student</Text>
            <Text style={styles.modalSub}>Register student to college roster</Text>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Vikram Rao"
              placeholderTextColor={COLORS.textMuted}
              value={sName}
              onChangeText={setSName}
            />

            <Text style={styles.fieldLabel}>Roll Number / ID</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. CE21021"
              placeholderTextColor={COLORS.textMuted}
              value={sRollNo}
              onChangeText={setSRollNo}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Section</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. A"
                  placeholderTextColor={COLORS.textMuted}
                  value={sSection}
                  onChangeText={setSSection}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Year</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="3rd Year"
                  placeholderTextColor={COLORS.textMuted}
                  value={sYear}
                  onChangeText={setSYear}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Default: student123"
              placeholderTextColor={COLORS.textMuted}
              value={sPassword}
              onChangeText={setSPassword}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: COLORS.accentPurple || '#8B5CF6' }]}
                onPress={handleAddStudentSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ALLOCATE SECTION & SUBJECT MODAL */}
      <Modal visible={!!assignModalTeacher} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>⚙️ Assign Sections & Subjects</Text>
              <Text style={styles.modalSub}>
                Faculty: <Text style={{ color: COLORS.accentBlue, fontWeight: 'bold' }}>{assignModalTeacher?.name}</Text> ({assignModalTeacher?.collegeId})
              </Text>

              {/* Section Selector */}
              <Text style={styles.fieldLabel}>Select Allowed Sections:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {DEFAULT_SECTIONS.map(sec => {
                  const selected = assignedSecs.includes(sec);
                  return (
                    <TouchableOpacity
                      key={sec}
                      onPress={() => handleToggleAssignSection(sec)}
                      style={[
                        styles.chipBtn,
                        selected && styles.chipBtnSelected
                      ]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {selected ? '✓ Section ' : 'Section '}{sec}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject Selector */}
              <Text style={styles.fieldLabel}>Select Assigned Subjects:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {DEFAULT_SUBJECTS.map(subj => {
                  const selected = assignedSubjs.includes(subj);
                  return (
                    <TouchableOpacity
                      key={subj}
                      onPress={() => handleToggleAssignSubject(subj)}
                      style={[
                        styles.chipBtn,
                        selected && styles.chipBtnSelectedSubject
                      ]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {selected ? '✓ ' : '+ '}{subj}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Subject Input */}
              <Text style={styles.fieldLabel}>Add Custom Subject:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. Artificial Intelligence"
                  placeholderTextColor={COLORS.textMuted}
                  value={customSubjInput}
                  onChangeText={setCustomSubjInput}
                />
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.accentBlue, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center' }}
                  onPress={handleAddCustomSubject}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Current Selection summary */}
              <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderSubtle }}>
                <Text style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 'bold', letterSpacing: 0.5 }}>CURRENT SELECTION:</Text>
                <Text style={{ fontSize: 12, color: COLORS.textPrimary, marginTop: 3 }}>
                  <Text style={{ fontWeight: 'bold', color: '#60A5FA' }}>Sections:</Text> {assignedSecs.join(', ')}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textPrimary, marginTop: 2 }}>
                  <Text style={{ fontWeight: 'bold', color: '#C084FC' }}>Subjects:</Text> {assignedSubjs.join(', ')}
                </Text>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setAssignModalTeacher(null)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: COLORS.accentGreen || '#10B981' }]}
                  onPress={handleSaveAssignmentsSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Allocation</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.bgGlass,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  toastBanner: {
    backgroundColor: COLORS.accentGreen,
    padding: 12,
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  welcomeCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentBlue,
    letterSpacing: 1,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  welcomeSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  addBtnIcon: {
    fontSize: 16,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.accentBlueGlow,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.accentBlue,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userDetail: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },
  deleteText: {
    fontSize: 16,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.bgGlass,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  assignBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginTop: 4,
  },
  assignBtnText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  chipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  chipBtnSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  chipBtnSelectedSubject: {
    backgroundColor: '#8B5CF6',
    borderColor: '#C084FC',
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
