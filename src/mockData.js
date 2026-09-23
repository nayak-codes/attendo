// Mock data for development (before Firebase is connected)

export const MOCK_STUDENTS = [
  { id: 'S001', name: 'Arjun Reddy', rollNo: 'CE21001', department: 'CSE', section: 'A', year: 3, photo: null },
  { id: 'S002', name: 'Priya Sharma', rollNo: 'CE21002', department: 'CSE', section: 'A', year: 3, photo: null },
  { id: 'S003', name: 'Rahul Verma', rollNo: 'CE21003', department: 'CSE', section: 'A', year: 3, photo: null },
  { id: 'S004', name: 'Sneha Patel', rollNo: 'CE21004', department: 'CSE', section: 'A', year: 3, photo: null },
  { id: 'S005', name: 'Karan Singh', rollNo: 'CE21005', department: 'CSE', section: 'A', year: 3, photo: null },
  { id: 'S006', name: 'Divya Nair', rollNo: 'CE21006', department: 'CSE', section: 'B', year: 3, photo: null },
  { id: 'S007', name: 'Vikram Rao', rollNo: 'CE21007', department: 'CSE', section: 'B', year: 3, photo: null },
  { id: 'S008', name: 'Anjali Gupta', rollNo: 'CE21008', department: 'CSE', section: 'B', year: 3, photo: null },
  { id: 'S009', name: 'Rohit Kumar', rollNo: 'CE21009', department: 'CSE', section: 'B', year: 3, photo: null },
  { id: 'S010', name: 'Meera Iyer', rollNo: 'CE21010', department: 'CSE', section: 'B', year: 3, photo: null },
  { id: 'S011', name: 'Aditya Joshi', rollNo: 'CE21011', department: 'CSE', section: 'C', year: 3, photo: null },
  { id: 'S012', name: 'Pooja Mehta', rollNo: 'CE21012', department: 'CSE', section: 'C', year: 3, photo: null },
  { id: 'S013', name: 'Suresh Babu', rollNo: 'CE21013', department: 'CSE', section: 'C', year: 3, photo: null },
  { id: 'S014', name: 'Kavitha Rao', rollNo: 'CE21014', department: 'CSE', section: 'C', year: 3, photo: null },
  { id: 'S015', name: 'Nikhil Sharma', rollNo: 'CE21015', department: 'CSE', section: 'C', year: 3, photo: null },
  { id: 'S016', name: 'Lakshmi Devi', rollNo: 'CE21016', department: 'CSE', section: 'D', year: 3, photo: null },
  { id: 'S017', name: 'Aman Dubey', rollNo: 'CE21017', department: 'CSE', section: 'D', year: 3, photo: null },
  { id: 'S018', name: 'Sita Kumari', rollNo: 'CE21018', department: 'CSE', section: 'D', year: 3, photo: null },
  { id: 'S019', name: 'Rajesh Pillai', rollNo: 'CE21019', department: 'CSE', section: 'D', year: 3, photo: null },
  { id: 'S020', name: 'Deepa Krishnan', rollNo: 'CE21020', department: 'CSE', section: 'D', year: 3, photo: null },
];

export const MOCK_COLLEGES = [
  { id: 'col_vjit', code: 'VJIT', name: 'Vidya Jyothi Institute of Technology', city: 'Hyderabad', studentsCount: 3200, teachersCount: 140, status: 'Active', plan: 'Enterprise', serverUrl: 'vjit.smartattendance.edu' },
  { id: 'col_cbit', code: 'CBIT', name: 'Chaitanya Bharathi Institute of Technology', city: 'Hyderabad', studentsCount: 4500, teachersCount: 210, status: 'Active', plan: 'Enterprise', serverUrl: 'cbit.smartattendance.edu' },
  { id: 'col_jntuh', code: 'JNTUH', name: 'JNTU College of Engineering', city: 'Hyderabad', studentsCount: 5100, teachersCount: 250, status: 'Active', plan: 'Enterprise', serverUrl: 'jntuh.smartattendance.edu' },
  { id: 'col_iith', code: 'IITH', name: 'Indian Institute of Technology Hyderabad', city: 'Kandi, Sangareddy', studentsCount: 2800, teachersCount: 180, status: 'Active', plan: 'Enterprise', serverUrl: 'iith.smartattendance.edu' },
];

export const MOCK_USERS = {
  superadmins: [
    { id: 'SUPERADMIN', collegeId: 'SUPERADMIN', password: 'superadmin123', name: 'Platform Super Admin (Owner)', role: 'superadmin' }
  ],
  admins: [
    { id: 'ADM001', collegeId: 'VJIT-ADMIN', password: 'admin123', name: 'VJIT College Admin', role: 'admin', collegeCode: 'VJIT' },
    { id: 'ADM002', collegeId: 'MRDU-ADMIN', password: 'admin123', name: 'MRDU College Admin', role: 'admin', collegeCode: 'MRDU' },
    { id: 'ADM003', collegeId: 'CBIT-ADMIN', password: 'admin123', name: 'CBIT College Admin', role: 'admin', collegeCode: 'CBIT' },
    { id: 'ADM004', collegeId: 'GCOE-ADMIN', password: 'admin123', name: 'GCOE College Admin', role: 'admin', collegeCode: 'GCOE' },
    { id: 'ADM005', collegeId: 'MRUJ-ADMIN', password: 'admin123', name: 'MRUJ College Admin', role: 'admin', collegeCode: 'MRUJ' },
  ],
  teachers: [
    { id: 'T001', collegeId: 'VJIT-T-001', password: 'teacher123', name: 'Dr. Ramesh Kumar', subject: 'Data Structures', department: 'CSE', collegeCode: 'VJIT', assignedSections: ['A', 'B'], assignedSubjects: ['Data Structures', 'Operating Systems'] },
    { id: 'T002', collegeId: 'VJIT-T-002', password: 'teacher456', name: 'Prof. Anitha Rao', subject: 'DBMS', department: 'CSE', collegeCode: 'VJIT', assignedSections: ['A'], assignedSubjects: ['DBMS'] },
    { id: 'T003', collegeId: 'MRDU-T-001', password: 'teacher123', name: 'Dr. K. Srinivas', subject: 'Operating Systems', department: 'CSE', collegeCode: 'MRDU', assignedSections: ['A', 'C'], assignedSubjects: ['Operating Systems', 'Machine Learning'] },
    { id: 'T004', collegeId: 'MRDU-T-002', password: 'teacher123', name: 'Prof. Sunitha Reddy', subject: 'Machine Learning', department: 'CSE', collegeCode: 'MRDU', assignedSections: ['B'], assignedSubjects: ['Machine Learning'] },
    { id: 'T005', collegeId: 'CBIT-T-001', password: 'teacher123', name: 'Dr. Madhavan Nair', subject: 'Computer Networks', department: 'CSE', collegeCode: 'CBIT', assignedSections: ['A', 'B'], assignedSubjects: ['Computer Networks'] },
  ],
  students: [
    { id: 'S001', collegeId: 'CE21001', password: 'student123', name: 'Arjun Reddy', rollNo: 'CE21001', section: 'A', department: 'CSE', collegeCode: 'VJIT' },
    { id: 'S002', collegeId: 'CE21002', password: 'student456', name: 'Priya Sharma', rollNo: 'CE21002', section: 'A', department: 'CSE', collegeCode: 'VJIT' },
    { id: 'S003', collegeId: 'MRDU2101', password: 'student123', name: 'Venkatesh Naidu', rollNo: 'MRDU2101', section: 'A', department: 'CSE', collegeCode: 'MRDU' },
    { id: 'S004', collegeId: 'MRDU2102', password: 'student123', name: 'Bhavana Devi', rollNo: 'MRDU2102', section: 'B', department: 'CSE', collegeCode: 'MRDU' },
    { id: 'S005', collegeId: 'CBIT2101', password: 'student123', name: 'Sai Teja', rollNo: 'CBIT2101', section: 'A', department: 'CSE', collegeCode: 'CBIT' },
  ]
};

export const MOCK_SUBJECTS = ['Data Structures', 'DBMS', 'Operating Systems', 'Computer Networks', 'Software Engineering'];

export const MOCK_SESSIONS = ['Session 1 (9:00 AM)', 'Session 2 (10:00 AM)', 'Session 3 (11:00 AM)', 'Session 4 (12:00 PM)', 'Session 5 (2:00 PM)', 'Session 6 (3:00 PM)'];

export const MOCK_SECTIONS = ['A', 'B', 'C', 'D'];

export const MOCK_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

// Mock attendance history for student dashboard (default 0 - attendance considered from now on)
export const MOCK_ATTENDANCE_HISTORY = {
  'CE21001': {
    'Data Structures': { total: 0, attended: 0 },
    'DBMS': { total: 0, attended: 0 },
    'Operating Systems': { total: 0, attended: 0 },
    'Computer Networks': { total: 0, attended: 0 },
    'Software Engineering': { total: 0, attended: 0 },
  }
};

export const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getAvatarColor = (id) => {
  const colors = [
    ['#4f8ef7', '#8b5cf6'],
    ['#06b6d4', '#4f8ef7'],
    ['#10b981', '#06b6d4'],
    ['#f59e0b', '#ef4444'],
    ['#8b5cf6', '#ec4899'],
    ['#ec4899', '#f59e0b'],
  ];
  const index = parseInt(id.replace(/\D/g, '')) % colors.length;
  return colors[index];
};
