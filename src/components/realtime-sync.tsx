"use client";

/**
 * Legacy full-page refresh removed in favor of TasksLiveSyncProvider delta polling.
 * Kept as a no-op export so any residual imports stay safe.
 */
export function RealtimeSync() {
  return null;
}
