import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function SuperAdminDashboardScreen({ onNavigate }) {
  const { user, logout, colleges, addCollege } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCol, setNewCol] = useState({
    name: '',
    code: '',
    city: '',
    adminId: '',
    adminPassword: '',
    studentsCount: '',
    teachersCount: ''
  });

  const filteredColleges = colleges.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStudents = colleges.reduce((acc, c) => acc + (Number(c.studentsCount) || 0), 0);
  const totalTeachers = colleges.reduce((acc, c) => acc + (Number(c.teachersCount) || 0), 0);

  const handleAddCollege = async () => {
    if (!newCol.name || !newCol.code || !newCol.city || !newCol.adminId || !newCol.adminPassword) {
      Alert.alert('Error', 'Please fill in College Name, Code, City, Admin ID, and Admin Password');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: newCol.name,
      code: newCol.code.toUpperCase(),
      city: newCol.city,
      adminId: newCol.adminId,
      adminPassword: newCol.adminPassword,
      studentsCount: Number(newCol.studentsCount) || 0,
      teachersCount: Number(newCol.teachersCount) || 0,
      plan: 'Enterprise',
      serverUrl: `${newCol.code.toLowerCase()}.smartattendance.edu`,
      createdAt: new Date().toISOString()
    };

    const res = await addCollege(payload);
    setSubmitting(false);

    if (res.success) {
      setModalVisible(false);
      setNewCol({ name: '', code: '', city: '', adminId: '', adminPassword: '', studentsCount: '', teachersCount: '' });
      Alert.alert('Success 🎉', `College ${payload.name} & Admin (${payload.adminId}) provisioned!`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>👑 SUPER ADMIN PORTAL</Text>
          </View>
          <Text style={styles.headerTitle}>College Servers</Text>
          <Text style={styles.headerSubtitle}>Multi-Tenant Enterprise Network</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); onNavigate('Login'); }}>
          <Text style={styles.logoutText}>Logout 🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer}>
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.metricEmoji}>🏛️</Text>
            <Text style={styles.metricVal}>{colleges.length}</Text>
            <Text style={styles.metricLbl}>Colleges</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.metricEmoji}>👨‍🎓</Text>
            <Text style={styles.metricVal}>{totalStudents.toLocaleString()}</Text>
            <Text style={styles.metricLbl}>Students</Text>
          </View>

          <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
            <Text style={styles.metricEmoji}>👨‍🏫</Text>
            <Text style={styles.metricVal}>{totalTeachers.toLocaleString()}</Text>
            <Text style={styles.metricLbl}>Faculty</Text>
          </View>
        </View>

        {/* Add College Button */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>➕ Provision New College Server</Text>
        </TouchableOpacity>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search colleges by code or name..."
          placeholderTextColor={COLORS.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {/* Colleges List */}
        <Text style={styles.sectionTitle}>Partner Colleges ({filteredColleges.length})</Text>

        {filteredColleges.map((c) => (
          <View key={c.id || c.code} style={styles.collegeCard}>
            <View style={styles.cardTop}>
              <View style={styles.codeTag}>
                <Text style={styles.codeTagText}>{c.code}</Text>
              </View>
              <Text style={styles.statusActive}>🟢 Active Server</Text>
            </View>

            <Text style={styles.collegeName}>{c.name}</Text>
            <Text style={styles.collegeCity}>📍 {c.city}</Text>

            <View style={styles.detailsRow}>
              <View style={styles.detailCol}>
                <Text style={styles.detailLbl}>Students</Text>
                <Text style={styles.detailVal}>{(c.studentsCount || 2000).toLocaleString()}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLbl}>Faculty</Text>
                <Text style={styles.detailVal}>{(c.teachersCount || 100).toLocaleString()}</Text>
              </View>
              <View style={styles.detailCol}>
                <Text style={styles.detailLbl}>Plan</Text>
                <Text style={[styles.detailVal, { color: '#a78bfa' }]}>{c.plan || 'Enterprise'}</Text>
              </View>
            </View>

            <View style={styles.serverBox}>
              <Text style={styles.serverLbl}>Server Node:</Text>
              <Text style={styles.serverUrl}>https://{c.serverUrl || `${c.code.toLowerCase()}.smartattendance.edu`}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal to Add New College */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🏛️ Provision New College</Text>

            <Text style={styles.inputLabel}>College Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Vasavi College of Engineering"
              placeholderTextColor={COLORS.textMuted}
              value={newCol.name}
              onChangeText={text => setNewCol({ ...newCol, name: text })}
            />

            <Text style={styles.inputLabel}>College Short Code *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. VCE"
              placeholderTextColor={COLORS.textMuted}
              value={newCol.code}
              onChangeText={text => setNewCol({ ...newCol, code: text.toUpperCase() })}
            />

            <Text style={styles.inputLabel}>City / Location *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Hyderabad"
              placeholderTextColor={COLORS.textMuted}
              value={newCol.city}
              onChangeText={text => setNewCol({ ...newCol, city: text })}
            />

            <Text style={styles.inputLabel}>College Admin User ID *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. MRDU-ADMIN"
              placeholderTextColor={COLORS.textMuted}
              value={newCol.adminId}
              onChangeText={text => setNewCol({ ...newCol, adminId: text })}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>College Admin Password *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. admin123"
              placeholderTextColor={COLORS.textMuted}
              value={newCol.adminPassword}
              onChangeText={text => setNewCol({ ...newCol, adminPassword: text })}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddCollege} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Provision Server 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.bgGlass,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  logoutText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
  },
  metricEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  addBtn: {
    backgroundColor: COLORS.accentBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  collegeCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeTag: {
    backgroundColor: COLORS.accentBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeTagText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  statusActive: {
    fontSize: 11,
    color: COLORS.present,
    fontWeight: '600',
  },
  collegeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  collegeCity: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  serverBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
  },
  serverLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  serverUrl: {
    fontSize: 11,
    color: COLORS.accentBlue,
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.bgGlass,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: COLORS.accentBlue,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
