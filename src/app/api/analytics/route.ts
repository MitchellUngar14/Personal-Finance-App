import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, holdings, portfolioMetrics } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

// GET /api/analytics - Get portfolio analytics (latest or specified snapshot)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const snapshotId = searchParams.get("snapshotId");

    // Get the target snapshot (latest if not specified)
    let targetSnapshot;
    if (snapshotId && snapshotId !== "latest") {
      targetSnapshot = await db.query.snapshots.findFirst({
        where: eq(snapshots.id, parseInt(snapshotId)),
      });
    } else {
      targetSnapshot = await db.query.snapshots.findFirst({
        where: eq(snapshots.userId, user.id),
        orderBy: [desc(snapshots.importedAt)],
      });
    }

    if (!targetSnapshot) {
      return NextResponse.json({
        summary: null,
        message: "No data imported yet",
      });
    }

    // Verify ownership
    if (targetSnapshot.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get portfolio metrics
    const metrics = await db.query.portfolioMetrics.findFirst({
      where: eq(portfolioMetrics.snapshotId, targetSnapshot.id),
    });

    // Get top performers
    const topPerformers = await db
      .select()
      .from(holdings)
      .where(eq(holdings.snapshotId, targetSnapshot.id))
      .orderBy(desc(holdings.gainLossPercent))
      .limit(5);

    // Get bottom performers
    const bottomPerformers = await db
      .select()
      .from(holdings)
      .where(eq(holdings.snapshotId, targetSnapshot.id))
      .orderBy(holdings.gainLossPercent)
      .limit(5);

    // Get allocation by asset category
    const allocation = await db
      .select({
        category: holdings.assetCategory,
        totalValue: sql<number>`sum(${holdings.marketValue})`.as("total_value"),
      })
      .from(holdings)
      .where(eq(holdings.snapshotId, targetSnapshot.id))
      .groupBy(holdings.assetCategory);

    return NextResponse.json({
      snapshot: {
        id: targetSnapshot.id,
        importedAt: targetSnapshot.importedAt,
        filename: targetSnapshot.filename,
      },
      summary: metrics
        ? {
            totalMarketValue: parseFloat(metrics.totalMarketValue || "0"),
            totalBookValue: parseFloat(metrics.totalBookValue || "0"),
            totalGainLoss: parseFloat(metrics.totalGainLoss || "0"),
            totalGainLossPercent: parseFloat(metrics.totalGainLossPercent || "0"),
            holdingsCount: metrics.holdingsCount,
            accountsCount: metrics.accountsCount,
          }
        : null,
      topPerformers: topPerformers.map((h) => ({
        symbol: h.symbol,
        holding: h.holding,
        gainLossPercent: parseFloat(h.gainLossPercent || "0"),
        marketValue: parseFloat(h.marketValue || "0"),
      })),
      bottomPerformers: bottomPerformers.map((h) => ({
        symbol: h.symbol,
        holding: h.holding,
        gainLossPercent: parseFloat(h.gainLossPercent || "0"),
        marketValue: parseFloat(h.marketValue || "0"),
      })),
      allocation: allocation.map((a) => ({
        category: a.category || "Unknown",
        value: a.totalValue || 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
