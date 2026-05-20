"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("taskflow-theme");
    const initial: ThemeMode = saved === "light" ? "light" : "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    document.documentElement.style.colorScheme = initial;
  }, []);

  const toggleTheme = () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
    window.localStorage.setItem("taskflow-theme", nextMode);
    document.documentElement.classList.toggle("dark", nextMode === "dark");
    document.documentElement.style.colorScheme = nextMode;
  };

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group inline-flex items-center gap-2 rounded-xl border border-border-weak bg-surface-2/80 px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-accent-primary/60 hover:text-text-primary"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      {isDark ? "בהיר" : "כהה"}
    </button>
  );
}
