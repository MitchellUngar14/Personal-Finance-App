import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { snapshots, holdings, portfolioMetrics } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";
import {
  transformCsvRow,
  transformWealthsimpleCsvRow,
  type CSVRow,
  type WealthsimpleCSVRow,
  type PortfolioSource,
} from "@/lib/validations";
import Papa from "papaparse";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const snapshotDateStr = formData.get("snapshotDate") as string | null;
    const source = (formData.get("source") as PortfolioSource) || "raymond_james";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate source
    if (source !== "raymond_james" && source !== "wealthsimple") {
      return NextResponse.json(
        { error: "Invalid source. Must be 'raymond_james' or 'wealthsimple'" },
        { status: 400 }
      );
    }

    // Parse snapshot date (defaults to current date if not provided)
    const snapshotDate = snapshotDateStr
      ? new Date(snapshotDateStr)
      : new Date();

    // Validate the date
    if (isNaN(snapshotDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid snapshot date" },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV based on source
    const parseResult = source === "raymond_james"
      ? Papa.parse<CSVRow>(fileContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        })
      : Papa.parse<WealthsimpleCSVRow>(fileContent, {
          header: true,
          skipEmptyLines: "greedy", // Skip all empty lines including whitespace-only
          transformHeader: (header) => header.trim(),
        });

    // Log parsing results for debugging
    if (parseResult.errors.length > 0) {
      console.log(`CSV parsing had ${parseResult.errors.length} errors for ${source}:`,
        parseResult.errors.slice(0, 3).map(e => ({ type: e.type, code: e.code, message: e.message, row: e.row }))
      );
    }

    // For Wealthsimple, filter out non-critical errors (like "Too few fields" from footer rows)
    // For Raymond James, treat all errors as critical
    const criticalErrors = source === "raymond_james"
      ? parseResult.errors
      : parseResult.errors.filter((err) => {
          // Ignore field mismatch errors - these are from footer/metadata rows with different column counts
          if (err.type === "FieldMismatch") return false;
          // Ignore delimiter errors on specific rows (likely footer)
          if (err.code === "TooFewFields" || err.code === "TooManyFields") return false;
          return true;
        });

    if (criticalErrors.length > 0) {
      console.error("Critical CSV parsing errors:", criticalErrors);
      return NextResponse.json(
        {
          error: "CSV parsing error",
          details: criticalErrors.slice(0, 5),
        },
        { status: 400 }
      );
    }

    let rows = parseResult.data;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Validate required columns exist based on source
    const requiredColumns = source === "raymond_james"
      ? ["Client Name", "Account Nickname", "Symbol", "Holding", "Market Value"]
      : ["Account Name", "Symbol", "Name", "Market Value"];

    const headers = Object.keys(rows[0]);
    const missingColumns = requiredColumns.filter(
      (col) => !headers.includes(col)
    );

    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns for ${source === "raymond_james" ? "Raymond James" : "Wealthsimple"}`,
          details: missingColumns,
        },
        { status: 400 }
      );
    }

    // For Wealthsimple: Filter out footer rows (e.g., "As of 2026-01-08 10:27 GMT-05:00")
    // These rows have text in the first column but no valid Symbol or Market Value
    if (source === "wealthsimple") {
      rows = (rows as WealthsimpleCSVRow[]).filter((row) => {
        // Skip rows that look like footer metadata
        const accountName = row["Account Name"] || "";
        if (accountName.toLowerCase().startsWith("as of")) {
          return false;
        }
        // Skip rows without a symbol or name (likely empty/metadata rows)
        if (!row["Symbol"] && !row["Name"]) {
          return false;
        }
        return true;
      });
    }

    // Create snapshot with user-specified date and source
    const [snapshot] = await db
      .insert(snapshots)
      .values({
        userId: user.id,
        source,
        snapshotDate: snapshotDate, // User-selected date for the data
        filename: file.name,
        recordCount: rows.length,
      })
      .returning();

    // Transform and insert holdings based on source
    // Note: Client Id and Account Number are intentionally NOT stored for security
    const holdingsData = rows.map((row) => {
      const transformed = source === "raymond_james"
        ? transformCsvRow(row as CSVRow)
        : transformWealthsimpleCsvRow(row as WealthsimpleCSVRow);
      return {
        snapshotId: snapshot.id,
        clientName: transformed.clientName,
        accountNickname: transformed.accountNickname,
        assetCategory: transformed.assetCategory,
        industry: transformed.industry,
        symbol: transformed.symbol,
        holding: transformed.holding,
        quantity: transformed.quantity?.toString() || null,
        price: transformed.price?.toString() || null,
        fund: transformed.fund,
        averageCost: transformed.averageCost?.toString() || null,
        bookValue: transformed.bookValue?.toString() || null,
        marketValue: transformed.marketValue?.toString() || null,
        accruedInterest: transformed.accruedInterest?.toString() || null,
        gainLoss: transformed.gainLoss?.toString() || null,
        gainLossPercent: transformed.gainLossPercent?.toString() || null,
        percentageOfAssets: transformed.percentageOfAssets?.toString() || null,
      };
    });

    // Insert in batches to avoid query limits
    const batchSize = 100;
    for (let i = 0; i < holdingsData.length; i += batchSize) {
      const batch = holdingsData.slice(i, i + batchSize);
      await db.insert(holdings).values(batch);
    }

    // Calculate and store portfolio metrics
    const metricsResult = await db
      .select({
        totalMarketValue: sql<string>`COALESCE(SUM(${holdings.marketValue}), 0)`,
        totalBookValue: sql<string>`COALESCE(SUM(${holdings.bookValue}), 0)`,
        totalGainLoss: sql<string>`COALESCE(SUM(${holdings.gainLoss}), 0)`,
        holdingsCount: sql<number>`COUNT(*)`,
        accountsCount: sql<number>`COUNT(DISTINCT ${holdings.accountNickname})`,
      })
      .from(holdings)
      .where(eq(holdings.snapshotId, snapshot.id));

    const metrics = metricsResult[0];
    const totalBookValue = parseFloat(metrics.totalBookValue);
    const totalMarketValue = parseFloat(metrics.totalMarketValue);
    const totalGainLossPercent =
      totalBookValue > 0
        ? ((totalMarketValue - totalBookValue) / totalBookValue) * 100
        : 0;

    await db.insert(portfolioMetrics).values({
      snapshotId: snapshot.id,
      totalMarketValue: metrics.totalMarketValue,
      totalBookValue: metrics.totalBookValue,
      totalGainLoss: metrics.totalGainLoss,
      totalGainLossPercent: totalGainLossPercent.toString(),
      holdingsCount: metrics.holdingsCount,
      accountsCount: metrics.accountsCount,
    });

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        filename: snapshot.filename,
        recordCount: snapshot.recordCount,
        snapshotDate: snapshot.snapshotDate,
        importedAt: snapshot.importedAt,
        source: snapshot.source,
      },
      metrics: {
        totalMarketValue: parseFloat(metrics.totalMarketValue),
        totalBookValue: parseFloat(metrics.totalBookValue),
        totalGainLoss: parseFloat(metrics.totalGainLoss),
        totalGainLossPercent,
        holdingsCount: metrics.holdingsCount,
        accountsCount: metrics.accountsCount,
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import CSV" },
      { status: 500 }
    );
  }
}
