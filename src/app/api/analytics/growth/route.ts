import { NextRequest, NextResponse } from "next/server";
import { eq, and, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, portfolioMetrics, externalAccounts, externalAccountEntries } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import type { PortfolioSource } from "@/lib/validations";

const DEBT_TYPES = ["Mortgage", "Loan", "Credit Card"];

// GET /api/analytics/growth - Get portfolio growth over time
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get("source") as PortfolioSource | null;

    // Build the where clause based on source filter
    const whereClause = source
      ? and(eq(snapshots.userId, user.id), eq(snapshots.source, source))
      : eq(snapshots.userId, user.id);

    // Get all snapshots with metrics, ordered by snapshot date
    const growthData = await db
      .select({
        id: snapshots.id,
        source: snapshots.source,
        snapshotDate: snapshots.snapshotDate,
        filename: snapshots.filename,
        totalMarketValue: portfolioMetrics.totalMarketValue,
        totalBookValue: portfolioMetrics.totalBookValue,
        totalGainLoss: portfolioMetrics.totalGainLoss,
        totalGainLossPercent: portfolioMetrics.totalGainLossPercent,
        holdingsCount: portfolioMetrics.holdingsCount,
      })
      .from(snapshots)
      .innerJoin(portfolioMetrics, eq(snapshots.id, portfolioMetrics.snapshotId))
      .where(whereClause)
      .orderBy(snapshots.snapshotDate);

    // Get all external accounts
    const extAccounts = await db
      .select()
      .from(externalAccounts)
      .where(eq(externalAccounts.userId, user.id));

    const assetAccounts = extAccounts.filter(
      (a) => !DEBT_TYPES.includes(a.accountType || "")
    );
    const debtAccounts = extAccounts.filter(
      (a) => DEBT_TYPES.includes(a.accountType || "")
    );

    // Get all external account entries
    const allEntries = await db
      .select({
        accountId: externalAccountEntries.accountId,
        value: externalAccountEntries.value,
        recordedAt: externalAccountEntries.recordedAt,
      })
      .from(externalAccountEntries)
      .orderBy(desc(externalAccountEntries.recordedAt));

    // Separate entries by account type
    const assetAccountIds = assetAccounts.map((a) => a.id);
    const debtAccountIds = debtAccounts.map((a) => a.id);
    const assetEntries = allEntries.filter((e) =>
      assetAccountIds.includes(e.accountId)
    );
    const debtEntries = allEntries.filter((e) =>
      debtAccountIds.includes(e.accountId)
    );

    // Helper function to get external assets value at a specific date
    const getExternalAssetsAtDate = (targetDate: Date, isLatest: boolean): number => {
      let total = 0;
      for (const accountId of assetAccountIds) {
        // Find the most recent entry for this account
        // If this is the latest snapshot, use the most recent entry regardless of date
        // Otherwise, use entries at or before the target date
        const accountEntries = assetEntries.filter((e) => {
          if (e.accountId !== accountId) return false;
          if (isLatest) return true; // For latest snapshot, include all entries
          return new Date(e.recordedAt!) <= targetDate;
        });
        if (accountEntries.length > 0) {
          // Entries are sorted desc by recordedAt, so first one is most recent
          total += parseFloat(accountEntries[0].value);
        }
      }
      return total;
    };

    // Get current external assets value (for all accounts, latest entry)
    const getCurrentExternalAssets = (): number => {
      let total = 0;
      for (const accountId of assetAccountIds) {
        const accountEntries = assetEntries.filter((e) => e.accountId === accountId);
        if (accountEntries.length > 0) {
          total += parseFloat(accountEntries[0].value);
        }
      }
      return total;
    };

    const currentExternalAssets = getCurrentExternalAssets();

    // If we have RJ data, combine with external assets
    if (growthData.length > 0) {
      // Calculate period-over-period changes
      const dataPoints = growthData.map((point, index) => {
        const isLatest = index === growthData.length - 1;
        const prevPoint = index > 0 ? growthData[index - 1] : null;
        const currentValue = parseFloat(point.totalMarketValue || "0");
        const prevValue = prevPoint ? parseFloat(prevPoint.totalMarketValue || "0") : currentValue;
        const periodChange = currentValue - prevValue;
        const periodChangePercent = prevValue > 0 ? (periodChange / prevValue) * 100 : 0;

        // Get external assets value at this snapshot date
        // For the latest point, always show current external assets
        const externalAssets = isLatest
          ? currentExternalAssets
          : getExternalAssetsAtDate(new Date(point.snapshotDate!), false);

        return {
          date: point.snapshotDate,
          totalValue: currentValue,
          bookValue: parseFloat(point.totalBookValue || "0"),
          gainLoss: parseFloat(point.totalGainLoss || "0"),
          gainLossPercent: parseFloat(point.totalGainLossPercent || "0"),
          externalAssets,
          combinedValue: currentValue + externalAssets,
          periodChange,
          periodChangePercent,
          holdingsCount: point.holdingsCount,
        };
      });

      return NextResponse.json({ dataPoints });
    }

    // No RJ data - generate data points from external account entries only
    const allExternalEntries = [...assetEntries, ...debtEntries];

    if (allExternalEntries.length > 0) {
      // Sort entries by date ascending (oldest first) to process in chronological order
      const sortedEntries = [...allExternalEntries].sort(
        (a, b) => new Date(a.recordedAt!).getTime() - new Date(b.recordedAt!).getTime()
      );

      // Get unique dates from all entries
      const dateMap = new Map<string, { assets: number; debt: number }>();

      for (const entry of sortedEntries) {
        const dateStr = new Date(entry.recordedAt!).toISOString().split('T')[0];
        const entryDate = new Date(entry.recordedAt!);

        // Calculate total assets and debt at this point in time
        let totalAssets = 0;
        let totalDebt = 0;

        // Sum up asset values - get most recent entry for each account up to this time
        for (const accountId of assetAccountIds) {
          // Filter entries for this account up to this timestamp, sorted desc to get most recent first
          const accountEntries = assetEntries
            .filter((e) => e.accountId === accountId && new Date(e.recordedAt!) <= entryDate)
            .sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime());
          if (accountEntries.length > 0) {
            totalAssets += parseFloat(accountEntries[0].value);
          }
        }

        // Sum up debt values - get most recent entry for each account up to this time
        for (const accountId of debtAccountIds) {
          const accountEntries = debtEntries
            .filter((e) => e.accountId === accountId && new Date(e.recordedAt!) <= entryDate)
            .sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime());
          if (accountEntries.length > 0) {
            totalDebt += Math.abs(parseFloat(accountEntries[0].value));
          }
        }

        // Always update - since we're processing chronologically, later entries on same day will overwrite
        dateMap.set(dateStr, { assets: totalAssets, debt: totalDebt });
      }

      // Convert to sorted array of data points
      const sortedDates = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      const dataPoints = sortedDates.map(([date, values], index) => {
        const netWorth = values.assets - values.debt;
        const prevValues = index > 0 ? sortedDates[index - 1][1] : values;
        const prevNetWorth = prevValues.assets - prevValues.debt;
        const periodChange = netWorth - prevNetWorth;
        const periodChangePercent = prevNetWorth !== 0 ? (periodChange / Math.abs(prevNetWorth)) * 100 : 0;

        return {
          date: new Date(date).toISOString(),
          totalValue: 0,
          bookValue: 0,
          gainLoss: 0,
          gainLossPercent: 0,
          externalAssets: values.assets,
          externalDebt: values.debt,
          combinedValue: netWorth,
          periodChange,
          periodChangePercent,
          holdingsCount: 0,
        };
      });

      return NextResponse.json({ dataPoints });
    }

    // No data at all
    return NextResponse.json({ dataPoints: [] });
  } catch (error) {
    console.error("Error fetching growth data:", error);
    return NextResponse.json(
      { error: "Failed to fetch growth data" },
      { status: 500 }
    );
  }
}
