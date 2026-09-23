import { cn } from "@/lib/utils";

interface ProgressBarsProps {
  total: number;
  current: number;
  className?: string;
}

export function ProgressBars({ total, current, className }: ProgressBarsProps) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        return (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-500 ease-out"
            style={{
              background: filled
                ? "linear-gradient(90deg, #EEA29B, #C6303E)"
                : "#EDE4E0",
            }}
          />
        );
      })}
    </div>
  );
}

interface BarsDividerProps {
  className?: string;
  barCount?: number;
}

export function BarsDivider({ className, barCount = 16 }: BarsDividerProps) {
  return (
    <div
      className={cn("flex items-end gap-[3px] h-6", className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const t = i / (barCount - 1);
        const height = 40 + Math.sin(t * Math.PI) * 60;
        return (
          <div
            key={i}
            className="w-1 rounded-full"
            style={{
              height: `${height}%`,
              background: "linear-gradient(180deg, #EEA29B, #C6303E)",
              opacity: 1 - t * 0.85,
            }}
          />
        );
      })}
    </div>
  );
}
