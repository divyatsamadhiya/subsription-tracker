"use client";

import { motion } from "motion/react";
import { buildSparklinePaths } from "@/lib/sparkline-paths";

interface SparklineProps {
  data: number[];
  className?: string;
  color?: string;
  height?: number;
  width?: number;
}

export function Sparkline({
  data,
  className,
  color = "currentColor",
  height = 24,
  width = 64,
}: SparklineProps) {
  const paths = buildSparklinePaths(data, width, height);
  if (!paths) return null;

  const gradientId = `spark-fill-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={paths.areaPath}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.path
        d={paths.linePath}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      />
    </svg>
  );
}
