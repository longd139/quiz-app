import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuiz } from '../App';
import { calculateStreakStats } from '../data/streak';
import {
  IconChevronDown,
  IconChevronUp
} from './Icons';
import AnimatedFlame from './AnimatedFlame';

const THEMES = {
  emerald: {
    id: 'emerald',
    name: 'Emerald (Xanh lục)',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-500 dark:text-emerald-400',
    accentBorder: 'border-emerald-500/30',
    glow: 'rgba(16, 185, 129, 0.25)',
    flameGradient: 'from-amber-400 via-emerald-500 to-teal-500',
    levels: {
      0: 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800',
      1: 'bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300/50 dark:border-emerald-800/60',
      2: 'bg-emerald-300 dark:bg-emerald-800/90 border border-emerald-400/60 dark:border-emerald-700/60',
      3: 'bg-emerald-500 dark:bg-emerald-600 border border-emerald-500 dark:border-emerald-500 shadow-xs shadow-emerald-500/20',
      4: 'bg-emerald-400 dark:bg-emerald-400 border border-emerald-300 shadow-sm shadow-emerald-400/40 ring-1 ring-emerald-300/80'
    }
  },
  violet: {
    id: 'violet',
    name: 'Cyber Violet (Tím neon)',
    accentBg: 'bg-indigo-500',
    accentText: 'text-indigo-500 dark:text-indigo-400',
    accentBorder: 'border-indigo-500/30',
    glow: 'rgba(99, 102, 241, 0.25)',
    flameGradient: 'from-fuchsia-400 via-indigo-500 to-cyan-400',
    levels: {
      0: 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800',
      1: 'bg-indigo-200 dark:bg-indigo-950/80 border border-indigo-300/50 dark:border-indigo-800/60',
      2: 'bg-indigo-400 dark:bg-indigo-800/90 border border-indigo-400/60 dark:border-indigo-700/60',
      3: 'bg-indigo-500 dark:bg-indigo-600 border border-indigo-500 dark:border-indigo-500 shadow-xs shadow-indigo-500/20',
      4: 'bg-fuchsia-400 dark:bg-fuchsia-400 border border-fuchsia-300 shadow-sm shadow-fuchsia-400/40 ring-1 ring-fuchsia-300/80'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Flame (Lửa cam)',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-500 dark:text-amber-400',
    accentBorder: 'border-amber-500/30',
    glow: 'rgba(245, 158, 11, 0.25)',
    flameGradient: 'from-amber-400 via-orange-500 to-rose-500',
    levels: {
      0: 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800',
      1: 'bg-amber-200 dark:bg-amber-950/80 border border-amber-300/50 dark:border-amber-800/60',
      2: 'bg-orange-300 dark:bg-orange-800/90 border border-orange-400/60 dark:border-orange-700/60',
      3: 'bg-orange-500 dark:bg-orange-600 border border-orange-500 dark:border-orange-500 shadow-xs shadow-orange-500/20',
      4: 'bg-rose-500 dark:bg-rose-500 border border-rose-400 shadow-sm shadow-rose-500/40 ring-1 ring-rose-400/80'
    }
  }
};

export default function StreakHeatmap({ onQuickStudy, className = '' }) {
  const { data } = useQuiz();
  const navigate = useNavigate();

  // Settings in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('streak_heatmap_collapsed') === 'true';
  });
  const [weeksRange] = useState(() => {
    localStorage.setItem('streak_heatmap_weeks', '52');
    return 52;
  });

  const [pacmanEnabled, setPacmanEnabled] = useState(() => {
    return localStorage.getItem('streak_pacman_mode') !== 'false';
  });

  const [eatenKeys, setEatenKeys] = useState([]);
  const [respawnEffect, setRespawnEffect] = useState(false);

  const togglePacman = () => {
    setPacmanEnabled(prev => {
      const next = !prev;
      localStorage.setItem('streak_pacman_mode', String(next));
      if (!next) {
        setEatenKeys([]);
      }
      return next;
    });
  };

  const [hoveredCell, setHoveredCell] = useState(null);
  const scrollContainerRef = useRef(null);

  const theme = THEMES.emerald;

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('streak_heatmap_collapsed', String(next));
      return next;
    });
  };

  const stats = useMemo(() => {
    return calculateStreakStats(data, weeksRange);
  }, [data, weeksRange]);

  // Target green cells (cells with active contributions)
  const targetGreenCells = useMemo(() => {
    const list = [];
    if (!stats?.weeks) return list;
    stats.weeks.forEach((week, wIdx) => {
      week.forEach((cell, dIdx) => {
        if ((cell.count > 0 || cell.level > 0) && !cell.isFuture) {
          list.push({
            dateStr: cell.dateStr,
            wIdx,
            dIdx,
            count: cell.count,
            level: cell.level
          });
        }
      });
    });

    // If no green cells exist yet, target today's cell so Pacman has a goal
    if (list.length === 0) {
      stats.weeks.forEach((week, wIdx) => {
        week.forEach((cell, dIdx) => {
          if (cell.isToday) {
            list.push({ dateStr: cell.dateStr, wIdx, dIdx, count: 0, level: 0 });
          }
        });
      });
    }

    return list;
  }, [stats.weeks]);

  const [pacmanPos, setPacmanPos] = useState(null);
  const [ghostPos, setGhostPos] = useState(null);
  const [pacmanDir, setPacmanDir] = useState({ scaleX: 1, rotate: 0 });
  const [eatingDate, setEatingDate] = useState(null);
  const [isChomping, setIsChomping] = useState(false);
  const gridAreaRef = useRef(null);

  const pacmanGridRef = useRef({ w: 0, d: 0 });
  const trailRef = useRef([]);
  const targetIdxRef = useRef(0);
  const pauseTicksRef = useRef(0);

  // Tile-by-tile crawler loop: moves 1 cell at a time along the grid
  useEffect(() => {
    if (!pacmanEnabled || targetGreenCells.length === 0) {
      setPacmanPos(null);
      setGhostPos(null);
      return;
    }

    const getCellPixel = (w, d) => {
      if (!gridAreaRef.current) return null;
      const el = gridAreaRef.current.querySelector(`[data-cell-coord="${w}-${d}"]`);
      if (!el) return null;
      const containerRect = gridAreaRef.current.getBoundingClientRect();
      const cellRect = el.getBoundingClientRect();
      const rawX = cellRect.left - containerRect.left + cellRect.width / 2;
      const rawY = cellRect.top - containerRect.top + cellRect.height / 2;
      // Clamp X safely inside container so Pacman / Ghost never trigger horizontal scrollbar
      const clampedX = Math.max(12, Math.min(containerRect.width - 14, rawX));
      return {
        x: clampedX,
        y: rawY
      };
    };

    // Initialize to first target green cell if starting fresh
    const firstTarget = targetGreenCells[0];
    if (pacmanGridRef.current.w === 0 && pacmanGridRef.current.d === 0) {
      pacmanGridRef.current = { w: firstTarget.wIdx, d: firstTarget.dIdx };
    }
    const startW = pacmanGridRef.current.w;
    const startD = pacmanGridRef.current.d;
    trailRef.current = Array(4).fill({ w: Math.max(0, startW - 1), d: startD });
    pauseTicksRef.current = 0;

    const initialPos = getCellPixel(startW, startD);
    if (initialPos) {
      setPacmanPos(initialPos);
      setGhostPos({ x: initialPos.x - 22, y: initialPos.y });
    }

    const timer = setInterval(() => {
      if (!gridAreaRef.current) return;

      // Pause while actively eating
      if (pauseTicksRef.current > 0) {
        pauseTicksRef.current -= 1;
        return;
      }

      const curTarget = targetGreenCells[targetIdxRef.current % targetGreenCells.length];
      if (!curTarget) return;

      const { w: curW, d: curD } = pacmanGridRef.current;
      const destW = curTarget.wIdx;
      const destD = curTarget.dIdx;

      // Reached destination green square!
      if (curW === destW && curD === destD) {
        setEatingDate(curTarget.dateStr);
        setIsChomping(true);
        setTimeout(() => setIsChomping(false), 600);

        // Add to eaten keys so the square vanishes
        setEatenKeys(prev => {
          if (prev.includes(curTarget.dateStr)) return prev;
          const updated = [...prev, curTarget.dateStr];
          // When all green squares have been eaten, automatically regrow them
          if (updated.length >= targetGreenCells.length) {
            setTimeout(() => {
              setEatenKeys([]);
              setRespawnEffect(true);
              setTimeout(() => setRespawnEffect(false), 900);
            }, 1200);
          }
          return updated;
        });

        // Pause for 2 ticks (~560ms) to chew the food leisurely
        pauseTicksRef.current = 2;

        // Advance to next green target square
        targetIdxRef.current = (targetIdxRef.current + 1) % targetGreenCells.length;
        return;
      }

      // Crawl 1 tile closer to destination (Manhattan path)
      let nextW = curW;
      let nextD = curD;
      let scaleX = 1;
      let rotate = 0;

      if (curW !== destW) {
        if (destW > curW) {
          nextW = curW + 1;
          scaleX = 1;
          rotate = 0;
        } else {
          nextW = curW - 1;
          scaleX = -1;
          rotate = 0;
        }
      } else if (curD !== destD) {
        if (destD > curD) {
          nextD = curD + 1;
          scaleX = 1;
          rotate = 90;
        } else {
          nextD = curD - 1;
          scaleX = 1;
          rotate = -90;
        }
      }

      // Update trail history for Ghost
      trailRef.current.push({ w: curW, d: curD });
      if (trailRef.current.length > 4) {
        trailRef.current.shift();
      }
      const ghostTile = trailRef.current[0] || { w: curW, d: curD };

      pacmanGridRef.current = { w: nextW, d: nextD };
      setPacmanDir({ scaleX, rotate });

      const pPix = getCellPixel(nextW, nextD);
      const gPix = getCellPixel(ghostTile.w, ghostTile.d);

      if (pPix) setPacmanPos(pPix);
      if (gPix) setGhostPos(gPix);
    }, 280);

    const handleResize = () => {
      const { w, d } = pacmanGridRef.current;
      const pPix = getCellPixel(w, d);
      if (pPix) setPacmanPos(pPix);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [pacmanEnabled, targetGreenCells]);

  // Active color tier: automatically evolves as current streak grows!
  const activeTier = stats.streakTier;

  // Auto-scroll to end of heatmap (current week) on first mount / range change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [weeksRange, collapsed]);

  const nextMilestone = useMemo(() => {
    const next = stats.milestones.find(m => stats.currentStreak < m.target);
    if (!next) return { target: 100, label: '100 ngày', title: 'Huyền thoại', remaining: 0 };
    return { ...next, remaining: next.target - stats.currentStreak };
  }, [stats.milestones, stats.currentStreak]);

  const handleStartQuickStudy = () => {
    if (onQuickStudy) {
      onQuickStudy();
      return;
    }
    // Default fallback: open first available vocab deck or practice
    if (data?.vocabDecks?.length > 0) {
      navigate('/vocab-quiz', { state: { deckId: data.vocabDecks[0].id, studyMode: 'continue' } });
    } else if (data?.tests?.length > 0) {
      navigate('/practice-setup', { state: { preSelectIdx: 0 } });
    } else {
      navigate('/vocab');
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/70 backdrop-blur-md shadow-xs transition-all duration-300 ${className}`}
    >
      {/* GitHub Readme Streak Stats Hero Card */}
      <div className="relative bg-white dark:bg-[#0d1117] text-slate-900 dark:text-white border-b border-slate-200/90 dark:border-slate-800/80 transition-colors">
        {/* Top-Right Action Controls (Collapse toggle) */}
        <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-4 z-10 flex items-center gap-2">
          <button
            onClick={toggleCollapsed}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title={collapsed ? 'Expand activity heatmap' : 'Collapse'}
            aria-label={collapsed ? 'Expand activity heatmap' : 'Collapse'}
          >
            {collapsed ? <IconChevronDown className="w-4 h-4" /> : <IconChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* 3-Column GitHub Streak Stats Hero Grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800/80 py-5 sm:py-6 px-2 sm:px-6 items-center">
          {/* Column 1: Total Moosk */}
          <div
            className="flex flex-col items-center justify-center text-center px-1 sm:px-3 cursor-default"
            title="Mỗi khi hoàn thành được 1 bộ từ vựng sẽ tăng 1 Moosk"
          >
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-600 dark:text-[#58a6ff] tracking-tight leading-none drop-shadow-xs">
              {(typeof data?.mooskCount === 'number' ? data.mooskCount : (stats.totalMoosks ?? 0)).toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-[#79c0ff] mt-2 sm:mt-2.5 leading-tight flex items-center justify-center gap-1">
              <span>Total Moosk</span>
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-[#7ee787] mt-1 line-clamp-1">
              {stats.totalDateRange}
            </span>
          </div>

          {/* Column 2: Current Streak */}
          <div className="flex flex-col items-center justify-center text-center px-1 sm:px-3">
            <div className="flex items-center justify-center gap-1.5 leading-none">
              <span
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-none drop-shadow-xs"
                style={{
                  color: stats.currentStreak === 0 ? '#94a3b8' : (activeTier.accentColor || '#d97706'),
                  textShadow: stats.currentStreak > 0 ? `0 0 16px ${activeTier.glowColor}` : 'none'
                }}
              >
                {stats.currentStreak}
              </span>
              <AnimatedFlame
                active={stats.currentStreak > 0 || stats.hasStudiedToday}
                showSparks={stats.currentStreak >= 3}
                colorScheme={activeTier.id}
                streak={stats.currentStreak}
                className="shrink-0 transition-all duration-300"
              />
            </div>

            <span
              className="text-xs sm:text-sm font-semibold mt-2 sm:mt-2.5 leading-tight"
              style={{ color: stats.currentStreak === 0 ? '#64748b' : (activeTier.accentColor || '#d97706') }}
            >
              Current Streak
            </span>

            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-[#7ee787] mt-1 line-clamp-1">
              {stats.currentStreakRange}
            </span>
          </div>

          {/* Column 3: Longest Streak */}
          <div className="flex flex-col items-center justify-center text-center px-1 sm:px-3">
            <span className="text-2xl sm:text-3xl md:text-4xl font-black text-blue-600 dark:text-[#58a6ff] tracking-tight leading-none drop-shadow-xs">
              {stats.bestStreak}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-[#79c0ff] mt-2 sm:mt-2.5 leading-tight">
              Longest Streak
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-[#7ee787] mt-1 line-clamp-1">
              {stats.bestStreakRange}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Heatmap Body */}
      {!collapsed && (
        <div className="p-4 sm:p-5 pt-3 space-y-4">
          {/* Section Title & Controls */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs">
              Activity Heatmap
            </span>
            <button
              type="button"
              onClick={togglePacman}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 border ${
                pacmanEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title={pacmanEnabled ? 'Click to disable Pacman animation' : 'Click to enable Pacman animation'}
            >
              <span className="text-xs">ᗧ</span>
              <span>Pacman:</span>
              <span className={`font-bold ${pacmanEnabled ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400'}`}>
                {pacmanEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Heatmap Grid Wrapper */}
          <div className="relative">
            {/* Scrollable Container with hidden scrollbar to prevent ugly scrollbar popping */}
            <div
              ref={scrollContainerRef}
              className="overflow-x-auto pb-2 scroll-smooth select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="min-w-[820px] w-full pr-4">
                {/* Month Headers */}
                <div className="flex items-center w-full mb-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium select-none">
                  {/* Spacer matching day label width */}
                  <div className="w-7 shrink-0" />
                  {/* Relative bar with month names */}
                  <div className="relative flex-1 h-4">
                    {stats.monthLabels.map((m, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'absolute',
                          left: `${(m.colIndex / (stats.weeks.length || 52)) * 100}%`
                        }}
                        className="whitespace-nowrap -translate-x-1/4"
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day Labels + Columns */}
                <div ref={gridAreaRef} className="flex items-start w-full relative">
                  {/* Pacman & Ghost Retro Animation Runner (Targeting Green Cells) */}
                  {pacmanEnabled && pacmanPos && (
                    <>
                      {/* Ghost (Blinky) Trailing Pacman */}
                      {ghostPos && (
                        <div
                          className="pointer-events-none absolute z-20 select-none"
                          style={{
                            left: `${ghostPos.x}px`,
                            top: `${ghostPos.y}px`,
                            transform: 'translate(-50%, -50%)',
                            transition: 'left 280ms linear, top 280ms linear',
                            willChange: 'left, top'
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 32 32"
                            className="shrink-0 drop-shadow-[0_2px_5px_rgba(239,68,68,0.5)]"
                          >
                            <path
                              fill="#ef4444"
                              d="M 4 16 A 12 12 0 0 1 28 16 L 28 28 L 24 24 L 20 28 L 16 24 L 12 28 L 8 24 L 4 28 Z"
                            />
                            <ellipse cx="11" cy="14" rx="3.5" ry="4.5" fill="#ffffff" />
                            <ellipse cx="21" cy="14" rx="3.5" ry="4.5" fill="#ffffff" />
                            <circle cx="12" cy="14" r="1.8" fill="#1e3a8a" />
                            <circle cx="22" cy="14" r="1.8" fill="#1e3a8a" />
                          </svg>
                        </div>
                      )}

                      {/* Pacman Chomping directly to Green Target Cell */}
                      <div
                        className="pointer-events-none absolute z-30 select-none"
                        style={{
                          left: `${pacmanPos.x}px`,
                          top: `${pacmanPos.y}px`,
                          transform: `translate(-50%, -50%) scaleX(${pacmanDir.scaleX}) rotate(${pacmanDir.rotate}deg)`,
                          transition: 'left 280ms linear, top 280ms linear',
                          willChange: 'left, top, transform'
                        }}
                      >
                        {/* Floating Score Floater when eating green square */}
                        {isChomping && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-500 dark:text-amber-300 drop-shadow animate-bounce whitespace-nowrap">
                            +100
                          </span>
                        )}

                        {/* Pacman SVG */}
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 32 32"
                          className="shrink-0 drop-shadow-[0_2px_8px_rgba(250,204,21,0.85)]"
                        >
                          <path
                            fill="#facc15"
                            d="M 16 16 L 32 6 A 16 16 0 1 0 32 26 Z"
                          >
                            <animate
                              attributeName="d"
                              values="M 16 16 L 32 6 A 16 16 0 1 0 32 26 Z; M 16 16 L 32 15.5 A 16 16 0 1 0 32 16.5 Z; M 16 16 L 32 6 A 16 16 0 1 0 32 26 Z"
                              dur="0.28s"
                              repeatCount="indefinite"
                            />
                          </path>
                        </svg>
                      </div>
                    </>
                  )}

                  {/* Left day labels: Mon, Wed, Fri, Sun */}
                  <div className="flex flex-col gap-[3px] sm:gap-[3.5px] text-[9px] font-medium text-slate-400 dark:text-slate-500 w-7 shrink-0 select-none pt-[1px]">
                    <span className="h-3 sm:h-3.5 flex items-center leading-none">Mon</span>
                    <span className="h-3 sm:h-3.5 flex items-center leading-none opacity-0">Tue</span>
                    <span className="h-3 sm:h-3.5 flex items-center leading-none">Wed</span>
                    <span className="h-3 sm:h-3.5 flex items-center leading-none opacity-0">Thu</span>
                    <span className="h-3 sm:h-3.5 flex items-center leading-none">Fri</span>
                    <span className="h-3 sm:h-3.5 flex items-center leading-none opacity-0">Sat</span>
                    <span className="h-3 sm:h-3.5 flex items-center leading-none">Sun</span>
                  </div>

                  {/* Weeks Columns: spans the entire remaining width */}
                  <div className="flex justify-between flex-1 gap-[2px] sm:gap-[3px]">
                    {stats.weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-[3px] sm:gap-[3.5px] flex-1 items-center max-w-[18px]">
                        {week.map((cell, dIdx) => {
                          const isEaten = pacmanEnabled && eatenKeys.includes(cell.dateStr);
                          const isBeingEaten = pacmanEnabled && isChomping && eatingDate === cell.dateStr;
                          const displayLevel = isEaten ? 0 : cell.level;
                          const levelClass = theme.levels[displayLevel];
                          const isHovered = hoveredCell?.dateStr === cell.dateStr;

                          return (
                            <div
                              key={dIdx}
                              data-cell-key={cell.dateStr}
                              data-cell-coord={`${wIdx}-${dIdx}`}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoveredCell({
                                  ...cell,
                                  isEaten,
                                  x: rect.left + rect.width / 2,
                                  y: rect.top
                                });
                              }}
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => {
                                if (cell.isToday && !stats.hasStudiedToday) {
                                  handleStartQuickStudy();
                                }
                              }}
                              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[3px] transition-all duration-200 cursor-pointer ${levelClass} ${
                                cell.isToday
                                  ? 'ring-2 ring-amber-400 dark:ring-amber-400/90 ring-offset-1 dark:ring-offset-slate-900 z-10'
                                  : ''
                              } ${
                                cell.isFuture
                                  ? 'opacity-20 border border-dashed border-slate-300 dark:border-slate-700 bg-transparent pointer-events-none'
                                  : 'hover:scale-135 hover:z-20'
                              } ${isHovered ? 'scale-135 z-20 shadow-md' : ''} ${
                                isBeingEaten ? 'scale-75 opacity-60' : ''
                              } ${
                                respawnEffect && cell.level > 0 ? 'animate-in zoom-in-75 duration-300' : ''
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Rich Tooltip rendered via Portal so it is never clipped */}
            {hoveredCell && !hoveredCell.isFuture && typeof document !== 'undefined' && createPortal(
              <div
                className="fixed z-[9999] pointer-events-none mb-2 bg-slate-900/95 dark:bg-black/95 text-white backdrop-blur-md px-3 py-2 rounded-xl text-xs shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-100 min-w-[170px]"
                style={{
                  left: `${hoveredCell.x}px`,
                  top: `${hoveredCell.y - 8}px`,
                  transform: (hoveredCell.x > (typeof window !== 'undefined' ? window.innerWidth - 180 : 800))
                    ? 'translate(calc(-100% + 14px), -100%)'
                    : (hoveredCell.x < 140)
                      ? 'translate(-14px, -100%)'
                      : 'translate(-50%, -100%)'
                }}
              >
                <div className="font-semibold text-slate-200 text-[11px]">
                  {hoveredCell.formattedDate}
                  {hoveredCell.isToday && (
                    <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Today
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <span className={`w-2 h-2 rounded-full ${hoveredCell.count > 0 ? theme.accentBg : 'bg-slate-500'}`} />
                  <span className="font-bold text-white">
                    {hoveredCell.count > 0 ? `${hoveredCell.count} ${hoveredCell.count === 1 ? 'study activity' : 'study activities'}` : 'No study activity'}
                  </span>
                  {hoveredCell.isEaten && (
                    <span className="ml-1 text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      ᗧ Eaten!
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {hoveredCell.count === 0
                    ? 'Rest day 🌱'
                    : (hoveredCell.count <= 5
                      ? 'Light study ⚡'
                      : (hoveredCell.count <= 15
                        ? 'Active study ⭐'
                        : (hoveredCell.count <= 30
                          ? 'High productivity 🚀'
                          : 'Streak master 🔥')))}
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Bottom Footer: Heatmap Legend */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {/* Heatmap Legend */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <span>Less</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((lvl) => (
                  <div
                    key={lvl}
                    className={`w-2.5 h-2.5 rounded-[2px] ${theme.levels[lvl]}`}
                    title={`Level ${lvl}`}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
