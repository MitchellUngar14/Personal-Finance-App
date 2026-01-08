import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, portfolioMetrics, externalAccounts, externalAccountEntries } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Terminal } from "@/components/layout/Terminal";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const DEBT_TYPES = ["Mortgage", "Loan", "Credit Card"];

async function DashboardContent() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get all snapshots to determine what sources exist
  const allSnapshots = await db
    .select({ id: snapshots.id, source: snapshots.source, snapshotDate: snapshots.snapshotDate })
    .from(snapshots)
    .where(eq(snapshots.userId, session.user.id))
    .orderBy(desc(snapshots.snapshotDate));

  // Get latest snapshot for each source
  const latestBySource = allSnapshots.reduce((acc, snap) => {
    if (!acc[snap.source]) {
      acc[snap.source] = snap;
    }
    return acc;
  }, {} as Record<string, typeof allSnapshots[0]>);

  // Get metrics for each source's latest snapshot
  const metricsPromises = Object.entries(latestBySource).map(async ([source, snap]) => {
    const metrics = await db.query.portfolioMetrics.findFirst({
      where: eq(portfolioMetrics.snapshotId, snap.id),
    });
    return { source, snapshot: snap, metrics };
  });

  const portfolioData = await Promise.all(metricsPromises);

  // Get external accounts
  const extAccountsList = await db
    .select()
    .from(externalAccounts)
    .where(eq(externalAccounts.userId, session.user.id));

  // Get latest values for each external account
  const extAccountsWithValues = await Promise.all(
    extAccountsList.map(async (account) => {
      const [latestEntry] = await db
        .select()
        .from(externalAccountEntries)
        .where(eq(externalAccountEntries.accountId, account.id))
        .orderBy(desc(externalAccountEntries.recordedAt))
        .limit(1);

      return {
        ...account,
        latestValue: latestEntry ? parseFloat(latestEntry.value) : 0,
      };
    })
  );

  // Calculate totals for each portfolio source
  const portfolioTotals = portfolioData.map(({ source, snapshot, metrics }) => ({
    source,
    snapshot,
    label: source === "raymond_james" ? "Raymond James" : "Wealthsimple",
    shortLabel: source === "raymond_james" ? "RJ" : "WS",
    value: metrics?.totalMarketValue ? parseFloat(metrics.totalMarketValue) : 0,
    gainLoss: metrics?.totalGainLoss ? parseFloat(metrics.totalGainLoss) : 0,
    gainLossPercent: metrics?.totalGainLossPercent ? parseFloat(metrics.totalGainLossPercent) : 0,
  }));

  const totalPortfolioValue = portfolioTotals.reduce((sum, p) => sum + p.value, 0);
  const totalPortfolioGainLoss = portfolioTotals.reduce((sum, p) => sum + p.gainLoss, 0);

  const externalAssets = extAccountsWithValues
    .filter((a) => !DEBT_TYPES.includes(a.accountType || ""))
    .reduce((sum, a) => sum + a.latestValue, 0);

  const externalDebt = extAccountsWithValues
    .filter((a) => DEBT_TYPES.includes(a.accountType || ""))
    .reduce((sum, a) => sum + Math.abs(a.latestValue), 0);

  const totalNetWorth = totalPortfolioValue + externalAssets - externalDebt;
  const hasPortfolioData = portfolioData.length > 0;
  const hasExternalData = extAccountsWithValues.length > 0;
  const hasData = hasPortfolioData || hasExternalData;

  // Group external accounts by type for summary
  const assetAccounts = extAccountsWithValues.filter(
    (a) => !DEBT_TYPES.includes(a.accountType || "")
  );
  const debtAccounts = extAccountsWithValues.filter((a) =>
    DEBT_TYPES.includes(a.accountType || "")
  );

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl text-terminal-green">
            <span className="text-terminal-cyan">$</span> net_worth
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            Your complete financial overview
          </p>
        </div>

        <Terminal title="dashboard">
          <div className="text-center py-12">
            <div className="text-terminal-cyan text-4xl mb-4">[NO DATA]</div>
            <p className="text-text-muted mb-6">
              Get started by importing your portfolio or adding external accounts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/import" className="btn-terminal inline-block">
                [IMPORT CSV]
              </Link>
              <Link href="/accounts" className="btn-terminal inline-block">
                [ADD ACCOUNTS]
              </Link>
            </div>
          </div>
        </Terminal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl text-terminal-green">
          <span className="text-terminal-cyan">$</span> net_worth
        </h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">
          Your complete financial overview
        </p>
      </div>

      {/* Total Net Worth - Hero Card */}
      <div className="terminal-window p-6 sm:p-8 border-terminal-green/40">
        <div className="text-center">
          <div className="text-text-muted text-xs sm:text-sm uppercase tracking-wider mb-2">
            Total Net Worth
          </div>
          <div
            className={`text-3xl sm:text-5xl font-bold tabular-nums ${
              totalNetWorth >= 0 ? "text-terminal-green" : "text-terminal-magenta"
            }`}
          >
            {formatCurrency(totalNetWorth)}
          </div>
          {hasPortfolioData && totalPortfolioGainLoss !== 0 && (
            <div className="mt-3 text-xs sm:text-sm text-text-muted">
              {portfolioTotals.map((p, i) => (
                <span key={p.source}>
                  {i > 0 && " | "}
                  {p.shortLabel}:{" "}
                  <span className={p.gainLoss >= 0 ? "text-terminal-green" : "text-terminal-magenta"}>
                    {p.gainLoss >= 0 ? "+" : ""}
                    {formatCurrency(p.gainLoss)} ({p.gainLossPercent >= 0 ? "+" : ""}
                    {p.gainLossPercent.toFixed(2)}%)
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`grid grid-cols-2 ${hasPortfolioData ? `lg:grid-cols-${Math.min(portfolioTotals.length + 3, 5)}` : "lg:grid-cols-3"} gap-3 sm:gap-4`}>
        {/* Portfolio cards - one for each source */}
        {portfolioTotals.map((portfolio) => (
          <Link
            key={portfolio.source}
            href="/portfolio"
            className="stat-card group hover:border-terminal-green/50 transition-colors"
          >
            <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">
              {portfolio.shortLabel} Portfolio
            </div>
            <div className="text-lg sm:text-xl text-terminal-green font-bold tabular-nums">
              {formatCurrency(portfolio.value)}
            </div>
            <div className="text-text-muted text-[10px] mt-1 group-hover:text-terminal-cyan transition-colors">
              View details &rarr;
            </div>
          </Link>
        ))}

        {/* External Assets */}
        <Link href="/accounts" className="stat-card group hover:border-terminal-cyan/50 transition-colors">
          <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">
            External Assets
          </div>
          <div className="text-lg sm:text-xl text-terminal-cyan font-bold tabular-nums">
            {formatCurrency(externalAssets)}
          </div>
          <div className="text-text-muted text-[10px] mt-1 group-hover:text-terminal-cyan transition-colors">
            {assetAccounts.length} account{assetAccounts.length !== 1 ? "s" : ""} &rarr;
          </div>
        </Link>

        {/* External Debt */}
        <Link href="/accounts" className="stat-card group hover:border-terminal-magenta/50 transition-colors">
          <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">
            External Debt
          </div>
          <div className="text-lg sm:text-xl text-terminal-magenta font-bold tabular-nums">
            -{formatCurrency(externalDebt)}
          </div>
          <div className="text-text-muted text-[10px] mt-1 group-hover:text-terminal-magenta transition-colors">
            {debtAccounts.length} account{debtAccounts.length !== 1 ? "s" : ""} &rarr;
          </div>
        </Link>

        {/* Charts Link */}
        <Link href="/charts" className="stat-card group hover:border-terminal-yellow/50 transition-colors">
          <div className="text-text-muted text-[10px] sm:text-xs uppercase tracking-wider mb-1">
            Analytics
          </div>
          <div className="text-lg sm:text-xl text-terminal-yellow font-bold">
            Charts
          </div>
          <div className="text-text-muted text-[10px] mt-1 group-hover:text-terminal-yellow transition-colors">
            View trends &rarr;
          </div>
        </Link>
      </div>

      {/* Quick Summary Sections */}
      <div className={`grid grid-cols-1 ${hasPortfolioData ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* Portfolio Summaries - one for each source */}
        {portfolioTotals.map((portfolio) => (
          <Terminal key={portfolio.source} title={`${portfolio.shortLabel.toLowerCase()}_summary`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-terminal-cyan text-sm">{portfolio.label} Portfolio</h3>
              <Link href="/portfolio" className="text-text-muted text-xs hover:text-terminal-green transition-colors">
                [view all]
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-terminal-green/10">
                <span className="text-text-muted text-sm">Market Value</span>
                <span className="text-terminal-green font-mono">{formatCurrency(portfolio.value)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-terminal-green/10">
                <span className="text-text-muted text-sm">Total Gain/Loss</span>
                <span className={`font-mono ${portfolio.gainLoss >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
                  {portfolio.gainLoss >= 0 ? "+" : ""}
                  {formatCurrency(portfolio.gainLoss)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-text-muted text-sm">Return</span>
                <span className={`font-mono ${portfolio.gainLossPercent >= 0 ? "text-terminal-green" : "text-terminal-magenta"}`}>
                  {portfolio.gainLossPercent >= 0 ? "+" : ""}
                  {portfolio.gainLossPercent.toFixed(2)}%
                </span>
              </div>
              {portfolio.snapshot && (
                <div className="text-[10px] text-text-muted mt-2 pt-2 border-t border-terminal-green/10">
                  Last updated: {portfolio.snapshot.snapshotDate?.toLocaleDateString()}
                </div>
              )}
            </div>
          </Terminal>
        ))}

        {/* External Accounts Summary */}
        <Terminal title="external_summary">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-terminal-cyan text-sm">External Accounts</h3>
            <Link href="/accounts" className="text-text-muted text-xs hover:text-terminal-green transition-colors">
              [manage]
            </Link>
          </div>
          {extAccountsWithValues.length > 0 ? (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {extAccountsWithValues.map((account) => {
                const isDebt = DEBT_TYPES.includes(account.accountType || "");
                return (
                  <div
                    key={account.id}
                    className="flex justify-between items-center py-2 border-b border-terminal-green/10 last:border-0"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="text-text-primary text-sm truncate">{account.accountName}</div>
                      <div className="text-text-muted text-[10px]">{account.bankName}</div>
                    </div>
                    <span
                      className={`font-mono text-sm ${
                        isDebt ? "text-terminal-magenta" : "text-terminal-green"
                      }`}
                    >
                      {isDebt ? "-" : ""}
                      {formatCurrency(Math.abs(account.latestValue))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-text-muted text-sm mb-3">No external accounts</p>
              <Link href="/accounts" className="btn-terminal text-xs">
                [ADD ACCOUNT]
              </Link>
            </div>
          )}
        </Terminal>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl text-terminal-green">
              <span className="text-terminal-cyan">$</span> net_worth
            </h1>
            <p className="text-text-muted text-xs sm:text-sm mt-1">
              Your complete financial overview
            </p>
          </div>
          <div className="terminal-window p-8 animate-pulse">
            <div className="h-12 w-48 bg-terminal-green/20 rounded mx-auto" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card animate-pulse">
                <div className="h-4 w-24 bg-terminal-green/20 rounded" />
                <div className="h-8 w-32 bg-terminal-green/20 rounded mt-3" />
              </div>
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
