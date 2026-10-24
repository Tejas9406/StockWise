import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action, footer, noPadding = false }) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-shadow duration-200 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            {title && <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
      {footer && <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 rounded-b-xl">{footer}</div>}
    </div>
  );
};
