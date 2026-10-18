import { memo } from 'react';
import { getStreakTier, getFlameSizeClass } from '../data/streak';

/**
 * AnimatedFlame Component
 * Multi-layer living fire with dancing outer flame, fluid inner core,
 * floating glowing ember sparks, and pulsing heat aura.
 * Supports evolving color tiers and progressive size scaling based on streak count!
 */
function AnimatedFlame({
  className = "",
  active = true,
  showSparks = true,
  streak = undefined,
  colorScheme = undefined // 'warm' | 'blaze' | 'cyan' | 'violet' | 'emerald' | 'solar' | 'cosmic' | 'dormant' | 'fire'
}) {
  // If streak is provided, automatically derive the tier colorScheme
  let scheme = 'warm';
  if (colorScheme) {
    if (colorScheme === 'fire' || colorScheme === 'sunset') scheme = 'warm';
    else scheme = colorScheme;
  } else if (streak !== undefined) {
    const tier = getStreakTier(streak);
    scheme = tier.id;
  }

  const idSuffix = scheme;

  // Progressive flame size that expands smoothly based on streak count & color evolution tier
  const hasExplicitSize = /\b[wh]-\d/.test(className);
  const sizeClass = hasExplicitSize ? '' : getFlameSizeClass(streak ?? (scheme === 'dormant' ? 0 : 2));

  // Configuration for each evolution tier
  const TIER_COLORS = {
    dormant: {
      halo: 'radial-gradient(circle, rgba(148, 163, 184, 0.4) 0%, rgba(100, 116, 139, 0) 70%)',
      outer: ['#475569', '#64748b', '#94a3b8', '#cbd5e1'],
      inner: ['#64748b', '#94a3b8', '#cbd5e1', '#f1f5f9'],
      core: ['#cbd5e1', '#ffffff'],
      sparks: ['#94a3b8', '#cbd5e1', '#e2e8f0'],
      dropShadow: 'drop-shadow-[0_2px_6px_rgba(100,116,139,0.3)]'
    },
    warm: {
      halo: 'radial-gradient(circle, rgba(245, 158, 11, 0.65) 0%, rgba(234, 88, 12, 0) 70%)',
      outer: ['#ea580c', '#f59e0b', '#fbbf24', '#fde047'],
      inner: ['#f97316', '#facc15', '#fef08a', '#ffffff'],
      core: ['#fde047', '#ffffff'],
      sparks: ['#fde047', '#fef08a', '#fbbf24'],
      dropShadow: 'drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]'
    },
    blaze: {
      halo: 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 0%, rgba(220, 38, 38, 0) 70%)',
      outer: ['#991b1b', '#dc2626', '#f97316', '#fbbf24'],
      inner: ['#ea580c', '#f97316', '#fde047', '#ffffff'],
      core: ['#fbbf24', '#ffffff'],
      sparks: ['#fca5a5', '#fdba74', '#fecdd3'],
      dropShadow: 'drop-shadow-[0_2px_10px_rgba(239,68,68,0.6)]'
    },
    cyan: {
      halo: 'radial-gradient(circle, rgba(6, 182, 212, 0.7) 0%, rgba(2, 132, 199, 0) 70%)',
      outer: ['#0369a1', '#0284c7', '#06b6d4', '#38bdf8'],
      inner: ['#0891b2', '#22d3ee', '#a5f3fc', '#ffffff'],
      core: ['#67e8f9', '#ffffff'],
      sparks: ['#67e8f9', '#a5f3fc', '#cffafe'],
      dropShadow: 'drop-shadow-[0_2px_10px_rgba(6,182,212,0.6)]'
    },
    violet: {
      halo: 'radial-gradient(circle, rgba(168, 85, 247, 0.7) 0%, rgba(126, 34, 206, 0) 70%)',
      outer: ['#6d28d9', '#9333ea', '#c084fc', '#f472b6'],
      inner: ['#7e22ce', '#c084fc', '#f472b6', '#ffffff'],
      core: ['#e9d5ff', '#ffffff'],
      sparks: ['#f0abfc', '#e879f9', '#fbcfe8'],
      dropShadow: 'drop-shadow-[0_2px_10px_rgba(168,85,247,0.6)]'
    },
    emerald: {
      halo: 'radial-gradient(circle, rgba(16, 185, 129, 0.7) 0%, rgba(5, 150, 105, 0) 70%)',
      outer: ['#047857', '#059669', '#10b981', '#86efac'],
      inner: ['#059669', '#34d399', '#a7f3d0', '#ffffff'],
      core: ['#6ee7b7', '#ffffff'],
      sparks: ['#86efac', '#a7f3d0', '#bbf7d0'],
      dropShadow: 'drop-shadow-[0_2px_10px_rgba(16,185,129,0.6)]'
    },
    solar: {
      halo: 'radial-gradient(circle, rgba(234, 179, 8, 0.8) 0%, rgba(202, 138, 4, 0) 70%)',
      outer: ['#b45309', '#d97706', '#facc15', '#fef08a'],
      inner: ['#d97706', '#eab308', '#fef08a', '#ffffff'],
      core: ['#fef08a', '#ffffff'],
      sparks: ['#fef08a', '#fde047', '#ffffff'],
      dropShadow: 'drop-shadow-[0_2px_12px_rgba(234,179,8,0.7)]'
    },
    cosmic: {
      halo: 'radial-gradient(circle, rgba(236, 72, 153, 0.8) 0%, rgba(139, 92, 246, 0.4) 50%, rgba(59, 130, 246, 0) 75%)',
      outer: ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981'],
      inner: ['#f43f5e', '#a855f7', '#38bdf8', '#ffffff'],
      core: ['#e0e7ff', '#ffffff'],
      sparks: ['#f472b6', '#38bdf8', '#a7f3d0'],
      dropShadow: 'drop-shadow-[0_2px_14px_rgba(236,72,153,0.7)]'
    }
  };

  const currentTheme = TIER_COLORS[scheme] || TIER_COLORS.warm;

  return (
    <div className={`relative inline-flex items-center justify-center select-none transition-all duration-300 ${sizeClass} ${className}`}>
      {/* Background ambient heat aura */}
      {active && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-70 animate-flame-heat pointer-events-none"
          style={{ background: currentTheme.halo }}
        />
      )}

      <svg
        viewBox="0 0 36 42"
        className={`w-full h-full overflow-visible ${currentTheme.dropShadow}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`flameOuter_${idSuffix}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={currentTheme.outer[0]} />
            <stop offset="35%" stopColor={currentTheme.outer[1]} />
            <stop offset="70%" stopColor={currentTheme.outer[2]} />
            <stop offset="100%" stopColor={currentTheme.outer[3]} />
          </linearGradient>

          <linearGradient id={`flameInner_${idSuffix}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={currentTheme.inner[0]} />
            <stop offset="45%" stopColor={currentTheme.inner[1]} />
            <stop offset="85%" stopColor={currentTheme.inner[2]} />
            <stop offset="100%" stopColor={currentTheme.inner[3]} />
          </linearGradient>

          <linearGradient id={`flameCore_${idSuffix}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={currentTheme.core[0]} stopOpacity="0.8" />
            <stop offset="100%" stopColor={currentTheme.core[1]} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Ember Sparks floating up from flame */}
        {active && showSparks && (
          <g className="ember-sparks pointer-events-none">
            <circle
              cx="17"
              cy="8"
              r="1.2"
              fill={currentTheme.sparks[0]}
              className="animate-spark-1"
            />
            <circle
              cx="19"
              cy="10"
              r="1"
              fill={currentTheme.sparks[1]}
              className="animate-spark-2"
            />
            <circle
              cx="15"
              cy="12"
              r="0.8"
              fill={currentTheme.sparks[2]}
              className="animate-spark-3"
            />
            {/* Extra sparks for higher tiers (cyan, violet, emerald, solar, cosmic) */}
            {(scheme === 'cyan' || scheme === 'violet' || scheme === 'emerald' || scheme === 'solar' || scheme === 'cosmic' || (streak && streak >= 7)) && (
              <>
                <circle
                  cx="22"
                  cy="7"
                  r="1.1"
                  fill={currentTheme.sparks[0]}
                  className="animate-spark-1"
                  style={{ animationDelay: '0.4s' }}
                />
                <circle
                  cx="13"
                  cy="9"
                  r="0.9"
                  fill={currentTheme.sparks[1]}
                  className="animate-spark-3"
                  style={{ animationDelay: '0.6s' }}
                />
              </>
            )}
          </g>
        )}

        {/* Outer Flame Tongue */}
        <g
          className={active ? 'animate-flame-outer' : ''}
          style={{ transformOrigin: '18px 38px' }}
        >
          <path
            d="M18 3.5C18.8 8.2 15 11.5 11.5 15C8 18.5 6 22.8 7.5 28C9 33.2 13.5 37.5 18 38C22.5 37.5 27 33.2 28.5 28C30 22.8 28 18.5 24.5 15C22.2 12.5 20.8 10 20.5 7C19.8 10 18.2 11.8 15.5 13C16.8 9.5 17.5 6.2 18 3.5Z"
            fill={`url(#flameOuter_${idSuffix})`}
          />
        </g>

        {/* Middle Flame Body */}
        <g
          className={active ? 'animate-flame-inner' : ''}
          style={{ transformOrigin: '18px 36px' }}
        >
          <path
            d="M18 14C19.2 17.5 17 20 14.5 22.5C12.2 24.8 11.5 27.8 12.8 31.2C14 34.5 16 36.5 18 36.8C20 36.5 22 34.5 23.2 31.2C24.5 27.8 23.8 24.8 21.5 22.5C19.8 20.8 19 18.8 18.8 16.5C18.2 18.5 17.2 19.5 15.8 20.2C16.5 18 17.2 15.8 18 14Z"
            fill={`url(#flameInner_${idSuffix})`}
          />
        </g>

        {/* Inner White-Hot Core */}
        <g
          className={active ? 'animate-flame-core' : ''}
          style={{ transformOrigin: '18px 36px' }}
        >
          <path
            d="M18 24C18.6 26.2 17.2 27.8 15.8 29.2C14.5 30.5 14.2 32.2 15 34C15.8 35.8 17 36.5 18 36.6C19 36.5 20.2 35.8 21 34C21.8 32.2 21.5 30.5 20.2 29.2C19.2 28.2 18.8 26.8 18.6 25.5C18.2 26.8 17.5 27.2 16.5 27.8C17 26.5 17.5 25.2 18 24Z"
            fill={`url(#flameCore_${idSuffix})`}
          />
        </g>
      </svg>
    </div>
  );
}

export default memo(AnimatedFlame);
