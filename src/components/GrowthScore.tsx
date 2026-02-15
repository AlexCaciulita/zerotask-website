'use client';

import { useEffect, useState } from 'react';

interface GrowthScoreProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  delta?: number;
  label?: string;
  animate?: boolean;
}

export default function GrowthScore({
  score,
  maxScore = 100,
  size = 160,
  strokeWidth = 10,
  delta,
  label = 'Growth Score',
  animate = true,
}: GrowthScoreProps) {
  const [current, setCurrent] = useState(animate ? 0 : score);

  useEffect(() => {
    if (!animate) return;
    let frame: number;
    const duration = 1500;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCurrent(Math.round(eased * score));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (current / maxScore) * circumference;
  const center = size / 2;

  const color = current < 30 ? '#ef4444' : current < 60 ? '#f59e0b' : '#10b981';
  const bgColor = current < 30 ? 'rgba(239,68,68,0.08)' : current < 60 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill={bgColor}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: animate ? 'none' : 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums text-text-primary" style={{ lineHeight: 1 }}>
            {current}
          </span>
          <span className="text-xs text-text-tertiary mt-1">/ {maxScore}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      {delta !== undefined && (
        <p className={`text-xs font-semibold ${delta >= 0 ? 'text-accent' : 'text-danger'}`}>
          {delta >= 0 ? '+' : ''}{delta} this week
        </p>
      )}
    </div>
  );
}
