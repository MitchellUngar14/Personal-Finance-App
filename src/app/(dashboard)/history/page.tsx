"use client";

import { useState, useEffect } from "react";
import { Terminal } from "@/components/layout/Terminal";
import { formatCurrency, formatDateTime, formatPercent, getValueClass, cn } from "@/lib/utils";
import Link from "next/link";
import type { PortfolioSource } from "@/lib/validations";

interface Snapshot {
  id: number;
  source: PortfolioSource;
  snapshotDate: string;
  filename: string;
  recordCount: number;
  totalMarketValue: string | null;
  totalGainLoss: string | null;
  totalGainLossPercent: string | null;
}

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedSource, setSelectedSource] = useState<PortfolioSource>("raymond_james");

  useEffect(() => {
    fetchSnapshots();
  }, []);

  // Check which sources have data
  const hasRJData = snapshots.some((s) => s.source === "raymond_james");
  const hasWSData = snapshots.some((s) => s.source === "wealthsimple");

  // Auto-select the source that has data if only one exists
  useEffect(() => {
    if (!isLoading && snapshots.length > 0) {
      if (hasWSData && !hasRJData) {
        setSelectedSource("wealthsimple");
      } else if (hasRJData && !hasWSData) {
        setSelectedSource("raymond_james");
      }
    }
  }, [isLoading, snapshots.length, hasRJData, hasWSData]);

  // Filter snapshots by selected source
  const sourceSnapshots = snapshots.filter((s) => s.source === selectedSource);

  // Get unique years from source-filtered snapshots
  const availableYears = Array.from(
    new Set(sourceSnapshots.map((s) => new Date(s.snapshotDate).getFullYear()))
  ).sort((a, b) => b - a); // Sort descending (newest first)

  // Reset year when switching sources if current year isn't available
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [selectedSource, availableYears, selectedYear]);

  // Filter snapshots by selected year
  const filteredSnapshots = sourceSnapshots.filter(
    (s) => new Date(s.snapshotDate).getFullYear() === selectedYear
  );

  const getSourceLabel = (source: PortfolioSource) => {
    return source === "raymond_james" ? "Raymond James" : "Wealthsimple";
  };

  const getSourceShortLabel = (source: PortfolioSource) => {
    return source === "raymond_james" ? "RJ" : "WS";
  };

  const fetchSnapshots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/snapshots");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch snapshots");
      }

      setSnapshots(data.snapshots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/snapshots/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete snapshot");
      }

      // Remove from local state
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> import_history
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Portfolio import history
          </p>
        </div>
        <div className="terminal-window p-12">
          <div className="flex justify-center">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> import_history
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Portfolio import history
          </p>
        </div>
        <Terminal title="error">
          <div className="text-terminal-magenta text-center py-8">
            ERROR: {error}
          </div>
        </Terminal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> import_history
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Portfolio import history
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-terminal-bg-card border border-terminal-green/30 text-terminal-green text-xs sm:text-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded focus:outline-none focus:border-terminal-green/60 cursor-pointer"
            >
              {availableYears.map((year) => (
                <option key={year} value={year} className="bg-terminal-bg-card">
                  {year}
                </option>
              ))}
            </select>
          )}
          <Link href="/import" className="btn-terminal text-xs sm:text-sm whitespace-nowrap">
            [+ IMPORT]
          </Link>
        </div>
      </div>

      {/* Source Tabs - only show if both sources have data */}
      {(hasRJData && hasWSData) && (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedSource("raymond_james")}
            className={cn(
              "px-4 py-2 text-sm border transition-all",
              selectedSource === "raymond_james"
                ? "border-terminal-green bg-terminal-green/10 text-terminal-green"
                : "border-terminal-green/30 text-text-muted hover:text-terminal-green hover:border-terminal-green/50"
            )}
          >
            Raymond James
          </button>
          <button
            onClick={() => setSelectedSource("wealthsimple")}
            className={cn(
              "px-4 py-2 text-sm border transition-all",
              selectedSource === "wealthsimple"
                ? "border-terminal-cyan bg-terminal-cyan/10 text-terminal-cyan"
                : "border-terminal-cyan/30 text-text-muted hover:text-terminal-cyan hover:border-terminal-cyan/50"
            )}
          >
            Wealthsimple
          </button>
        </div>
      )}

      {snapshots.length === 0 ? (
        <Terminal title="snapshots">
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO HISTORY]</div>
            <p className="text-text-muted mb-6">
              No import snapshots found. Import a CSV to get started.
            </p>
            <Link href="/import" className="btn-terminal inline-block">
              [IMPORT CSV]
            </Link>
          </div>
        </Terminal>
      ) : sourceSnapshots.length === 0 ? (
        <Terminal title={`${getSourceShortLabel(selectedSource).toLowerCase()}_snapshots`}>
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO DATA]</div>
            <p className="text-text-muted mb-6">
              No {getSourceLabel(selectedSource)} snapshots found.
            </p>
            <Link href="/import" className="btn-terminal inline-block">
              [IMPORT CSV]
            </Link>
          </div>
        </Terminal>
      ) : filteredSnapshots.length === 0 ? (
        <Terminal title={`${getSourceShortLabel(selectedSource).toLowerCase()}_snapshots`}>
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO DATA]</div>
            <p className="text-text-muted mb-6">
              No {getSourceLabel(selectedSource)} snapshots found for {selectedYear}.
            </p>
          </div>
        </Terminal>
      ) : (
        <Terminal title={`${getSourceShortLabel(selectedSource).toLowerCase()}_snapshots`}>
          <div className="space-y-4">
            {filteredSnapshots.map((snapshot, index) => {
              const totalValue = snapshot.totalMarketValue
                ? parseFloat(snapshot.totalMarketValue)
                : null;
              const gainLoss = snapshot.totalGainLoss
                ? parseFloat(snapshot.totalGainLoss)
                : null;
              const gainLossPercent = snapshot.totalGainLossPercent
                ? parseFloat(snapshot.totalGainLossPercent)
                : null;

              // Calculate change from previous snapshot (within same source)
              const prevSnapshot = sourceSnapshots[index + 1];
              const prevValue = prevSnapshot?.totalMarketValue
                ? parseFloat(prevSnapshot.totalMarketValue)
                : null;
              const periodChange =
                totalValue !== null && prevValue !== null
                  ? totalValue - prevValue
                  : null;

              // Show position within filtered results (1-based, newest first)
              const position = index + 1;
              const totalInSource = filteredSnapshots.length;

              // Only show LATEST if this is actually the latest snapshot for this source
              // (not just the first in the filtered year view)
              const isActualLatest = sourceSnapshots.length > 0 && snapshot.id === sourceSnapshots[0].id;

              return (
                <div
                  key={snapshot.id}
                  className="border border-terminal-green/20 p-3 sm:p-4 hover:border-terminal-green/40 transition-colors"
                >
                  {/* Mobile Layout */}
                  <div className="sm:hidden space-y-3">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-terminal-cyan text-xs">#{position}/{totalInSource}</span>
                        {isActualLatest && (
                          <span className="text-[10px] bg-terminal-green/20 text-terminal-green px-1.5 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </div>
                      {deleteId === snapshot.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(snapshot.id)}
                            disabled={isDeleting}
                            className="text-terminal-magenta text-xs"
                          >
                            {isDeleting ? "[...]" : "[OK]"}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            disabled={isDeleting}
                            className="text-text-muted text-xs"
                          >
                            [X]
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(snapshot.id)}
                          className="text-terminal-magenta text-xs hover:text-terminal-magenta/70"
                        >
                          [DEL]
                        </button>
                      )}
                    </div>

                    {/* Date */}
                    <div className="text-terminal-green text-sm">
                      {new Date(snapshot.snapshotDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>

                    {/* File info */}
                    <div className="text-text-muted text-xs truncate">
                      {snapshot.filename} ({snapshot.recordCount} records)
                    </div>

                    {/* Values */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-terminal-green/10">
                      <div className="text-terminal-green text-base font-bold tabular-nums">
                        {formatCurrency(totalValue)}
                      </div>
                      <div className="text-right">
                        <div className={cn("text-xs tabular-nums", getValueClass(gainLoss))}>
                          {formatCurrency(gainLoss)} ({formatPercent(gainLossPercent)})
                        </div>
                        {periodChange !== null && (
                          <div className={cn("text-[10px] tabular-nums", getValueClass(periodChange))}>
                            Period: {periodChange >= 0 ? "+" : ""}{formatCurrency(periodChange)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden sm:flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-terminal-cyan text-sm">
                          #{position}/{totalInSource}
                        </span>
                        <span className="text-terminal-green">
                          {formatDateTime(snapshot.snapshotDate)}
                        </span>
                        {isActualLatest && (
                          <span className="text-xs bg-terminal-green/20 text-terminal-green px-2 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="text-text-muted text-sm mt-1 truncate">
                        {snapshot.filename} ({snapshot.recordCount} records)
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-terminal-green text-lg tabular-nums">
                        {formatCurrency(totalValue)}
                      </div>
                      <div className="flex items-center justify-end gap-3 text-sm mt-1">
                        <span className={cn("tabular-nums", getValueClass(gainLoss))}>
                          G/L: {formatCurrency(gainLoss)}
                        </span>
                        <span className={cn("tabular-nums", getValueClass(gainLossPercent))}>
                          ({formatPercent(gainLossPercent)})
                        </span>
                      </div>
                      {periodChange !== null && (
                        <div className={cn("text-xs mt-1 tabular-nums", getValueClass(periodChange))}>
                          Period: {periodChange >= 0 ? "+" : ""}
                          {formatCurrency(periodChange)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {deleteId === snapshot.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDelete(snapshot.id)}
                            disabled={isDeleting}
                            className="text-terminal-magenta text-sm hover:text-terminal-magenta/80 disabled:opacity-50"
                          >
                            {isDeleting ? "[...]" : "[CONFIRM]"}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            disabled={isDeleting}
                            className="text-text-muted text-sm hover:text-text-secondary"
                          >
                            [CANCEL]
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteId(snapshot.id)}
                          className="text-terminal-magenta text-sm hover:text-terminal-magenta/70 transition-colors"
                        >
                          [DELETE]
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-terminal-green/20 text-text-muted text-xs sm:text-sm">
            Showing {filteredSnapshots.length} {getSourceLabel(selectedSource)} snapshot{filteredSnapshots.length !== 1 ? "s" : ""} from {selectedYear}
            {filteredSnapshots.length !== sourceSnapshots.length && (
              <span className="ml-2">({sourceSnapshots.length} total for {getSourceShortLabel(selectedSource)})</span>
            )}
          </div>
        </Terminal>
      )}
    </div>
  );
}
