import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, holdings, portfolioMetrics } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

// GET /api/snapshots/[id] - Get a specific snapshot with its holdings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const snapshotId = parseInt(id);

    if (isNaN(snapshotId)) {
      return NextResponse.json({ error: "Invalid snapshot ID" }, { status: 400 });
    }

    // Get snapshot with ownership check
    const snapshot = await db.query.snapshots.findFirst({
      where: and(
        eq(snapshots.id, snapshotId),
        eq(snapshots.userId, user.id)
      ),
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    // Get metrics
    const metrics = await db.query.portfolioMetrics.findFirst({
      where: eq(portfolioMetrics.snapshotId, snapshotId),
    });

    // Get holdings
    const snapshotHoldings = await db
      .select()
      .from(holdings)
      .where(eq(holdings.snapshotId, snapshotId));

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        importedAt: snapshot.importedAt,
        filename: snapshot.filename,
        recordCount: snapshot.recordCount,
      },
      metrics: metrics
        ? {
            totalMarketValue: parseFloat(metrics.totalMarketValue || "0"),
            totalBookValue: parseFloat(metrics.totalBookValue || "0"),
            totalGainLoss: parseFloat(metrics.totalGainLoss || "0"),
            totalGainLossPercent: parseFloat(metrics.totalGainLossPercent || "0"),
            holdingsCount: metrics.holdingsCount,
            accountsCount: metrics.accountsCount,
          }
        : null,
      holdings: snapshotHoldings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        holding: h.holding,
        accountNickname: h.accountNickname,
        marketValue: parseFloat(h.marketValue || "0"),
        gainLoss: parseFloat(h.gainLoss || "0"),
        gainLossPercent: parseFloat(h.gainLossPercent || "0"),
      })),
    });
  } catch (error) {
    console.error("Error fetching snapshot:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshot" },
      { status: 500 }
    );
  }
}

// DELETE /api/snapshots/[id] - Delete a snapshot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const snapshotId = parseInt(id);

    if (isNaN(snapshotId)) {
      return NextResponse.json({ error: "Invalid snapshot ID" }, { status: 400 });
    }

    // Verify ownership
    const snapshot = await db.query.snapshots.findFirst({
      where: and(
        eq(snapshots.id, snapshotId),
        eq(snapshots.userId, user.id)
      ),
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    // Delete snapshot (cascade will delete holdings and metrics)
    await db.delete(snapshots).where(eq(snapshots.id, snapshotId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting snapshot:", error);
    return NextResponse.json(
      { error: "Failed to delete snapshot" },
      { status: 500 }
    );
  }
}
