import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Database,
  Calculator,
  Zap,
  HeartPulse,
  GitCompare,
  Download,
  Shield,
  Activity,
} from 'lucide-react';
import { health } from '../lib/api';
import { cn } from '../lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/planner', label: 'Planner', icon: Calculator },
  { to: '/disruption', label: 'Disruption Lab', icon: Zap },
  { to: '/recovery', label: 'Recovery', icon: HeartPulse },
  { to: '/compare', label: 'Compare', icon: GitCompare },
  { to: '/exports', label: 'Exports', icon: Download },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: h } = useQuery({
    queryKey: ['health'],
    queryFn: health,
    refetchInterval: 15000,
    retry: false,
  });
  const location = useLocation();

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  const healthOk = h?.status === 'ok' && h?.db === 'ok';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Pre-Mortem Dispatch</div>
              <div className="text-xs text-slate-500">Resilience planning &amp; recovery</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                healthOk ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700',
              )}
              title={h ? JSON.stringify(h) : 'checking...'}
            >
              <span className={cn('h-2 w-2 rounded-full', healthOk ? 'bg-emerald-500' : 'bg-amber-500')} />
              {healthOk ? 'API healthy' : h ? 'API degraded' : 'Checking...'}
              {h?.solver ? ` · ${h.solver}` : ''}
            </div>
            <div className="hidden items-center gap-1 text-xs text-slate-500 md:flex">
              <Activity className="h-3.5 w-3.5" />
              Ops Console
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r bg-white md:block">
          <nav className="sticky top-14 p-3">
            <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Navigate</div>
            <div className="space-y-1">
              {nav.map((item) => {
                const active = isActive(item.to, item.exact);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
            <div className="mt-6 rounded-lg border bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-700">Workflow</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">
                1. Load datasets → 2. Generate baseline → 3. Simulate disruption → 4. Recover → 5. Compare → 6. Export
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content — rendered exactly once so ids, state and focus stay unique */}
        <main className="min-w-0 flex-1">
          {/* Mobile nav: same destinations, horizontal scroll */}
          <div className="flex gap-1 overflow-x-auto border-b bg-white p-2 md:hidden">
            {nav.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium',
                    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700',
                  )}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
