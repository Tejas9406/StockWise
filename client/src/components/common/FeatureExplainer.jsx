import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, X, Sparkles, ArrowRight } from 'lucide-react';

export const FeatureExplainer = ({
  badge = 'Feature Guide',
  title,
  purpose,
  whyItMatters,
  suggestedAction,
  actionLink,
  actionText,
  storageKey,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (!storageKey) return false;
    return localStorage.getItem(`stockwise_guide_${storageKey}`) === 'dismissed';
  });

  if (isDismissed) {
    return (
      <div className="flex justify-end mb-3">
        <button
          onClick={() => {
            setIsDismissed(false);
            if (storageKey) localStorage.removeItem(`stockwise_guide_${storageKey}`);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-all shadow-sm"
        >
          <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
          <span>Show Feature Guide</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative mb-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 sm:p-6 shadow-[0_12px_36px_rgba(5,150,105,0.18)] border border-emerald-500/30 overflow-hidden transition-all duration-300">
      {/* Decorative ambient glowing backdrops */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {badge}
              </span>
              <span className="text-xs text-emerald-200/60 font-medium">Plain-English FMCG Business Guide</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h3>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 transition-all"
            title={isOpen ? 'Collapse Details' : 'Expand Details'}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setIsDismissed(true);
              if (storageKey) localStorage.setItem(`stockwise_guide_${storageKey}`, 'dismissed');
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/40 text-emerald-200 hover:text-white transition-all"
            title="Dismiss this guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="relative z-10 mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          {/* Card 1: What It Is */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 backdrop-blur-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
              🎯 What this does
            </div>
            <p className="text-slate-200 leading-relaxed text-xs">
              {purpose}
            </p>
          </div>

          {/* Card 2: Why It Matters */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 backdrop-blur-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300 mb-1">
              💼 Why your business needs it
            </div>
            <p className="text-slate-200 leading-relaxed text-xs">
              {whyItMatters}
            </p>
          </div>

          {/* Card 3: What To Do */}
          <div className="bg-emerald-900/30 rounded-2xl p-3.5 border border-emerald-500/20 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1">
                ⚡ What you should do next
              </div>
              <p className="text-emerald-100/90 leading-relaxed text-xs">
                {suggestedAction}
              </p>
            </div>
            {actionLink && actionText && (
              <a
                href={actionLink}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                <span>{actionText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureExplainer;
