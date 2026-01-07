import { cn, getValueClass } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: number | null;
  icon?: string;
  className?: string;
  index?: number;
}

export function StatCard({
  label,
  value,
  subValue,
  trend,
  icon = ">",
  className,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={cn("stat-card", className)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <span className="text-terminal-cyan">{icon}</span>
          <span className="truncate">{label}</span>
        </div>
        {trend !== undefined && trend !== null && (
          <span className={cn("text-xs sm:text-sm tabular-nums", getValueClass(trend))}>
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="mt-2 sm:mt-3">
        <div className="text-lg sm:text-2xl font-semibold text-terminal-green tabular-nums truncate">
          {value}
        </div>
        {subValue && (
          <div className="text-xs sm:text-sm text-text-muted mt-1 truncate">{subValue}</div>
        )}
      </div>
    </motion.div>
  );
}
