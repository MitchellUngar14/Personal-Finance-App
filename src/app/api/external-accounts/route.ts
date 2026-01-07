import { NextRequest, NextResponse } from "next/server";
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { externalAccounts, externalAccountEntries } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

// GET /api/external-accounts - List all accounts with their latest values
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active accounts
    const accountsList = await db
      .select()
      .from(externalAccounts)
      .where(and(
        eq(externalAccounts.userId, user.id),
        eq(externalAccounts.isActive, 1)
      ))
      .orderBy(externalAccounts.bankName, externalAccounts.accountName);

    // For each account, get the latest entry and count
    const accountsWithValues = await Promise.all(
      accountsList.map(async (account) => {
        const [latestEntry] = await db
          .select()
          .from(externalAccountEntries)
          .where(eq(externalAccountEntries.accountId, account.id))
          .orderBy(desc(externalAccountEntries.recordedAt))
          .limit(1);

        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(externalAccountEntries)
          .where(eq(externalAccountEntries.accountId, account.id));

        return {
          id: account.id,
          bankName: account.bankName,
          accountName: account.accountName,
          accountType: account.accountType,
          createdAt: account.createdAt,
          latestValue: latestEntry ? parseFloat(latestEntry.value) : null,
          latestRecordedAt: latestEntry?.recordedAt || null,
          entryCount: Number(countResult?.count) || 0,
        };
      })
    );

    return NextResponse.json({
      accounts: accountsWithValues,
    });
  } catch (error) {
    console.error("Error fetching external accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// POST /api/external-accounts - Create a new account with initial value
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bankName, accountName, accountType, initialValue } = body;

    if (!bankName || !accountName) {
      return NextResponse.json(
        { error: "Bank name and account name are required" },
        { status: 400 }
      );
    }

    // Create the account
    const [newAccount] = await db
      .insert(externalAccounts)
      .values({
        userId: user.id,
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountType: accountType?.trim() || null,
      })
      .returning();

    // If initial value is provided, create the first entry
    if (initialValue !== undefined && initialValue !== null) {
      await db.insert(externalAccountEntries).values({
        accountId: newAccount.id,
        value: initialValue.toString(),
        note: "Initial balance",
      });
    }

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    console.error("Error creating external account:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
