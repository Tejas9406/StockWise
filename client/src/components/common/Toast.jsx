import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ isVisible, message, type = 'success', onClose }) => {
  const configs = {
    success: {
      bg: 'bg-emerald-600 text-white',
      icon: CheckCircle2,
    },
    error: {
      bg: 'bg-rose-600 text-white',
      icon: AlertCircle,
    },
    info: {
      bg: 'bg-slate-800 text-white',
      icon: Info,
    },
  };

  const config = configs[type] || configs.success;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl shadow-slate-900/10 text-sm max-w-md border border-white/20 select-none"
          style={{ backgroundColor: type === 'success' ? '#059669' : type === 'error' ? '#e11d48' : '#1e293b' }}
        >
          <Icon className="w-5 h-5 text-white shrink-0" />
          <span className="text-white font-medium flex-1">{message}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
