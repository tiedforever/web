"use client";

import { useEffect, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
};

export function AnimatedNumber({
  className,
  duration = 700,
  prefix = "",
  suffix = "",
  value,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || duration <= 0) {
      const animationFrame = requestAnimationFrame(() => setDisplayValue(value));

      return () => cancelAnimationFrame(animationFrame);
    }

    const startedAt = performance.now();
    let animationFrame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, value]);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}
