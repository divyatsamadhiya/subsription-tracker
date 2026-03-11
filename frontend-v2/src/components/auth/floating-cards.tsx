"use client";

import { motion } from "motion/react";

const SERVICES = [
  { name: "Netflix", color: "#E50914", icon: "N", price: "$15.49" },
  { name: "Spotify", color: "#1DB954", icon: "S", price: "$10.99" },
  { name: "YouTube", color: "#FF0000", icon: "Y", price: "$13.99" },
  { name: "iCloud", color: "#3693F5", icon: "iC", price: "$2.99" },
  { name: "Figma", color: "#A259FF", icon: "F", price: "$12.00" },
];

export function FloatingCards() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {SERVICES.map((service, i) => (
        <motion.div
          key={service.name}
          className="absolute flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 shadow-lg backdrop-blur-md dark:bg-white/[0.05]"
          style={{
            top: `${15 + i * 16}%`,
            right: `${8 + (i % 3) * 6}%`,
          }}
          initial={{ opacity: 0, x: 40 }}
          animate={{
            opacity: [0, 0.85, 0.85, 0],
            x: [40, 0, 0, -20],
            y: [0, -6, 6, 0],
          }}
          transition={{
            duration: 8,
            delay: i * 2.5,
            repeat: Infinity,
            repeatDelay: SERVICES.length * 2.5 - 8 + 2,
            ease: "easeInOut",
          }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: service.color }}
          >
            {service.icon}
          </div>
          <div>
            <p className="text-xs font-medium text-foreground/80">
              {service.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {service.price}/mo
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
