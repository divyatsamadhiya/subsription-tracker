"use client";

import { motion } from "motion/react";

export function AnimatedBlob() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-primary/20 blur-3xl"
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 50, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -right-1/4 -bottom-1/4 h-[500px] w-[500px] rounded-full bg-chart-4/15 blur-3xl"
        animate={{
          x: [0, -50, 40, 0],
          y: [0, 60, -30, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/3 left-1/3 h-[350px] w-[350px] rounded-full bg-chart-2/10 blur-3xl"
        animate={{
          x: [0, 40, -60, 0],
          y: [0, -50, 20, 0],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
