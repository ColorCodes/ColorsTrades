"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const RANGES = ["1M", "3M", "6M", "YTD", "1Y", "ALL"] as const;

export function RangeTabs({ current }: { current: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar">
      {RANGES.map((r) => (
        <Link
          key={r}
          href={`/dashboard?range=${r}`}
          scroll={false}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
            r === current ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          {r}
        </Link>
      ))}
    </div>
  );
}
