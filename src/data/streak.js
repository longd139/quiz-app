// Study Streak & Activity Heatmap Engine

export function getLocalDateStr(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Format English date: "Saturday, Oct 18, 2026"
export function formatVNDate(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDate(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[d.getDay()];
  const m = months[d.getMonth()];
  const dd = d.getDate();
  const yyyy = d.getFullYear();
  return `${dayName}, ${m} ${dd}, ${yyyy}`;
}
export const formatENDate = formatVNDate;

// Record study activity into data.activityLog
export function recordStudyActivity(curData, count = 1) {
  if (!curData) return curData;
  const todayStr = getLocalDateStr();
  const currentLog = curData.activityLog || {};
  const currentTodayCount = currentLog[todayStr] || 0;

  return {
    ...curData,
    activityLog: {
      ...currentLog,
      [todayStr]: currentTodayCount + count
    },
    lastActivityAt: new Date().toISOString()
  };
}

// Aggregate all activity from activityLog, test history, and vocabStats
export function getAllActivityMap(data) {
  const map = { ...(data?.activityLog || {}) };

  // 1. Practice / Quiz test history
  if (Array.isArray(data?.history)) {
    data.history.forEach(item => {
      const iso = item.completedAt || item.startedAt;
      if (iso) {
        const dateStr = getLocalDateStr(new Date(iso));
        const questionsCount = item.totalQuestions || (Array.isArray(item.questions) ? item.questions.length : 1);
        map[dateStr] = (map[dateStr] || 0) + Math.max(1, questionsCount);
      }
    });
  }

  // 2. Vocab stats lastReviewed
  if (data?.vocabStats && typeof data.vocabStats === 'object') {
    Object.values(data.vocabStats).forEach(st => {
      if (st?.lastReviewed) {
        const dateStr = getLocalDateStr(new Date(st.lastReviewed));
        const count = (st.reviewCount || 0) + (st.correctCount || 0) || 1;
        // vocabStats is cumulative, but for days without explicit activityLog, record presence
        if (!map[dateStr]) {
          map[dateStr] = Math.min(20, count);
        }
      }
    });
  }

  return map;
}

// Calculate streak, heatmap weeks, active days, best streak, and motivational badges
export function calculateStreakStats(data, numWeeks = 20) {
  const activityMap = getAllActivityMap(data);
  const today = new Date();
  const todayStr = getLocalDateStr(today);

  // Yesterday dateStr
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  const todayCount = activityMap[todayStr] || 0;
  const hasStudiedToday = todayCount > 0;

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let checkDate = new Date(today);

  // If haven't studied today yet, check if yesterday was active to preserve streak
  if (!hasStudiedToday) {
    if ((activityMap[yesterdayStr] || 0) > 0) {
      // Streak is still alive from yesterday! Count backwards starting yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dStr = getLocalDateStr(checkDate);
        if ((activityMap[dStr] || 0) > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }
  } else {
    // Has studied today, count backwards starting today
    while (true) {
      const dStr = getLocalDateStr(checkDate);
      if ((activityMap[dStr] || 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // 2. Calculate Best Streak & Total Active Days
  const activeDates = Object.keys(activityMap)
    .filter(dStr => (activityMap[dStr] || 0) > 0)
    .sort();

  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;
  let totalActivities = 0;
  let tempStreakStart = activeDates[0] ? parseLocalDate(activeDates[0]) : null;
  let bestStreakStart = tempStreakStart;
  let bestStreakEnd = tempStreakStart;

  for (const dStr of activeDates) {
    const act = activityMap[dStr] || 0;
    totalActivities += act;
    const curD = parseLocalDate(dStr);

    if (!prevDate) {
      tempStreak = 1;
      tempStreakStart = curD;
    } else {
      const diffMs = curD.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
        tempStreakStart = curD;
      }
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
      bestStreakStart = tempStreakStart;
      bestStreakEnd = curD;
    }
    prevDate = curD;
  }

  if (currentStreak >= bestStreak && currentStreak > 0) {
    bestStreak = currentStreak;
    const end = hasStudiedToday ? today : yesterday;
    const start = new Date(end);
    start.setDate(start.getDate() - (currentStreak - 1));
    bestStreakStart = start;
    bestStreakEnd = end;
  }

  const totalActiveDays = activeDates.length;

  // 3. Generate Heatmap Grid (7 rows = Mon..Sun, N columns = weeks)
  // Find coming Sunday (end of current week)
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1..6 Mon..Sat
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + daysUntilSunday);
  endSunday.setHours(23, 59, 59, 999);

  // Total days to display = numWeeks * 7
  const totalDays = numWeeks * 7;
  const startMonday = new Date(endSunday);
  startMonday.setDate(endSunday.getDate() - totalDays + 1);
  startMonday.setHours(0, 0, 0, 0);

  const weeks = [];
  const monthLabels = [];
  let curIter = new Date(startMonday);
  let lastRecordedMonth = -1;

  for (let w = 0; w < numWeeks; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      const cellDateStr = getLocalDateStr(curIter);
      const isToday = cellDateStr === todayStr;
      const isFuture = curIter.getTime() > today.getTime() && !isToday;
      const count = isFuture ? 0 : (activityMap[cellDateStr] || 0);

      let level = 0;
      if (count > 0) {
        if (count <= 5) level = 1;
        else if (count <= 15) level = 2;
        else if (count <= 30) level = 3;
        else level = 4;
      }

      // Check for month label at the top
      const m = curIter.getMonth();
      if (m !== lastRecordedMonth && curIter.getDate() <= 14) {
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        monthLabels.push({
          colIndex: w,
          label: monthNames[m]
        });
        lastRecordedMonth = m;
      }

      weekDays.push({
        dateStr: cellDateStr,
        dayOfWeek: d, // 0 = Mon, 6 = Sun
        count,
        level,
        isToday,
        isFuture,
        formattedDate: formatVNDate(cellDateStr)
      });

      curIter.setDate(curIter.getDate() + 1);
    }
    weeks.push(weekDays);
  }

  // 4. Motivational Milestones
  const milestones = [
    { target: 3, label: '3 days', title: 'Starter', unlocked: bestStreak >= 3 },
    { target: 7, label: '7 days', title: 'Persistent', unlocked: bestStreak >= 7 },
    { target: 14, label: '14 days', title: 'Breakthrough', unlocked: bestStreak >= 14 },
    { target: 30, label: '30 days', title: 'Warrior', unlocked: bestStreak >= 30 },
    { target: 60, label: '60 days', title: 'Legendary', unlocked: bestStreak >= 60 }
  ];

  // 5. Friendly Status Micro-copy
  let statusText;
  let statusType;

  if (hasStudiedToday) {
    if (currentStreak >= 7) {
      statusText = `🔥 On a ${currentStreak}-day streak! You completed ${todayCount} activities today. Awesome!`;
      statusType = 'fire';
    } else if (currentStreak >= 3) {
      statusText = `⚡ Keeping up a ${currentStreak}-day streak! ${todayCount} activities today. Keep it up!`;
      statusType = 'great';
    } else {
      statusText = `✓ You completed ${todayCount} activities today. Streak: ${currentStreak} days!`;
      statusType = 'good';
    }
  } else {
    if (currentStreak > 0) {
      statusText = `⏳ Your ${currentStreak}-day streak is waiting! Complete at least 1 lesson to keep the flame alive today.`;
      statusType = 'warning';
    } else {
      statusText = `🌱 Complete 1 lesson today to spark your first streak flame!`;
      statusType = 'start';
    }
  }

  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtShort = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${monthsEn[dt.getMonth()]} ${dt.getDate()}`;
  };

  let currentStreakRange = 'No streak yet';
  if (currentStreak > 0) {
    const end = hasStudiedToday ? today : yesterday;
    const start = new Date(end);
    start.setDate(start.getDate() - (currentStreak - 1));
    currentStreakRange = `${fmtShort(start)} - ${hasStudiedToday ? 'Present' : fmtShort(end)}`;
  }

  let totalDateRange = 'Starting today';
  if (activeDates.length > 0) {
    const firstDate = parseLocalDate(activeDates[0]);
    totalDateRange = `${fmtShort(firstDate)} - Present`;
  }

  let bestStreakRange = 'No streak yet';
  if (bestStreak > 0) {
    if (bestStreakStart && bestStreakEnd) {
      bestStreakRange = `${fmtShort(bestStreakStart)} - ${fmtShort(bestStreakEnd)}`;
    } else {
      bestStreakRange = `${bestStreak} days`;
    }
  }

  const streakTier = getStreakTier(currentStreak);
  const nextTier = STREAK_TIERS.find(t => t.minDays > currentStreak) || null;

  const totalMoosks = typeof data?.mooskCount === 'number' ? data.mooskCount : (
    (data?.vocabDecks || []).filter(
      d => d.cards && d.cards.length > 0 && d.cards.every(c => data?.vocabStats?.[c.id]?.mastered)
    ).length
  );

  return {
    todayStr,
    hasStudiedToday,
    todayCount,
    currentStreak,
    bestStreak,
    totalActiveDays,
    totalActivities,
    totalMoosks,
    totalMoosk: totalMoosks,
    weeks,
    monthLabels,
    milestones,
    statusText,
    statusType,
    streakTier,
    nextTier,
    currentStreakRange,
    totalDateRange,
    bestStreakRange
  };
}

// =========================================================
// STREAK EVOLUTION TIERS (Màu sắc tiến hóa theo chuỗi ngày)
// =========================================================
export const STREAK_TIERS = [
  {
    level: 0,
    minDays: 0,
    maxDays: 0,
    id: 'dormant',
    name: 'Tro Tàn',
    tag: 'Chưa thắp lửa',
    description: 'Chưa có chuỗi ngày học',
    badgeText: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
    flameGradient: 'from-slate-400 via-slate-500 to-slate-600',
    topGlow: 'from-slate-400/40 via-slate-500/40 to-slate-600/40',
    glowColor: 'rgba(148, 163, 184, 0.25)',
    accentColor: '#94a3b8',
    cardBorder: 'border-slate-200/80 dark:border-slate-800'
  },
  {
    level: 1,
    minDays: 1,
    maxDays: 2,
    id: 'warm',
    name: 'Hạt Lửa Ấm',
    tag: 'Khởi đầu (1-2 ngày)',
    description: 'Ngọn lửa sơ khai ấm áp bắt đầu thắp sáng',
    badgeText: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800',
    flameGradient: 'from-amber-500 via-orange-500 to-yellow-400',
    topGlow: 'from-amber-500 via-orange-500 to-yellow-400',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    accentColor: '#f59e0b',
    cardBorder: 'border-amber-500/30 dark:border-amber-500/20'
  },
  {
    level: 2,
    minDays: 3,
    maxDays: 6,
    id: 'blaze',
    name: 'Lửa Đỏ Rực',
    tag: 'Bùng cháy (3-6 ngày)',
    description: 'Ngọn lửa đỏ cam rực rỡ, bùng nổ nhiệt lượng mạnh mẽ',
    badgeText: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800',
    flameGradient: 'from-red-600 via-rose-500 to-amber-500',
    topGlow: 'from-red-600 via-rose-500 to-amber-500',
    glowColor: 'rgba(239, 68, 68, 0.55)',
    accentColor: '#f43f5e',
    cardBorder: 'border-rose-500/30 dark:border-rose-500/20'
  },
  {
    level: 3,
    minDays: 7,
    maxDays: 13,
    id: 'cyan',
    name: 'Lửa Lam Ngọc',
    tag: 'Cao nhiệt (7-13 ngày)',
    description: 'Đạt mốc 1 tuần! Ngọn lửa xanh lam tỏa nhiệt lượng cực lớn',
    badgeText: 'text-cyan-600 dark:text-cyan-300',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800',
    flameGradient: 'from-blue-600 via-cyan-500 to-teal-300',
    topGlow: 'from-blue-600 via-cyan-500 to-teal-300',
    glowColor: 'rgba(6, 182, 212, 0.6)',
    accentColor: '#06b6d4',
    cardBorder: 'border-cyan-500/30 dark:border-cyan-500/20'
  },
  {
    level: 4,
    minDays: 14,
    maxDays: 29,
    id: 'violet',
    name: 'Lửa Tím Thần Bí',
    tag: 'Huyền bí (14-29 ngày)',
    description: 'Chuỗi 2 tuần! Ngọn lửa plasma tím huyền ảo và quyền năng',
    badgeText: 'text-purple-600 dark:text-purple-300',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800',
    flameGradient: 'from-violet-600 via-purple-500 to-pink-400',
    topGlow: 'from-violet-600 via-purple-500 to-pink-400',
    glowColor: 'rgba(168, 85, 247, 0.65)',
    accentColor: '#a855f7',
    cardBorder: 'border-purple-500/30 dark:border-purple-500/20'
  },
  {
    level: 5,
    minDays: 30,
    maxDays: 59,
    id: 'emerald',
    name: 'Lửa Lục Bảo',
    tag: 'Chiến thần (30-59 ngày)',
    description: 'Chuỗi 1 tháng! Ngọn lửa ngọc lục bảo rồng thiêng vô cùng hiếm',
    badgeText: 'text-emerald-600 dark:text-emerald-300',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
    flameGradient: 'from-emerald-600 via-teal-500 to-lime-400',
    topGlow: 'from-emerald-600 via-teal-500 to-lime-400',
    glowColor: 'rgba(16, 185, 129, 0.7)',
    accentColor: '#10b981',
    cardBorder: 'border-emerald-500/30 dark:border-emerald-500/20'
  },
  {
    level: 6,
    minDays: 60,
    maxDays: 99,
    id: 'solar',
    name: 'Lửa Thái Dương',
    tag: 'Hoàng kim (60-99 ngày)',
    description: 'Chuỗi 2 tháng! Ngọn lửa hoàng kim ánh dương chói lọi vương giả',
    badgeText: 'text-amber-600 dark:text-yellow-300',
    badgeBg: 'bg-yellow-50 dark:bg-yellow-950/60 border-yellow-400 dark:border-yellow-700',
    flameGradient: 'from-amber-500 via-yellow-400 to-amber-200',
    topGlow: 'from-amber-500 via-yellow-400 to-amber-200',
    glowColor: 'rgba(234, 179, 8, 0.8)',
    accentColor: '#eab308',
    cardBorder: 'border-yellow-500/40 dark:border-yellow-500/30'
  },
  {
    level: 7,
    minDays: 100,
    maxDays: Infinity,
    id: 'cosmic',
    name: 'Lửa Cực Quang Vô Cực',
    tag: 'Thần thoại (100+ ngày)',
    description: '100+ ngày! Ngọn lửa cực quang vũ trụ đổi màu đa sắc bất tử',
    badgeText: 'text-pink-600 dark:text-pink-300',
    badgeBg: 'bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-cyan-500/15 border-pink-300 dark:border-pink-800',
    flameGradient: 'from-purple-500 via-pink-500 to-cyan-400',
    topGlow: 'from-purple-500 via-pink-500 to-cyan-400',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    accentColor: '#ec4899',
    cardBorder: 'border-pink-500/40 dark:border-pink-500/30'
  }
];

export function getStreakTier(streakCount) {
  const c = Math.max(0, Number(streakCount) || 0);
  for (let i = STREAK_TIERS.length - 1; i >= 0; i--) {
    if (c >= STREAK_TIERS[i].minDays) {
      return STREAK_TIERS[i];
    }
  }
  return STREAK_TIERS[0];
}
