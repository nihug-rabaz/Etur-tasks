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
  const label = isDark ? "מצב בהיר" : "מצב כהה";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white transition hover:border-white/45 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:h-auto sm:w-auto sm:gap-2 sm:rounded-full sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{isDark ? "בהיר" : "כהה"}</span>
    </button>
  );
}
