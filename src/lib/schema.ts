import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  serial,
  integer,
  decimal,
  jsonb,
  inet,
} from "drizzle-orm/pg-core";

// Users table for authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Sessions table for NextAuth (optional - using JWT by default)
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Import snapshots - each CSV import creates a snapshot
export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow(),
  filename: varchar("filename", { length: 255 }),
  recordCount: integer("record_count"),
});

// Holdings data from CSV imports
export const holdings = pgTable("holdings", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id")
    .references(() => snapshots.id, { onDelete: "cascade" })
    .notNull(),
  clientName: varchar("client_name", { length: 255 }),
  clientId: varchar("client_id", { length: 100 }),
  accountNickname: varchar("account_nickname", { length: 255 }),
  accountNumber: varchar("account_number", { length: 100 }),
  assetCategory: varchar("asset_category", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  symbol: varchar("symbol", { length: 50 }),
  holding: varchar("holding", { length: 255 }),
  quantity: decimal("quantity", { precision: 18, scale: 6 }),
  price: decimal("price", { precision: 18, scale: 4 }),
  fund: varchar("fund", { length: 255 }),
  averageCost: decimal("average_cost", { precision: 18, scale: 4 }),
  bookValue: decimal("book_value", { precision: 18, scale: 2 }),
  marketValue: decimal("market_value", { precision: 18, scale: 2 }),
  accruedInterest: decimal("accrued_interest", { precision: 18, scale: 2 }),
  gainLoss: decimal("gain_loss", { precision: 18, scale: 2 }),
  gainLossPercent: decimal("gain_loss_percent", { precision: 10, scale: 4 }),
  percentageOfAssets: decimal("percentage_of_assets", { precision: 10, scale: 4 }),
});

// Pre-calculated portfolio metrics per snapshot
export const portfolioMetrics = pgTable("portfolio_metrics", {
  snapshotId: integer("snapshot_id")
    .primaryKey()
    .references(() => snapshots.id, { onDelete: "cascade" }),
  totalMarketValue: decimal("total_market_value", { precision: 18, scale: 2 }),
  totalBookValue: decimal("total_book_value", { precision: 18, scale: 2 }),
  totalGainLoss: decimal("total_gain_loss", { precision: 18, scale: 2 }),
  totalGainLossPercent: decimal("total_gain_loss_percent", { precision: 10, scale: 4 }),
  holdingsCount: integer("holdings_count"),
  accountsCount: integer("accounts_count"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).defaultNow(),
});

// Audit log for security tracking
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb("details"),
  ipAddress: inet("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;
export type PortfolioMetrics = typeof portfolioMetrics.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
