import { cn, getValueClass } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: number | null;
  icon?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  trend,
  icon = ">",
  className,
}: StatCardProps) {
  return (
    <div className={cn("stat-card", className)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <span className="text-terminal-cyan">{icon}</span>
          <span>{label}</span>
        </div>
        {trend !== undefined && trend !== null && (
          <span className={cn("text-sm tabular-nums", getValueClass(trend))}>
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="mt-2 sm:mt-3">
        <div className="text-xl sm:text-2xl font-semibold text-terminal-green tabular-nums">
          {value}
        </div>
        {subValue && (
          <div className="text-sm text-text-muted mt-1">{subValue}</div>
        )}
      </div>
    </div>
  );
}
