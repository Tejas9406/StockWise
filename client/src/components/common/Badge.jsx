import React from 'react';

export const Badge = ({ children, variant = 'gray', size = 'sm', className = '', dot = false }) => {
  const variants = {
    gray: 'bg-slate-100 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    blue: 'bg-blue-50 text-blue-700 border-blue-200/70',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/70',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/70',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/70',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
    teal: 'bg-teal-50 text-teal-700 border-teal-200/70',
  };

  const dotColors = {
    gray: 'bg-slate-400',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variants[variant] || variants.gray} ${
        sizes[size] || sizes.sm
      } ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-slate-400'}`} />}
      {children}
    </span>
  );
};
