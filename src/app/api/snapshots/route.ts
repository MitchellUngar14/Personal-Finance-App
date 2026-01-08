import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, portfolioMetrics } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

// GET /api/snapshots - List all snapshots for current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSnapshots = await db
      .select({
        id: snapshots.id,
        source: snapshots.source,
        snapshotDate: snapshots.snapshotDate,
        filename: snapshots.filename,
        recordCount: snapshots.recordCount,
        totalMarketValue: portfolioMetrics.totalMarketValue,
        totalGainLoss: portfolioMetrics.totalGainLoss,
        totalGainLossPercent: portfolioMetrics.totalGainLossPercent,
      })
      .from(snapshots)
      .leftJoin(portfolioMetrics, eq(snapshots.id, portfolioMetrics.snapshotId))
      .where(eq(snapshots.userId, user.id))
      .orderBy(desc(snapshots.snapshotDate));

    return NextResponse.json({ snapshots: userSnapshots });
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
