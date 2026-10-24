import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend,
  className = '',
  onClick,
}) => {
  const colorMap = {
    default: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-slate-200/80',
      badge: 'bg-emerald-100 text-emerald-800',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-slate-200/80',
      badge: 'bg-blue-100 text-blue-800',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-amber-200/60',
      badge: 'bg-amber-100 text-amber-800',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'border-rose-200/60',
      badge: 'bg-rose-100 text-rose-800',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-200/60',
      badge: 'bg-indigo-100 text-indigo-800',
    },
  };

  const scheme = colorMap[variant] || colorMap.default;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`bg-white rounded-xl border ${scheme.border} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${scheme.bg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scheme.badge}`}>
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>}
    </motion.div>
  );
};
