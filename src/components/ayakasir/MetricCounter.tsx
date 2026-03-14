"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MetricCounterProps = {
  value: number;
  locale: string;
  durationMs?: number;
  className?: string;
};

export default function MetricCounter({
  value,
  locale,
  durationMs = 1200,
  className
}: MetricCounterProps) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const target = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

  useEffect(() => {
    const node = spanRef.current;
    if (!node || hasAnimated.current) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const startAnimation = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      if (prefersReduced) {
        setDisplay(target);
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            startAnimation();
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(node);
      return () => observer.disconnect();
    }

    startAnimation();
  }, [durationMs, target]);

  const formatted = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale).format(display);
    } catch {
      return String(display);
    }
  }, [display, locale]);

  return (
    <span ref={spanRef} className={className} aria-label={formatted}>
      {formatted}
    </span>
  );
}
