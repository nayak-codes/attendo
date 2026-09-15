# Smart Attendance App - Major Feature Implementation

## Features to Build:
1. **Real-time attendance sync** - Student dashboard updates instantly when teacher submits
2. **Absent notifications** - In-app notification toast when student is marked absent
3. **Calendar view** - Monthly calendar on student dashboard showing present/absent days
4. **UI improvements** - Better design throughout

## Files to Modify/Create:

### Core Changes:
- `AttendanceContext.js` - Add notifications, calendar data, getStudentCalendar()
- `mockData.js` - Add historical calendar data for demo
- `StudentDashboardScreen.js` - Add Calendar tab, notification badge, real-time updates
- `App.js` - Add global notification overlay

### New Files:
- `src/components/CalendarView.js` - Monthly attendance calendar
- `src/components/NotificationToast.js` - Absent notification toast
