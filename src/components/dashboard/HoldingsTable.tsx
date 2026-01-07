"use client";

import { useState } from "react";
import { formatCurrency, formatPercent, getValueClass, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Holding {
  id: number;
  clientName: string | null;
  accountNickname: string | null;
  assetCategory: string | null;
  industry: string | null;
  symbol: string | null;
  holding: string | null;
  quantity: number;
  price: number;
  averageCost: number;
  bookValue: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  percentageOfAssets: number;
}

interface Totals {
  bookValue: number;
  marketValue: number;
  gainLoss: number;
}

interface HoldingsTableProps {
  holdings: Holding[];
  totals: Totals;
}

type SortKey = "symbol" | "holding" | "marketValue" | "gainLoss" | "gainLossPercent" | "accountNickname";
type SortDirection = "asc" | "desc";

interface SortHeaderProps {
  label: string;
  sortKeyName: SortKey;
  currentSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({
  label,
  sortKeyName,
  currentSortKey,
  sortDirection,
  onSort,
  className = "",
}: SortHeaderProps) {
  return (
    <th
      onClick={() => onSort(sortKeyName)}
      className={cn(
        "cursor-pointer hover:text-terminal-green transition-colors py-3",
        className
      )}
    >
      <div className="flex items-center gap-1">
        {label}
        {currentSortKey === sortKeyName && (
          <span className="text-terminal-green">
            {sortDirection === "asc" ? "^" : "v"}
          </span>
        )}
      </div>
    </th>
  );
}

export function HoldingsTable({ holdings, totals }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (aValue === null) return 1;
    if (bValue === null) return -1;

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const totalGainLossPercent =
    totals.bookValue > 0
      ? ((totals.marketValue - totals.bookValue) / totals.bookValue) * 100
      : 0;

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="data-table text-[10px] sm:text-sm">
        <thead>
          <tr>
            <SortHeader
              label="Sym"
              sortKeyName="symbol"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="pl-4 sm:pl-6 col-symbol"
            />
            <SortHeader
              label="Holding"
              sortKeyName="holding"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="hidden sm:table-cell"
            />
            <SortHeader
              label="Account"
              sortKeyName="accountNickname"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="hidden md:table-cell"
            />
            <SortHeader
              label="Value"
              sortKeyName="marketValue"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="text-right"
            />
            <SortHeader
              label="G/L"
              sortKeyName="gainLoss"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="text-right hidden sm:table-cell"
            />
            <SortHeader
              label="G/L %"
              sortKeyName="gainLossPercent"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="text-right pr-4 sm:pr-6"
            />
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {sortedHoldings.map((holding, index) => (
              <motion.tr
                key={holding.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.05, 1) }}
                className="data-row group"
              >
                <td className="pl-4 sm:pl-6 text-terminal-cyan font-medium py-3">
                  <div className="flex flex-col">
                    <span className="truncate max-w-[60px] sm:max-w-none">{holding.symbol || "-"}</span>
                    <span className="sm:hidden text-[8px] text-text-muted truncate max-w-[60px]">
                      {holding.holding}
                    </span>
                  </div>
                </td>
                <td className="hidden sm:table-cell max-w-[150px] lg:max-w-[300px] truncate py-3" title={holding.holding || ""}>
                  {holding.holding || "-"}
                </td>
                <td className="hidden md:table-cell text-text-secondary py-3">
                  {holding.accountNickname || "-"}
                </td>
                <td className="text-right tabular-nums py-3">
                  {formatCurrency(holding.marketValue)}
                </td>
                <td className={cn("hidden sm:table-cell text-right tabular-nums py-3", getValueClass(holding.gainLoss))}>
                  {formatCurrency(holding.gainLoss)}
                </td>
                <td className={cn("text-right tabular-nums pr-4 sm:pr-6 py-3", getValueClass(holding.gainLossPercent))}>
                  {formatPercent(holding.gainLossPercent)}
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-terminal-green/30 font-medium bg-terminal-bg-light/30">
            <td className="pl-4 sm:pl-6 py-4 text-terminal-cyan">
              <span className="hidden sm:inline">TOTAL ({holdings.length} positions)</span>
              <span className="sm:hidden">{holdings.length} pos</span>
            </td>
            <td className="hidden sm:table-cell py-4"></td>
            <td className="hidden md:table-cell py-4"></td>
            <td className="text-right tabular-nums text-terminal-green py-4 font-bold">
              {formatCurrency(totals.marketValue)}
            </td>
            <td className={cn("hidden sm:table-cell text-right tabular-nums py-4", getValueClass(totals.gainLoss))}>
              {formatCurrency(totals.gainLoss)}
            </td>
            <td className={cn("text-right tabular-nums pr-4 sm:pr-6 py-4", getValueClass(totalGainLossPercent))}>
              {formatPercent(totalGainLossPercent)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
