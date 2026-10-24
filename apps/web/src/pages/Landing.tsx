import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Database,
  FileSpreadsheet,
  GitCompare,
  HeartPulse,
  LogIn,
  RotateCcw,
  Shield,
  ShieldAlert,
  Truck,
  Zap,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { health } from '../lib/api';
import { Reveal, useCountUp, useInView, usePrefersReducedMotion, useSpotlight } from '../lib/motion';

/**
 * Destination for the "Sign in" action.
 *
 * Left unset it points at `/login` — the route the Firebase auth work will mount.
 * Set `VITE_LOGIN_URL` (e.g. `/login` or a full Firebase-hosted URL) once that
 * workstream lands; no code change required here.
 */
const LOGIN_URL: string = (() => {
  const raw = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LOGIN_URL;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed || '/login';
})();

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-mono text-[11px] uppercase tracking-[0.18em] ${className}`}>{children}</span>;
}

function StatusPill() {
  const { data, isError } = useQuery({ queryKey: ['health'], queryFn: health, retry: false, refetchInterval: 20000 });
  const ok = !isError && data?.status === 'ok';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
      <span className={`relative flex h-1.5 w-1.5 ${ok ? 'pulse-ring' : ''}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </span>
      <Mono className="text-slate-500">
        {isError ? 'engine offline' : ok ? `engine live · ${data?.solver}` : 'connecting'}
      </Mono>
    </div>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-slate-300/50">
      <div
        className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"
        style={{ width: `${progress * 100}%`, transition: 'width 80ms linear' }}
      />
    </div>
  );
}

function Words({ text, startDelay = 0, className = '' }: { text: string; startDelay?: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <span className={className}>
      {text.split(' ').map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={reduced ? '' : 'animate-word'}
          style={reduced ? undefined : { animationDelay: `${startDelay + i * 70}ms` }}
        >
          {word}
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive network demo                                            */
/* ------------------------------------------------------------------ */

type Phase = 'baseline' | 'disrupted' | 'recovered';

const PHASES: Record<Phase, { label: string; fulfillment: number; unmet: number; cost: number; note: string }> = {
  baseline: { label: 'Baseline', fulfillment: 100, unmet: 0, cost: 24240, note: 'All demand covered on primary lanes.' },
  disrupted: { label: 'Lane closed', fulfillment: 89.9, unmet: 500, cost: 22620, note: 'RT-03 out. 500 units of DST-01 unserved.' },
  recovered: { label: 'Recovered', fulfillment: 100, unmet: 0, cost: 26030, note: 'Contingency lane RT-13 absorbs the gap.' },
};

const WAREHOUSES = [
  { id: 'WH-01', y: 46 },
  { id: 'WH-02', y: 130 },
  { id: 'WH-03', y: 214 },
  { id: 'WH-04', y: 298 },
];

const DESTS = [
  { id: 'DST-01', label: 'Metro General', y: 28, priority: 1 },
  { id: 'DST-02', label: 'City DC', y: 66, priority: 2 },
  { id: 'DST-03', label: 'Clinic North', y: 104, priority: 1 },
  { id: 'DST-04', label: 'Urban Hub', y: 142, priority: 3 },
  { id: 'DST-05', label: 'Coastal Med', y: 180, priority: 1 },
  { id: 'DST-06', label: 'Inland', y: 218, priority: 2 },
  { id: 'DST-07', label: 'Mountain', y: 256, priority: 4 },
  { id: 'DST-08', label: 'South Dock', y: 294, priority: 3 },
];

const ACTIVE_LANES: [number, number][] = [
  [46, 66], [46, 218], [130, 180],
  [214, 104], [214, 256], [298, 142], [298, 294],
  [130, 66], [46, 28], [298, 66], [214, 142],
];

function demoLanePath(wy: number, dy: number) {
  return `M 92 ${wy} C 200 ${wy}, 300 ${dy}, 452 ${dy}`;
}

function NetworkDiagram({ phase }: { phase: Phase }) {
  const closed = phase !== 'baseline';
  const recovered = phase === 'recovered';
  const short = phase === 'disrupted';

  return (
    <svg viewBox="0 0 560 340" className="w-full" role="img" aria-label={`Distribution network in the ${phase} state`}>
      <defs>
        <linearGradient id="laneOk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(15,23,42,0.45)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0.10)" />
        </linearGradient>
        <linearGradient id="laneDead" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(220,38,38,0.9)" />
          <stop offset="100%" stopColor="rgba(220,38,38,0.25)" />
        </linearGradient>
        <linearGradient id="laneSave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(5,150,105,0.95)" />
          <stop offset="100%" stopColor="rgba(5,150,105,0.35)" />
        </linearGradient>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {ACTIVE_LANES.map(([wy, dy], i) => (
        <path key={`lane-${i}`} d={demoLanePath(wy, dy)} fill="none" stroke="url(#laneOk)" strokeWidth="1" />
      ))}

      <path
        d={demoLanePath(130, 28)}
        fill="none"
        stroke={closed ? 'url(#laneDead)' : 'rgba(15,23,42,0.38)'}
        strokeWidth={closed ? 1.8 : 1.2}
        strokeDasharray={closed ? '5 4' : undefined}
        className={closed ? 'animate-pulse-line-fast' : undefined}
        style={{ transition: 'stroke 400ms ease' }}
      />

      <path
        d={demoLanePath(214, 28)}
        fill="none"
        stroke={recovered ? 'url(#laneSave)' : 'rgba(5,150,105,0.20)'}
        strokeWidth={recovered ? 2 : 1.1}
        strokeDasharray="3 5"
        className={recovered ? 'animate-pulse-line' : undefined}
        style={{ transition: 'stroke 500ms ease, stroke-width 400ms ease' }}
      />

      {closed && (
        <g filter="url(#softGlow)">
          <circle cx="272" cy="74" r="3.6" fill="#dc2626" />
          <circle cx="272" cy="74" r="9" fill="none" stroke="rgba(220,38,38,0.35)" strokeWidth="1" className="animate-ping-slow" />
        </g>
      )}

      {recovered && (
        <g filter="url(#softGlow)">
          <circle cx="300" cy="150" r="3.2" fill="#059669" />
          <circle cx="300" cy="150" r="9" fill="none" stroke="rgba(5,150,105,0.35)" strokeWidth="1" className="animate-ping-slow" />
        </g>
      )}

      {WAREHOUSES.map((w) => (
        <g key={w.id}>
          <rect x="56" y={w.y - 11} width="36" height="22" rx="4" fill="#ffffff" stroke="rgba(15,23,42,0.16)" />
          <text x="74" y={w.y + 3.5} textAnchor="middle" fill="rgba(15,23,42,0.72)" fontSize="8" fontFamily="ui-monospace, monospace">
            {w.id.slice(3)}
          </text>
          <text x="14" y={w.y + 3} fill="rgba(15,23,42,0.48)" fontSize="7.5" fontFamily="ui-monospace, monospace">
            {w.id}
          </text>
        </g>
      ))}

      {DESTS.map((d) => {
        const isShort = short && d.id === 'DST-01';
        const fill = isShort ? '#dc2626' : d.priority === 1 ? 'rgba(220,38,38,0.85)' : 'rgba(15,23,42,0.45)';
        return (
          <g key={d.id}>
            {isShort && (
              <circle cx="452" cy={d.y} r="8" fill="none" stroke="rgba(220,38,38,0.4)" strokeWidth="1" className="animate-ping-slow" />
            )}
            <circle cx="452" cy={d.y} r={isShort ? 5 : 4} fill={fill} style={{ transition: 'r 300ms ease' }} />
            <text
              x="466"
              y={d.y + 3}
              fill={isShort ? 'rgba(220,38,38,0.95)' : 'rgba(15,23,42,0.55)'}
              fontSize="7.5"
              fontFamily="ui-monospace, monospace"
            >
              {d.label}
            </text>
            {isShort && (
              <text x="466" y={d.y + 13} fill="rgba(220,38,38,0.75)" fontSize="7" fontFamily="ui-monospace, monospace">
                −500 units
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function InteractiveDemo() {
  const [phase, setPhase] = React.useState<Phase>('baseline');
  const data = PHASES[phase];

  const fulfill = useCountUp(data.fulfillment, 700);
  const unmet = useCountUp(data.unmet, 700);
  const cost = useCountUp(data.cost, 700);

  const order: Phase[] = ['baseline', 'disrupted', 'recovered'];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.28)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Mono className="text-slate-400">live model · try it</Mono>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${phase === 'disrupted' ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <Mono className={phase === 'disrupted' ? 'text-red-600' : 'text-emerald-600'}>
            {phase === 'disrupted' ? '1 lane closed' : phase === 'recovered' ? 'recovery active' : 'all lanes open'}
          </Mono>
        </div>
      </div>

      <NetworkDiagram phase={phase} />

      <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {order.map((p) => {
          const active = phase === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={active}
              onClick={() => setPhase(p)}
              className={`rounded-md px-2 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] transition-all ${
                active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-900'
              }`}
            >
              {PHASES[p].label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#e9ebef] pt-4">
        <div>
          <Mono className="text-slate-400">fulfilled</Mono>
          <div
            className={`mt-1 text-xl font-semibold tabular-nums transition-colors ${
              phase === 'disrupted' ? 'text-red-600' : phase === 'recovered' ? 'text-emerald-600' : 'text-slate-900'
            }`}
          >
            <span ref={fulfill.ref}>{fulfill.value.toFixed(1)}%</span>
          </div>
        </div>
        <div>
          <Mono className="text-slate-400">unmet</Mono>
          <div className="mt-1 text-xl font-semibold tabular-nums text-slate-700">
            <span ref={unmet.ref}>{Math.round(unmet.value).toLocaleString()}</span>
          </div>
        </div>
        <div>
          <Mono className="text-slate-400">cost</Mono>
          <div className="mt-1 text-xl font-semibold tabular-nums text-slate-700">
            <span ref={cost.ref}>${Math.round(cost.value).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 min-h-[18px] text-[12px] leading-relaxed text-slate-500">{data.note}</p>

      {phase !== 'baseline' && (
        <button
          type="button"
          onClick={() => setPhase('baseline')}
          className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-slate-400 transition-colors hover:text-slate-700"
        >
          <RotateCcw className="h-3 w-3" /> reset
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Content — deliberately terse                                        */
/* ------------------------------------------------------------------ */

const CAPABILITIES = [
  {
    icon: Database,
    title: 'Validated ingestion',
    body: 'Schema, type and referential checks. Bad rows are reported, never dropped.',
    metric: '0 silent drops',
  },
  {
    icon: Calculator,
    title: 'Constrained allocation',
    body: 'Inventory, capacity, availability, eligibility and priority — solved, not guessed.',
    metric: '5 constraint classes',
  },
  {
    icon: Zap,
    title: 'Four disruption types',
    body: 'Shortage, interruption, closure, delay. Each mutates real inputs and re-solves.',
    metric: 'real input mutation',
  },
  {
    icon: ShieldAlert,
    title: 'Impact analysis',
    body: 'Unmet demand, cost delta, deadline exposure and a documented risk score.',
    metric: 'documented weights',
  },
  {
    icon: HeartPulse,
    title: 'Constraint-checked recovery',
    body: 'Contingency lanes buy back demand; every shipment is verified.',
    metric: '+$3,410 → +10.1pp',
  },
  {
    icon: GitCompare,
    title: 'Comparable, exportable',
    body: 'Three plans side by side. CSV matches the screen exactly.',
    metric: 'export == screen',
  },
];

const WORKFLOW = [
  {
    n: '01',
    title: 'Load',
    icon: Boxes,
    body: 'Sample network or your own CSVs, validated first.',
    facts: ['4 warehouses', '8 destinations', '20 lanes'],
    meter: { label: 'tables validated', display: '6 / 6', ratio: 1, tone: 'neutral' as const },
  },
  {
    n: '02',
    title: 'Plan',
    icon: Calculator,
    body: 'Constrained baseline, every unit attributed.',
    facts: ['27 shipments', '5 constraints', 'greedy · feasible'],
    meter: { label: 'demand fulfilled', display: '100.0%', ratio: 1, tone: 'neutral' as const },
  },
  {
    n: '03',
    title: 'Break',
    icon: Zap,
    body: 'Rewrite the inputs, solve again. No charts faked.',
    facts: ['RT-03 closed', '1 of 20 lanes', '500 at risk'],
    meter: { label: 'lanes available', display: '19 / 20', ratio: 19 / 20, tone: 'warn' as const },
  },
  {
    n: '04',
    title: 'Measure',
    icon: Activity,
    body: 'The gap between two computed plans.',
    facts: ['−500 units', 'risk 23.8', '0 late'],
    meter: { label: 'demand fulfilled', display: '89.9%', ratio: 0.899, tone: 'bad' as const },
  },
  {
    n: '05',
    title: 'Recover',
    icon: HeartPulse,
    body: 'Shortfall bought back, never invented.',
    facts: ['RT-13 · RT-16 · RT-19', '+$3,410', 'residual 0'],
    meter: { label: 'demand recovered', display: '100.0%', ratio: 1, tone: 'good' as const },
  },
  {
    n: '06',
    title: 'Decide',
    icon: FileSpreadsheet,
    body: 'Compare three plans, export what was computed.',
    facts: ['3 plans', '9 KPIs', 'CSV · 5.6 KB'],
    meter: { label: 'export matches screen', display: 'exact', ratio: 1, tone: 'good' as const },
  },
];

const METER_TONE = {
  neutral: { bar: 'bg-slate-400', text: 'text-slate-500' },
  warn: { bar: 'bg-amber-500', text: 'text-amber-600' },
  bad: { bar: 'bg-red-500', text: 'text-red-600' },
  good: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
};

const LIMITS = [
  'Greedy is feasible, not proven optimal. Every plan states its solver.',
  'A route delay raises deadline exposure; it does not delete capacity.',
  'Forecasting is a labelled moving average — no invented accuracy.',
  'No auth, no roles. Single-operator demo by design.',
];

const MARQUEE = [
  'inventory ≤ stock',
  'lane capacity',
  'priority-ordered demand',
  'referential integrity',
  'contingency lanes',
  'deadline exposure',
  'deterministic re-solve',
  'risk score 0–100',
  'residual demand, stated',
  'export == screen',
  'no API key required',
  'runs offline',
];

/* ------------------------------------------------------------------ */

function Meter({ ratio, tone }: { ratio: number; tone: keyof typeof METER_TONE }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className="mt-2 h-1 overflow-hidden rounded-full bg-[#e9ebef]">
      <div
        className={`h-full rounded-full ${METER_TONE[tone].bar}`}
        style={{
          width: inView ? `${Math.round(ratio * 1000) / 10}%` : '0%',
          transition: 'width 950ms cubic-bezier(0.16,1,0.3,1) 140ms',
        }}
      />
    </div>
  );
}

function CapabilityCard({ item, index }: { item: (typeof CAPABILITIES)[number]; index: number }) {
  const ref = useSpotlight<HTMLDivElement>();
  const Icon = item.icon;
  return (
    <Reveal delay={index * 70}>
      <div
        ref={ref}
        className="spotlight group h-full rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors group-hover:border-emerald-400/40 group-hover:bg-emerald-50">
            <Icon className="h-4 w-4 text-slate-500 transition-colors group-hover:text-emerald-600" />
          </span>
          <Mono className="text-slate-400">{item.metric}</Mono>
        </div>
        <h3 className="mt-4 text-[15px] font-medium text-slate-900">{item.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{item.body}</p>
      </div>
    </Reveal>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef0f2] text-slate-900 antialiased">
      <ScrollProgress />

      {/* ---------------- nav ---------------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-300/60 bg-[#eef0f2]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white transition-transform duration-300 group-hover:rotate-[-8deg]">
              <Shield className="h-4 w-4" />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline">
              Pre-Mortem Dispatch
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {[
              ['How it works', '#workflow'],
              ['Capabilities', '#capabilities'],
              ['The maths', '#maths'],
              ['Limits', '#limits'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="group relative text-[13px] text-slate-500 transition-colors hover:text-slate-900"
              >
                {label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-slate-900 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* Sign in — hands off to the Firebase auth route once it lands */}
            <a
              href={LOGIN_URL}
              data-testid="login-button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition-all hover:-translate-y-px hover:border-slate-400 hover:text-slate-900 hover:shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </a>
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:-translate-y-px hover:bg-slate-800 hover:shadow-[0_10px_30px_-10px_rgba(15,23,42,0.6)]"
            >
              <span className="hidden sm:inline">Open console</span>
              <span className="sm:hidden">Console</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- hero ---------------- */}
      <section className="grain relative overflow-hidden pt-32 pb-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-aurora absolute -left-40 top-[-10%] h-[38rem] w-[38rem] rounded-full bg-emerald-400/[0.14] blur-[120px]" />
          <div
            className="animate-aurora absolute -right-32 top-[10%] h-[32rem] w-[32rem] rounded-full bg-sky-400/[0.12] blur-[120px]"
            style={{ animationDelay: '-8s' }}
          />
          <div
            className="animate-aurora absolute left-1/3 top-[45%] h-[26rem] w-[26rem] rounded-full bg-teal-300/[0.12] blur-[110px]"
            style={{ animationDelay: '-15s' }}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(15,23,42,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.055) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(72% 55% at 50% 32%, black, transparent)',
            WebkitMaskImage: 'radial-gradient(72% 55% at 50% 32%, black, transparent)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill />
            <Mono className="text-slate-500">TRIWIZATHON 2026 · Distribution Intelligence</Mono>
          </div>

          <div className="mt-8 grid items-start gap-14 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="lg:pt-6">
              <h1 className="text-[2.6rem] font-semibold leading-[1.03] tracking-[-0.035em] text-slate-900 sm:text-6xl">
                <Words text="Know what breaks" />
                <br />
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent">
                  <Words text="before it breaks." startDelay={260} />
                </span>
              </h1>

              <Reveal delay={520}>
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-600">
                  Plan a distribution network, break it on purpose, and price the recovery — every number computed.
                </p>
              </Reveal>

              <Reveal delay={620}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_40px_-14px_rgba(15,23,42,0.65)]"
                  >
                    Run the workflow
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#demo"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm"
                  >
                    See the six steps
                  </a>
                </div>
              </Reveal>

              <Reveal delay={720}>
                <p className="mt-6 flex items-center gap-2 text-[12px] text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Bundled dataset · no API key · runs offline
                </p>
              </Reveal>
            </div>

            <Reveal delay={300} y={26}>
              <div className="relative">
                <InteractiveDemo />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------- marquee ---------------- */}
      <section className="relative overflow-hidden border-y border-slate-200 bg-white py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
        <div className="animate-marquee flex w-max gap-8">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i} className="flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <span className="h-1 w-1 rounded-full bg-emerald-500/50" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ---------------- the question ---------------- */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl">
            “If this plan fails, what is affected, what can be recovered, what will it cost, and what should we do
            next?”
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              step: 'Plan',
              icon: Calculator,
              accent: 'text-slate-700',
              body: 'Every unit attributed to a warehouse, a lane and a destination.',
              points: ['Inventory ≤ stock', 'Shipments ≤ lane capacity', 'Priority-ordered demand'],
            },
            {
              step: 'Break',
              icon: AlertTriangle,
              accent: 'text-red-600',
              body: 'Rewrite the inputs and solve again. Impact is the gap between plans.',
              points: ['Stock shortage', 'Supply interruption', 'Lane closure / delay'],
            },
            {
              step: 'Recover',
              icon: Truck,
              accent: 'text-emerald-600',
              body: 'Re-plan under damage and state exactly what is still short.',
              points: ['Contingency lanes', 'Per-shipment diffs', 'Residual demand, stated'],
            },
          ].map(({ step, icon: Icon, accent, body, points }, i) => (
            <Reveal key={step} delay={i * 90} className="h-full">
              <div className="group relative h-full rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.25)]">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${accent} transition-transform duration-300 group-hover:scale-110`} />
                  <Mono className="text-slate-500">{step}</Mono>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600">{body}</p>
                <ul className="mt-4 space-y-1.5">
                  {points.map((p) => (
                    <li key={p} className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                      <span className="h-px w-3 bg-slate-300 transition-all duration-300 group-hover:w-5 group-hover:bg-emerald-500/60" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- capabilities ---------------- */}
      <section id="capabilities" className="border-y border-slate-200 bg-[#e6e8eb]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Built for operators, not demos
              </h2>
              <p className="max-w-xs text-[13px] leading-relaxed text-slate-500">
                Nothing here is a placeholder waiting for a backend.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((item, i) => (
              <CapabilityCard key={item.title} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- workflow ---------------- */}
      <section id="workflow" className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Six steps, one unbroken path
          </h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-slate-500">
            No terminal, no code edits. The figures below are real output from the bundled run.
          </p>
        </Reveal>

        <div className="relative mt-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW.map(({ n, title, body, icon: Icon, facts, meter }, i) => (
              <Reveal key={n} delay={i * 70} className="h-full">
                <div className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.25)]">
                  {i < WORKFLOW.length - 1 && (i + 1) % 3 !== 0 && (
                    <span className="absolute -right-[15px] top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 transition-colors duration-300 group-hover:text-emerald-500 lg:block">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}

                  <div className="flex items-start justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors duration-300 group-hover:border-emerald-400/40 group-hover:bg-emerald-50">
                      <Icon className="h-3.5 w-3.5 text-slate-500 transition-colors duration-300 group-hover:text-emerald-600" />
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.12em] text-slate-300 transition-colors group-hover:text-slate-500">
                      {n}
                    </span>
                  </div>

                  <h3 className="mt-4 text-[14px] font-medium text-slate-900">{title}</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">{body}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {facts.map((fact) => (
                      <span
                        key={fact}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 transition-colors group-hover:border-slate-300 group-hover:text-slate-600"
                      >
                        {fact}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="flex items-baseline justify-between">
                      <Mono className="text-slate-400">{meter.label}</Mono>
                      <span className={`font-mono text-[11px] tabular-nums ${METER_TONE[meter.tone].text}`}>
                        {meter.display}
                      </span>
                    </div>
                    <Meter ratio={meter.ratio} tone={meter.tone} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- the maths ---------------- */}
      <section id="maths" className="border-y border-slate-200 bg-[#e6e8eb]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <Reveal>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Feasibility is not a feeling
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Minimise transport cost against a per-unit unmet penalty weighted by destination priority — critical
                demand always beats saving freight.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Feasible is not optimal. The solver status is always shown.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['inventory', 'lane capacity', 'availability', 'eligibility', 'priority'].map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-[10.5px] text-slate-500 transition-colors hover:border-emerald-400/60 hover:text-emerald-700"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0e1015] shadow-[0_20px_50px_-24px_rgba(15,23,42,0.5)]">
              <div className="flex items-center gap-1.5 border-b border-white/[0.08] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <span className="h-2 w-2 rounded-full bg-white/15" />
                <Mono className="ml-2 text-white/30">optimisation.py</Mono>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[11.5px] leading-relaxed text-white/70">
                <span className="text-white/30"># decision variable</span>
                {'\n'}
                <span className="text-emerald-300/90">x</span>[r, p]  <span className="text-white/35">≥ 0</span>
                {'    # units shipped on lane r for product p\n\n'}
                <span className="text-white/30"># hard constraints</span>
                {'\n'}Σ<span className="text-white/45">_r</span> x[r, p] ≤ <span className="text-sky-300/90">inventory</span>[w(r), p]
                {'\n'}Σ<span className="text-white/45">_p</span> x[r, p] ≤ <span className="text-sky-300/90">capacity</span>[r]
                {'\n'}Σ<span className="text-white/45">_r</span> x[r, p] + u[d, p] = <span className="text-sky-300/90">demand</span>[d, p]
                {'\n'}
                <span className="text-white/30"># unavailable lane  ⇒  x = 0</span>
                {'\n\n'}
                <span className="text-white/30"># objective</span>
                {'\n'}min  Σ cost[r]·x[r, p]
                {'\n'}   + Σ 1000 · (6 − priority(d)) · u[d, p]   <span className="text-white/30"># $5,000–$1,000/unit</span>
              </pre>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- limits ---------------- */}
      <section id="limits" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                A model, not a crystal ball
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-500">
                Boundaries enforced in code and printed in the UI.
              </p>
            </div>
          </Reveal>
          <ul className="space-y-3">
            {LIMITS.map((limit, i) => (
              <Reveal as="li" key={limit} delay={i * 80}>
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-[13px] leading-relaxed text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-amber-300">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {limit}
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- final CTA ---------------- */}
      <section className="grain relative overflow-hidden border-t border-slate-200 bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-aurora absolute left-1/2 top-full h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-emerald-400/[0.22] blur-[130px]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Break it on purpose.</h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-slate-500">
              Load the sample, close a lane, watch recovery price itself.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_16px_50px_-14px_rgba(15,23,42,0.7)]"
              >
                Open the console
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href={LOGIN_URL}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- footer ---------------- */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-900">
              <Shield className="h-3 w-3 text-white" />
            </span>
            <span className="text-[12.5px] text-slate-500">Pre-Mortem Dispatch</span>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-mono text-[11px] text-slate-400">
            <span>TRIWIZATHON 2026</span>
            <span>Distribution Intelligence</span>
            <Link to="/dashboard" className="transition-colors hover:text-slate-700">
              Console
            </Link>
            <a href={LOGIN_URL} className="transition-colors hover:text-slate-700">
              Sign in
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
