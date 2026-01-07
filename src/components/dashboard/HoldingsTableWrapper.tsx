"use client";

import { useState, useEffect, useCallback } from "react";
import { HoldingsTable } from "./HoldingsTable";
import { FilterBar } from "./FilterBar";
import { Terminal } from "@/components/layout/Terminal";

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

interface Filters {
  accounts: string[];
  holdings: string[];
  symbols: string[];
}

interface HoldingsTableWrapperProps {
  snapshotId: number;
}

export function HoldingsTableWrapper({ snapshotId }: HoldingsTableWrapperProps) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [filters, setFilters] = useState<Filters>({ accounts: [], holdings: [], symbols: [] });
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedHolding, setSelectedHolding] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHoldings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("snapshotId", snapshotId.toString());
      if (selectedAccount) params.set("account", selectedAccount);
      if (selectedHolding) params.set("holding", selectedHolding);

      const response = await fetch(`/api/holdings?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch holdings");
      }

      setHoldings(data.holdings);
      setFilters(data.filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [snapshotId, selectedAccount, selectedHolding]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  const handleClearFilters = () => {
    setSelectedAccount("");
    setSelectedHolding("");
  };

  // Calculate totals
  const totals = holdings.reduce(
    (acc, h) => ({
      bookValue: acc.bookValue + h.bookValue,
      marketValue: acc.marketValue + h.marketValue,
      gainLoss: acc.gainLoss + h.gainLoss,
    }),
    { bookValue: 0, marketValue: 0, gainLoss: 0 }
  );

  return (
    <Terminal title="holdings">
      <FilterBar
        accounts={filters.accounts}
        selectedAccount={selectedAccount}
        selectedHolding={selectedHolding}
        onAccountChange={setSelectedAccount}
        onHoldingChange={setSelectedHolding}
        onClear={handleClearFilters}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      ) : error ? (
        <div className="text-terminal-magenta text-center py-8">
          ERROR: {error}
        </div>
      ) : holdings.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          No holdings match the current filters.
        </div>
      ) : (
        <HoldingsTable holdings={holdings} totals={totals} />
      )}
    </Terminal>
  );
}
