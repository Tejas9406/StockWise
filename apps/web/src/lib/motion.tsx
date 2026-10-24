import * as React from 'react';

/**
 * Scroll-reveal primitives. IntersectionObserver rather than listening to scroll,
 * so reveals stay cheap even on a long page.
 */

export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px', ...options },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span';
  y?: number;
};

/** Fades + lifts its children into place once they enter the viewport. */
export function Reveal({ children, delay = 0, className = '', as = 'div', y = 18 }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Tag = as as 'div';
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px)' : `translateY(${y}px)`,
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Tag>
  );
}

/** Counts from the previous value to `target` with an ease-out curve. Returns the raw number. */
export function useCountUp(target: number, duration = 850) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = React.useState(0);
  const from = React.useRef(0);

  React.useEffect(() => {
    if (!inView) return;
    const start = from.current;
    if (start === target) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(start + (target - start) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return { ref, value };
}

/** Sets --mx / --my on the element so CSS can render a cursor-following spotlight. */
export function useSpotlight<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        node.style.setProperty('--mx', `${x}px`);
        node.style.setProperty('--my', `${y}px`);
        raf = 0;
      });
    };
    node.addEventListener('mousemove', onMove);
    return () => {
      node.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}
