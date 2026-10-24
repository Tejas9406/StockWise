import React from 'react';

export const Select = ({
  label,
  id,
  value,
  onChange,
  options = [],
  error,
  helperText,
  disabled = false,
  required = false,
  className = '',
  placeholder = 'Select option...',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`block w-full rounded-lg border text-sm text-slate-900 bg-white px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer ${
          error
            ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20'
            : 'border-slate-300 hover:border-slate-400'
        } ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
