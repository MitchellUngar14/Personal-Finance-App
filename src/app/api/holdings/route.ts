import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, holdings } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

// GET /api/holdings - Get holdings with optional filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const snapshotId = searchParams.get("snapshotId");
    const accountFilter = searchParams.get("account");
    const holdingFilter = searchParams.get("holding");
    const symbolFilter = searchParams.get("symbol");

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
      return NextResponse.json({ holdings: [], filters: {} });
    }

    // Verify ownership
    if (targetSnapshot.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build conditions
    const conditions = [eq(holdings.snapshotId, targetSnapshot.id)];

    if (accountFilter) {
      conditions.push(eq(holdings.accountNickname, accountFilter));
    }
    if (holdingFilter) {
      conditions.push(like(holdings.holding, `%${holdingFilter}%`));
    }
    if (symbolFilter) {
      conditions.push(eq(holdings.symbol, symbolFilter.toUpperCase()));
    }

    // Fetch holdings
    const holdingsData = await db
      .select()
      .from(holdings)
      .where(and(...conditions))
      .orderBy(desc(holdings.marketValue));

    // Get unique values for filters
    const allHoldings = await db
      .select({
        accountNickname: holdings.accountNickname,
        holding: holdings.holding,
        symbol: holdings.symbol,
      })
      .from(holdings)
      .where(eq(holdings.snapshotId, targetSnapshot.id));

    const uniqueAccounts = [...new Set(allHoldings.map((h) => h.accountNickname).filter(Boolean))];
    const uniqueHoldings = [...new Set(allHoldings.map((h) => h.holding).filter(Boolean))];
    const uniqueSymbols = [...new Set(allHoldings.map((h) => h.symbol).filter(Boolean))];

    return NextResponse.json({
      holdings: holdingsData.map((h) => ({
        id: h.id,
        clientName: h.clientName,
        accountNickname: h.accountNickname,
        accountNumber: h.accountNumber,
        assetCategory: h.assetCategory,
        industry: h.industry,
        symbol: h.symbol,
        holding: h.holding,
        quantity: parseFloat(h.quantity || "0"),
        price: parseFloat(h.price || "0"),
        averageCost: parseFloat(h.averageCost || "0"),
        bookValue: parseFloat(h.bookValue || "0"),
        marketValue: parseFloat(h.marketValue || "0"),
        gainLoss: parseFloat(h.gainLoss || "0"),
        gainLossPercent: parseFloat(h.gainLossPercent || "0"),
        percentageOfAssets: parseFloat(h.percentageOfAssets || "0"),
      })),
      filters: {
        accounts: uniqueAccounts,
        holdings: uniqueHoldings,
        symbols: uniqueSymbols,
      },
      snapshot: {
        id: targetSnapshot.id,
        importedAt: targetSnapshot.importedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching holdings:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings" },
      { status: 500 }
    );
  }
}
