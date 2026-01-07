"use client";

import { useState } from "react";
import { formatCurrency, formatPercent, getValueClass, cn } from "@/lib/utils";

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
        "cursor-pointer hover:text-terminal-green transition-colors",
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
    <div className="overflow-x-auto">
      <table className="data-table text-xs sm:text-sm">
        <thead>
          <tr>
            <SortHeader
              label="Symbol"
              sortKeyName="symbol"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
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
              className="text-right"
            />
          </tr>
        </thead>
        <tbody>
          {sortedHoldings.map((holding) => (
            <tr key={holding.id} className="data-row">
              <td className="text-terminal-cyan font-medium">
                {holding.symbol || "-"}
              </td>
              <td className="hidden sm:table-cell max-w-[200px] truncate" title={holding.holding || ""}>
                {holding.holding || "-"}
              </td>
              <td className="hidden md:table-cell text-text-secondary">
                {holding.accountNickname || "-"}
              </td>
              <td className="text-right tabular-nums">
                {formatCurrency(holding.marketValue)}
              </td>
              <td className={cn("hidden sm:table-cell text-right tabular-nums", getValueClass(holding.gainLoss))}>
                {formatCurrency(holding.gainLoss)}
              </td>
              <td className={cn("text-right tabular-nums", getValueClass(holding.gainLossPercent))}>
                {formatPercent(holding.gainLossPercent)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-terminal-green/30 font-medium">
            <td className="text-terminal-cyan">
              <span className="hidden sm:inline">TOTAL ({holdings.length} positions)</span>
              <span className="sm:hidden">{holdings.length} pos</span>
            </td>
            <td className="hidden sm:table-cell"></td>
            <td className="hidden md:table-cell"></td>
            <td className="text-right tabular-nums text-terminal-green">
              {formatCurrency(totals.marketValue)}
            </td>
            <td className={cn("hidden sm:table-cell text-right tabular-nums", getValueClass(totals.gainLoss))}>
              {formatCurrency(totals.gainLoss)}
            </td>
            <td className={cn("text-right tabular-nums", getValueClass(totalGainLossPercent))}>
              {formatPercent(totalGainLossPercent)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
