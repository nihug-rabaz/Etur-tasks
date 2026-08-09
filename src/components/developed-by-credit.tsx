"use client";

import Image from "next/image";

interface DevelopedByCreditProps {
  className?: string;
  compact?: boolean;
}

export function DevelopedByCredit({ className = "", compact = false }: DevelopedByCreditProps) {
  return (
    <div
      className={`flex items-center justify-center gap-2.5 text-center ${className}`}
      dir="rtl"
    >
      <Image
        src="/nihug-logo.png"
        alt="תחום ניהו״ג"
        width={compact ? 36 : 44}
        height={compact ? 36 : 44}
        className={`shrink-0 rounded-full object-contain ${compact ? "h-9 w-9" : "h-11 w-11"}`}
      />
      <p
        className={`font-medium leading-snug text-text-secondary ${
          compact ? "text-[0.6875rem]" : "text-xs sm:text-sm"
        }`}
      >
        פותח ע״י תחום ניהו״ג · מטה הרבנות הצבאית
      </p>
    </div>
  );
}
