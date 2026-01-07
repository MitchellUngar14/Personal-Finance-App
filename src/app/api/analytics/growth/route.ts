import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, portfolioMetrics } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

// GET /api/analytics/growth - Get portfolio growth over time
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all snapshots with metrics, ordered by date
    const growthData = await db
      .select({
        id: snapshots.id,
        importedAt: snapshots.importedAt,
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
      .orderBy(snapshots.importedAt);

    // Calculate period-over-period changes
    const dataPoints = growthData.map((point, index) => {
      const prevPoint = index > 0 ? growthData[index - 1] : null;
      const currentValue = parseFloat(point.totalMarketValue || "0");
      const prevValue = prevPoint ? parseFloat(prevPoint.totalMarketValue || "0") : currentValue;
      const periodChange = currentValue - prevValue;
      const periodChangePercent = prevValue > 0 ? (periodChange / prevValue) * 100 : 0;

      return {
        date: point.importedAt,
        totalValue: currentValue,
        bookValue: parseFloat(point.totalBookValue || "0"),
        gainLoss: parseFloat(point.totalGainLoss || "0"),
        gainLossPercent: parseFloat(point.totalGainLossPercent || "0"),
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
