"use client";

import { motion } from "motion/react";
import { AnimatedBlob } from "./animated-blob";

const stats = [
  { value: "3,200+", label: "Subscriptions tracked" },
  { value: "$48K", label: "Saved by users" },
  { value: "99.9%", label: "Uptime" },
];

export function AuthShowcase() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden rounded-3xl bg-primary/5 p-10 lg:flex">
      <AnimatedBlob />

      <div className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
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
            </div>
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
            <p className="font-heading text-2xl font-semibold">{stat.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
