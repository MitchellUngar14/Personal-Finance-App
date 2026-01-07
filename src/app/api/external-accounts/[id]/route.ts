import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { externalAccounts, externalAccountEntries } from "@/lib/schema";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/external-accounts/[id] - Get account with full history
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);

    // Get the account
    const account = await db.query.externalAccounts.findFirst({
      where: and(
        eq(externalAccounts.id, accountId),
        eq(externalAccounts.userId, user.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get all entries for this account
    const entries = await db
      .select()
      .from(externalAccountEntries)
      .where(eq(externalAccountEntries.accountId, accountId))
      .orderBy(desc(externalAccountEntries.recordedAt));

    return NextResponse.json({
      account,
      entries: entries.map((e) => ({
        ...e,
        value: parseFloat(e.value),
      })),
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// POST /api/external-accounts/[id] - Add a new value entry (blockchain style)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);

    // Verify ownership
    const account = await db.query.externalAccounts.findFirst({
      where: and(
        eq(externalAccounts.id, accountId),
        eq(externalAccounts.userId, user.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const body = await request.json();
    const { value, note } = body;

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: "Value is required" },
        { status: 400 }
      );
    }

    // Create a new entry (immutable - we never update, only add)
    const [newEntry] = await db
      .insert(externalAccountEntries)
      .values({
        accountId,
        value: value.toString(),
        note: note?.trim() || null,
      })
      .returning();

    return NextResponse.json({
      entry: {
        ...newEntry,
        value: parseFloat(newEntry.value),
      },
    });
  } catch (error) {
    console.error("Error adding entry:", error);
    return NextResponse.json(
      { error: "Failed to add entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/external-accounts/[id] - Soft delete account
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);

    // Verify ownership
    const account = await db.query.externalAccounts.findFirst({
      where: and(
        eq(externalAccounts.id, accountId),
        eq(externalAccounts.userId, user.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Hard delete (entries will cascade)
    await db
      .delete(externalAccounts)
      .where(eq(externalAccounts.id, accountId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
