import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme/colors';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarView({
  calendarData = {},
  year,
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
}) {
  const { colors } = useTheme();
  // calendarData: { 'YYYY-MM-DD': 'present' | 'absent' | 'mixed' }

  const today = new Date();
  const displayYear = year ?? today.getFullYear();
  const displayMonth = month ?? today.getMonth(); // 0-indexed

  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1);
    const startOffset = firstDay.getDay(); // 0=Sunday
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    return { days: daysInMonth, startOffset };
  }, [displayYear, displayMonth]);

  const getDateKey = (d) =>
    `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getStatusColor = (status) => {
    if (status === 'present') return colors.present;
    if (status === 'absent') return colors.absent;
    if (status === 'mixed') return colors.warning;
    return null;
  };

  const getStatusBg = (status) => {
    if (status === 'present') return colors.presentBg;
    if (status === 'absent') return colors.absentBg;
    if (status === 'mixed') return 'rgba(245, 158, 11, 0.15)';
    return 'transparent';
  };

  const isToday = (d) => {
    return (
      today.getDate() === d &&
      today.getMonth() === displayMonth &&
      today.getFullYear() === displayYear
    );
  };

  const isFuture = (d) => {
    const date = new Date(displayYear, displayMonth, d);
    return date > today;
  };

  // Count present and absent in this month
  const { presentCount, absentCount } = useMemo(() => {
    let p = 0, a = 0;
    for (let d = 1; d <= days; d++) {
      const key = getDateKey(d);
      const status = calendarData[key];
      if (status === 'present') p++;
      else if (status === 'absent') a++;
    }
    return { presentCount: p, absentCount: a };
  }, [calendarData, days, displayYear, displayMonth]);

  const cells = [];
  // Empty cells for offset
  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= days; d++) {
    cells.push(d);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.borderSubtle }]}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]} onPress={() => onMonthChange && onMonthChange(-1)}>
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {MONTH_NAMES[displayMonth]} {displayYear}
          </Text>
          <View style={styles.monthStats}>
            <View style={styles.statDot}>
              <View style={[styles.dot, { backgroundColor: colors.present }]} />
              <Text style={[styles.statTxt, { color: colors.textSecondary }]}>{presentCount} Present</Text>
            </View>
            <View style={styles.statDot}>
              <View style={[styles.dot, { backgroundColor: colors.absent }]} />
              <Text style={[styles.statTxt, { color: colors.textSecondary }]}>{absentCount} Absent</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.bgGlass, borderColor: colors.borderSubtle }]} onPress={() => onMonthChange && onMonthChange(1)}>
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day Labels */}
      <View style={styles.daysRow}>
        {DAY_LABELS.map(d => (
          <Text key={d} style={[styles.dayLabel, { color: colors.textMuted }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (!day) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }
          const key = getDateKey(day);
          const status = calendarData[key];
          const future = isFuture(day);
          const todayFlag = isToday(day);
          const isSelected = selectedDate === key;
          const statusColor = getStatusColor(status);
          const statusBg = getStatusBg(status);

          return (
            <TouchableOpacity
              key={day}
              activeOpacity={0.7}
              onPress={() => onSelectDate && onSelectDate(key)}
              style={[
                styles.cell,
                status && !future ? { backgroundColor: statusBg } : null,
                todayFlag ? { borderWidth: 1.5, borderColor: colors.accentBlue } : null,
                isSelected ? { borderWidth: 2, borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow } : null,
              ]}
            >
              <Text
                style={[
                  styles.dayNum,
                  { color: colors.textSecondary },
                  statusColor && !future ? { color: statusColor, fontWeight: '800' } : null,
                  future ? { color: colors.textMuted } : null,
                  todayFlag ? { color: colors.accentBlue, fontWeight: '800' } : null,
                  isSelected ? { color: colors.accentBlue, fontWeight: '900' } : null,
                ]}
              >
                {day}
              </Text>
              {status && !future && (
                <View style={[styles.statusDot, { backgroundColor: isSelected ? colors.accentBlue : statusColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.present }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.absent }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Mixed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>No class</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  monthStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  statDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statTxt: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.bgGlass,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '700',
    lineHeight: 22,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
    paddingVertical: 2,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: COLORS.accentBlue,
  },
  dayNum: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  todayNum: {
    color: COLORS.accentBlue,
    fontWeight: '800',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
