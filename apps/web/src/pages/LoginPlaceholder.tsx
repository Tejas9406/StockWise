import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogIn, Shield } from 'lucide-react';

/**
 * Placeholder for `/login`.
 *
 * The Firebase authentication module is owned by another workstream. This page
 * exists only so the "Sign in" affordances on the landing page never lead
 * anywhere dead before that module lands.
 *
 * ── To wire up real auth ────────────────────────────────────────────────
 * Option A: replace this component's body with the team's Firebase sign-in UI.
 * Option B: leave the repo alone and set `VITE_LOGIN_URL` in `.env` to the
 *           auth route or hosted URL — the landing page reads that value and
 *           this placeholder stops being reachable.
 */
export default function LoginPlaceholder() {
  const rawTarget = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LOGIN_URL;
  const target = typeof rawTarget === 'string' && rawTarget.trim() ? rawTarget.trim() : '(not configured)';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef0f2] px-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.28)]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Pre-Mortem Dispatch</span>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
          Authentication is being wired up by the team&apos;s Firebase module. This page is a placeholder so the
          &ldquo;Sign in&rdquo; button never leads anywhere dead.
        </p>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">VITE_LOGIN_URL</div>
          <div className="mt-1 break-all font-mono text-[12px] text-slate-700">{target}</div>
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
          The console runs without an account today. You can continue straight through.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-slate-800"
          >
            Continue to console
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-[13px] text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-2 border-t border-slate-200 pt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-400">
          <LogIn className="h-3 w-3" />
          awaiting firebase module
        </div>
      </div>
    </div>
  );
}
