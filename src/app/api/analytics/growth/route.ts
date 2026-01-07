import { NextResponse } from "next/server";
import { eq, and, lte, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, portfolioMetrics, externalAccounts, externalAccountEntries } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

const DEBT_TYPES = ["Mortgage", "Loan", "Credit Card"];

// GET /api/analytics/growth - Get portfolio growth over time
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all snapshots with metrics, ordered by snapshot date
    const growthData = await db
      .select({
        id: snapshots.id,
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
      .where(eq(snapshots.userId, user.id))
      .orderBy(snapshots.snapshotDate);

    // Get all external accounts (excluding debt types)
    const extAccounts = await db
      .select()
      .from(externalAccounts)
      .where(eq(externalAccounts.userId, user.id));

    const assetAccounts = extAccounts.filter(
      (a) => !DEBT_TYPES.includes(a.accountType || "")
    );

    // Get all external account entries for asset accounts
    const allEntries = await db
      .select({
        accountId: externalAccountEntries.accountId,
        value: externalAccountEntries.value,
        recordedAt: externalAccountEntries.recordedAt,
      })
      .from(externalAccountEntries)
      .orderBy(desc(externalAccountEntries.recordedAt));

    // Filter entries to only asset accounts
    const assetAccountIds = assetAccounts.map((a) => a.id);
    const assetEntries = allEntries.filter((e) =>
      assetAccountIds.includes(e.accountId)
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
  } catch (error) {
    console.error("Error fetching growth data:", error);
    return NextResponse.json(
      { error: "Failed to fetch growth data" },
      { status: 500 }
    );
  }
}
