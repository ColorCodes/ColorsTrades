"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value = 0, max = 100, className, indicatorClassName }: { value?: number; max?: number; className?: string; indicatorClassName?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full transition-all", indicatorClassName ?? "bg-primary")} style={{ width: `${pct}%` }} />
    </div>
  );
}
