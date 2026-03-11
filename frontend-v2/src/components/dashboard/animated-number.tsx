"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (n: number) => string;
  className?: string;
}

const defaultFormat = (n: number) => String(Math.round(n));

export function AnimatedNumber({
  value,
  duration = 0.8,
  formatFn = defaultFormat,
  className,
}: AnimatedNumberProps) {
  const motionValue = useRef(useMotionValue(0)).current;
  const formatRef = useRef(formatFn);
  formatRef.current = formatFn;

  const rounded = useRef(
    useTransform(motionValue, (v) => formatRef.current(v))
  ).current;

  const [display, setDisplay] = useState(() => formatFn(0));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });

    const unsubscribe = rounded.on("change", (v) => setDisplay(v));

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, duration, motionValue, rounded]);

  return <motion.span className={className}>{display}</motion.span>;
}
