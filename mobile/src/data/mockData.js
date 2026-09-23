export const MOCK_STUDENTS = [
  { id: 'S001', name: 'Arjun Reddy', rollNo: 'CE21001', department: 'CSE', section: 'A', year: 3 },
  { id: 'S002', name: 'Priya Sharma', rollNo: 'CE21002', department: 'CSE', section: 'A', year: 3 },
  { id: 'S003', name: 'Rahul Verma', rollNo: 'CE21003', department: 'CSE', section: 'A', year: 3 },
  { id: 'S004', name: 'Sneha Patel', rollNo: 'CE21004', department: 'CSE', section: 'A', year: 3 },
  { id: 'S005', name: 'Karan Singh', rollNo: 'CE21005', department: 'CSE', section: 'A', year: 3 },
  { id: 'S006', name: 'Divya Nair', rollNo: 'CE21006', department: 'CSE', section: 'B', year: 3 },
  { id: 'S007', name: 'Vikram Rao', rollNo: 'CE21007', department: 'CSE', section: 'B', year: 3 },
  { id: 'S008', name: 'Anjali Gupta', rollNo: 'CE21008', department: 'CSE', section: 'B', year: 3 },
  { id: 'S009', name: 'Rohit Kumar', rollNo: 'CE21009', department: 'CSE', section: 'B', year: 3 },
  { id: 'S010', name: 'Meera Iyer', rollNo: 'CE21010', department: 'CSE', section: 'B', year: 3 },
  { id: 'S011', name: 'Aditya Joshi', rollNo: 'CE21011', department: 'CSE', section: 'C', year: 3 },
  { id: 'S012', name: 'Pooja Mehta', rollNo: 'CE21012', department: 'CSE', section: 'C', year: 3 },
  { id: 'S013', name: 'Suresh Babu', rollNo: 'CE21013', department: 'CSE', section: 'C', year: 3 },
  { id: 'S014', name: 'Kavitha Rao', rollNo: 'CE21014', department: 'CSE', section: 'C', year: 3 },
  { id: 'S015', name: 'Nikhil Sharma', rollNo: 'CE21015', department: 'CSE', section: 'C', year: 3 },
  { id: 'S016', name: 'Lakshmi Devi', rollNo: 'CE21016', department: 'CSE', section: 'D', year: 3 },
  { id: 'S017', name: 'Aman Dubey', rollNo: 'CE21017', department: 'CSE', section: 'D', year: 3 },
  { id: 'S018', name: 'Sita Kumari', rollNo: 'CE21018', department: 'CSE', section: 'D', year: 3 },
  { id: 'S019', name: 'Rajesh Pillai', rollNo: 'CE21019', department: 'CSE', section: 'D', year: 3 },
  { id: 'S020', name: 'Deepa Krishnan', rollNo: 'CE21020', department: 'CSE', section: 'D', year: 3 },
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
    { id: 'ADM001', collegeId: 'ADMIN-001', password: 'admin123', name: 'System Administrator' },
  ],
  teachers: [
    { id: 'T001', collegeId: 'VJIT-T-001', password: 'teacher123', name: 'Dr. Ramesh Kumar', subject: 'Data Structures', department: 'CSE' },
    { id: 'T002', collegeId: 'VJIT-T-002', password: 'teacher456', name: 'Prof. Anitha Rao', subject: 'DBMS', department: 'CSE' },
  ],
  students: [
    { id: 'S001', collegeId: 'CE21001', password: 'student123', name: 'Arjun Reddy', rollNo: 'CE21001' },
    { id: 'S002', collegeId: 'CE21002', password: 'student456', name: 'Priya Sharma', rollNo: 'CE21002' },
  ]
};

export const MOCK_SUBJECTS = ['Data Structures', 'DBMS', 'Operating Systems', 'Computer Networks', 'Software Engineering'];
export const MOCK_SESSIONS = ['Session 1 (9:00 AM)', 'Session 2 (10:00 AM)', 'Session 3 (11:00 AM)', 'Session 4 (12:00 PM)', 'Session 5 (2:00 PM)'];
export const MOCK_SECTIONS = ['A', 'B', 'C', 'D'];
export const MOCK_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const MOCK_STUDENT_ATTENDANCE = {
  'CE21001': {
    'Data Structures': { total: 0, attended: 0 },
    'DBMS': { total: 0, attended: 0 },
    'Operating Systems': { total: 0, attended: 0 },
    'Computer Networks': { total: 0, attended: 0 },
    'Software Engineering': { total: 0, attended: 0 },
  },
  'CE21002': {
    'Data Structures': { total: 0, attended: 0 },
    'DBMS': { total: 0, attended: 0 },
    'Operating Systems': { total: 0, attended: 0 },
    'Computer Networks': { total: 0, attended: 0 },
    'Software Engineering': { total: 0, attended: 0 },
  }
};

// Calendar history data (empty default - attendance tracked live from now on)
export const MOCK_CALENDAR_DATA = {};

export const getInitials = (name) => {
  if (!name) return 'ST';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};
