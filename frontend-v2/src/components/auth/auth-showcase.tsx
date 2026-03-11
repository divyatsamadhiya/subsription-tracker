"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { AnimatedBlob } from "./animated-blob";
import { FloatingCards } from "./floating-cards";

interface CountUpProps {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}

function CountUp({ target, prefix = "", suffix = "", duration = 2000, decimals = 0 }: CountUpProps) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const factor = Math.pow(10, decimals);
      setValue(Math.round(eased * target * factor) / factor);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration, decimals]);

  return (
    <span>
      {prefix}
      {decimals > 0 ? value.toFixed(decimals) : value.toLocaleString()}
      {suffix}
    </span>
  );
}

const stats = [
  { target: 3200, prefix: "", suffix: "+", label: "Subscriptions tracked", decimals: 0 },
  { target: 48, prefix: "$", suffix: "K", label: "Saved by users", decimals: 0 },
  { target: 99.9, prefix: "", suffix: "%", label: "Uptime", decimals: 1 },
];

export function AuthShowcase() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden rounded-3xl bg-primary/5 p-10 lg:flex">
      <AnimatedBlob />
      <FloatingCards />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary"
              animate={{
                scale: [1, 1.12, 1, 1.08, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: "easeInOut",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
              </svg>
            </motion.div>
            <span className="font-heading text-xl font-semibold tracking-tight">
              Pulseboard
            </span>
          </div>
        </motion.div>

        <motion.p
          className="mt-8 max-w-sm font-heading text-3xl font-semibold leading-tight tracking-tight"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Track every dollar
          <br />
          you subscribe to.
        </motion.p>

        <motion.p
          className="mt-3 max-w-xs text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Smart insights, renewal alerts, and full control over your recurring
          spending — all in one minimal dashboard.
        </motion.p>
      </div>

      <motion.div
        className="relative z-10 flex gap-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-heading text-2xl font-semibold">
              <CountUp
                target={stat.target}
                prefix={stat.prefix}
                suffix={stat.suffix}
                duration={2200}
                decimals={stat.decimals}
              />
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
