"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ImportResult {
  success: boolean;
  snapshot: {
    id: number;
    filename: string;
    recordCount: number;
    snapshotDate: string;
    importedAt: string;
  };
  metrics: {
    totalMarketValue: number;
    totalBookValue: number;
    totalGainLoss: number;
    totalGainLossPercent: number;
    holdingsCount: number;
    accountsCount: number;
  };
}

// Get today's date in YYYY-MM-DD format for the date input
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export function CSVDropzone() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(getTodayString());
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setResult(null);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "text/csv" || droppedFile.name.endsWith(".csv"))) {
      setFile(droppedFile);
    } else {
      setError("Please drop a CSV file");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResult(null);

    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("snapshotDate", snapshotDate);

      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setUploadProgress(0);
    setSnapshotDate(getTodayString());
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-terminal-green text-4xl mb-4">[SUCCESS]</div>
          <p className="text-text-muted">
            Import completed for {formatDate(result.snapshot.snapshotDate)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="text-text-muted text-sm">Records Imported</div>
            <div className="text-2xl text-terminal-green mt-1">
              {result.snapshot.recordCount}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-sm">Total Value</div>
            <div className="text-2xl text-terminal-green mt-1">
              {formatCurrency(result.metrics.totalMarketValue)}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-sm">Total G/L</div>
            <div className={`text-2xl mt-1 ${result.metrics.totalGainLoss >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
              {formatCurrency(result.metrics.totalGainLoss)}
            </div>
          </div>
          <div className="stat-card">
            <div className="text-text-muted text-sm">Accounts</div>
            <div className="text-2xl text-terminal-green mt-1">
              {result.metrics.accountsCount}
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push("/")}
            className="btn-terminal"
          >
            [VIEW DASHBOARD]
          </button>
          <button
            onClick={handleReset}
            className="text-terminal-cyan hover:text-terminal-cyan/80 transition-colors"
          >
            [IMPORT ANOTHER]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Snapshot Date Picker */}
      <div className="flex items-center gap-4">
        <label className="text-terminal-green text-sm">
          SNAPSHOT DATE<span className="cursor-blink">_</span>
        </label>
        <input
          type="date"
          value={snapshotDate}
          onChange={(e) => setSnapshotDate(e.target.value)}
          max={getTodayString()}
          className="bg-black/50 border border-terminal-green/30 text-terminal-green
                     px-3 py-2 focus:border-terminal-green focus:outline-none
                     [color-scheme:dark]"
        />
        <span className="text-text-muted text-xs">
          (When was this data captured?)
        </span>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-all
          ${isDragging
            ? "border-terminal-green bg-terminal-green/10"
            : "border-terminal-green/30 hover:border-terminal-green/50"
          }
        `}
      >
        {file ? (
          <div>
            <div className="text-terminal-green text-xl mb-2">
              {file.name}
            </div>
            <div className="text-text-muted text-sm">
              {(file.size / 1024).toFixed(1)} KB
            </div>
            <button
              onClick={handleReset}
              className="mt-4 text-terminal-magenta text-sm hover:text-terminal-magenta/80"
            >
              [REMOVE]
            </button>
          </div>
        ) : (
          <div>
            <div className="text-terminal-cyan text-4xl mb-4">
              [DROP CSV]
            </div>
            <p className="text-text-muted mb-4">
              Drag and drop your Raymond James export here
            </p>
            <label className="btn-terminal cursor-pointer inline-block">
              [SELECT FILE]
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Importing...</span>
            <span className="text-terminal-green">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-terminal-bg-light rounded overflow-hidden">
            <div
              className="h-full bg-terminal-green transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-terminal-magenta text-sm p-4 border border-terminal-magenta/30 bg-terminal-magenta/10">
          ERROR: {error}
        </div>
      )}

      {/* Upload Button */}
      {file && !isUploading && (
        <button
          onClick={handleUpload}
          className="btn-terminal w-full"
        >
          [EXECUTE IMPORT]
        </button>
      )}

      {/* Help Text */}
      <div className="text-text-muted text-sm space-y-2">
        <p className="text-terminal-cyan">Expected CSV columns:</p>
        <p className="text-xs leading-relaxed">
          Client Name, Account Nickname, Asset Category, Industry, Symbol, Holding,
          Quantity, Price, Fund, Average Cost, Book Value, Market Value, Accrued Interest,
          G/L, G/L (%), Percentage of Assets
        </p>
        <p className="text-xs text-terminal-yellow mt-2">
          Note: Client Id and Account Number columns are read but NOT stored for security.
        </p>
      </div>
    </div>
  );
}
