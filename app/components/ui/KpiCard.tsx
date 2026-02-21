// app/components/ui/KpiCard.tsx
'use client';
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  alertLevel?: 'none' | 'warning' | 'critical';
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  highlight = false,
  alertLevel = 'none',
}: KpiCardProps) {
  const borderColor =
    alertLevel === 'critical'
      ? 'border-red-500'
      : alertLevel === 'warning'
      ? 'border-yellow-500'
      : highlight
      ? 'border-navy-500'
      : 'border-slate-700';

  const trendColor =
    trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';

  return (
    <div
      className={`bg-slate-800 border ${borderColor} rounded-xl p-5 flex flex-col gap-2 hover:border-blue-600 transition-colors duration-200`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && <span className="text-slate-500 text-lg">{icon}</span>}
        {alertLevel !== 'none' && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              alertLevel === 'critical'
                ? 'bg-red-900 text-red-300'
                : 'bg-yellow-900 text-yellow-300'
            }`}
          >
            {alertLevel === 'critical' ? '⚠ 경고' : '주의'}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
      {(subtitle || trendValue) && (
        <div className="flex items-center gap-2">
          {trendValue && (
            <span className={`text-sm font-semibold ${trendColor}`}>
              {trendIcon} {trendValue}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
