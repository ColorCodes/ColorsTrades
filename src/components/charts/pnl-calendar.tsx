"use client";
import { dailyPnl, type TradeLike } from "@/lib/analytics";
import { formatCurrency } from "@/lib/utils";

export function PnlCalendar({ trades }: { trades: TradeLike[] }) {
  const map = dailyPnl(trades);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: { date: Date; key: string; pnl: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, key, pnl: map.get(key) ?? 0 });
  }
  // pad so first column starts on Monday
  const firstDow = days[0].date.getDay(); // 0 Sun
  const leadPad = firstDow === 0 ? 6 : firstDow - 1;
  const maxAbs = Math.max(1, ...days.map((d) => Math.abs(d.pnl)));

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
        {Array.from({ length: leadPad }).map((_, i) => (
          <div key={`pad-${i}`} className="size-3 sm:size-4 rounded-sm" />
        ))}
        {days.map((d) => {
          const intensity = Math.min(1, Math.abs(d.pnl) / maxAbs);
          const bg = d.pnl === 0 ? "hsl(var(--muted))" : d.pnl > 0 ? `hsl(var(--success) / ${0.25 + intensity * 0.75})` : `hsl(var(--destructive) / ${0.25 + intensity * 0.75})`;
          return (
            <div
              key={d.key}
              className="size-3 sm:size-4 rounded-sm"
              style={{ background: bg }}
              title={`${d.key}: ${formatCurrency(d.pnl)}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>90d</span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-destructive/80" /> loss
          <span className="inline-block size-2.5 rounded-sm bg-muted mx-1" /> flat
          <span className="inline-block size-2.5 rounded-sm bg-success/80" /> win
        </span>
      </div>
    </div>
  );
}
