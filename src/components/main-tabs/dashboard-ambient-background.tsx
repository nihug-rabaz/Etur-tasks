"use client";

import { motion } from "framer-motion";

export type DashboardAmbientTheme = "recruitment" | "positioning" | "general";

interface DashboardAmbientBackgroundProps {
  theme: DashboardAmbientTheme;
}

const themePalettes: Record<DashboardAmbientTheme, { base: string; orbs: string[] }> = {
  recruitment: {
    base: "dashboard-ambient-base dashboard-ambient-base--recruitment",
    orbs: ["#93c5fd", "#a5b4fc", "#67e8f9", "#c4b5fd"],
  },
  positioning: {
    base: "dashboard-ambient-base dashboard-ambient-base--positioning",
    orbs: ["#f0abfc", "#c4b5fd", "#fda4af", "#a5b4fc"],
  },
  general: {
    base: "dashboard-ambient-base dashboard-ambient-base--general",
    orbs: ["#6ee7b7", "#5eead4", "#7dd3fc", "#a7f3d0"],
  },
};

export function DashboardAmbientBackground({ theme }: DashboardAmbientBackgroundProps) {
  const palette = themePalettes[theme];

  return (
    <div className="pointer-events-none absolute inset-0 min-h-full overflow-hidden" aria-hidden>
      <div className={`${palette.base} absolute inset-0 min-h-full`} />

      {palette.orbs.map((color, index) => (
        <motion.div
          key={`${theme}-${index}`}
          className="dashboard-ambient-orb absolute rounded-full"
          style={{
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            width: index % 2 === 0 ? "42rem" : "36rem",
            height: index % 2 === 0 ? "42rem" : "36rem",
            left: index === 0 ? "-8%" : index === 1 ? "55%" : index === 2 ? "20%" : "70%",
            top: index === 0 ? "-12%" : index === 1 ? "8%" : index === 2 ? "58%" : "45%",
          }}
          animate={{
            x: [0, index % 2 === 0 ? 40 : -35, 0],
            y: [0, index % 2 === 0 ? -28 : 32, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 14 + index * 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="dashboard-ambient-grid absolute inset-0" />
      <motion.div
        className="dashboard-ambient-shimmer absolute inset-0 min-h-full"
        animate={{ opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
