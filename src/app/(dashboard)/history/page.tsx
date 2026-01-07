"use client";

import { useState, useEffect } from "react";
import { Terminal } from "@/components/layout/Terminal";
import { formatCurrency, formatDateTime, formatPercent, getValueClass, cn } from "@/lib/utils";
import Link from "next/link";

interface Snapshot {
  id: number;
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

  useEffect(() => {
    fetchSnapshots();
  }, []);

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
        <h1 className="text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> history
        </h1>
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
        <h1 className="text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> history
        </h1>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> history
          </h1>
          <p className="text-text-muted text-sm mt-1">
            View and manage imported snapshots
          </p>
        </div>
        <Link href="/import" className="btn-terminal text-sm">
          [+ IMPORT]
        </Link>
      </div>

      {snapshots.length === 0 ? (
        <Terminal title="snapshots">
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO HISTORY]</div>
            <p className="text-text-muted mb-6">
              No portfolio snapshots found. Import a CSV to get started.
            </p>
            <Link href="/import" className="btn-terminal inline-block">
              [IMPORT CSV]
            </Link>
          </div>
        </Terminal>
      ) : (
        <Terminal title="snapshots">
          <div className="space-y-4">
            {snapshots.map((snapshot, index) => {
              const totalValue = snapshot.totalMarketValue
                ? parseFloat(snapshot.totalMarketValue)
                : null;
              const gainLoss = snapshot.totalGainLoss
                ? parseFloat(snapshot.totalGainLoss)
                : null;
              const gainLossPercent = snapshot.totalGainLossPercent
                ? parseFloat(snapshot.totalGainLossPercent)
                : null;

              // Calculate change from previous snapshot
              const prevSnapshot = snapshots[index + 1];
              const prevValue = prevSnapshot?.totalMarketValue
                ? parseFloat(prevSnapshot.totalMarketValue)
                : null;
              const periodChange =
                totalValue !== null && prevValue !== null
                  ? totalValue - prevValue
                  : null;

              return (
                <div
                  key={snapshot.id}
                  className="border border-terminal-green/20 p-4 hover:border-terminal-green/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-terminal-cyan text-sm">
                          #{snapshot.id}
                        </span>
                        <span className="text-terminal-green">
                          {formatDateTime(snapshot.snapshotDate)}
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-terminal-green/20 text-terminal-green px-2 py-0.5 rounded">
                            LATEST
                          </span>
                        )}
                      </div>
                      <div className="text-text-muted text-sm mt-1">
                        {snapshot.filename} ({snapshot.recordCount} records)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-terminal-green text-lg tabular-nums">
                        {formatCurrency(totalValue)}
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-1">
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

                    <div className="flex items-center gap-2">
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
                          className="text-text-muted text-sm hover:text-terminal-magenta transition-colors"
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

          <div className="mt-6 pt-4 border-t border-terminal-green/20 text-text-muted text-sm">
            Total snapshots: {snapshots.length}
          </div>
        </Terminal>
      )}
    </div>
  );
}
