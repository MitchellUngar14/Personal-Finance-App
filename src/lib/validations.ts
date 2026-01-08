import { z } from "zod";

// Password validation schema with security requirements
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Login credentials schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(255),
});

// Portfolio source types
export type PortfolioSource = "raymond_james" | "wealthsimple";

// CSV row schema matching Raymond James export format
export const csvRowSchema = z.object({
  "Client Name": z.string().optional(),
  "Client Id": z.string().optional(),
  "Account Nickname": z.string().optional(),
  "Account Number": z.string().optional(),
  "Asset Category": z.string().optional(),
  "Industry": z.string().optional(),
  "Symbol": z.string().optional(),
  "Holding": z.string().optional(),
  "Quantity": z.string().optional(),
  "Price": z.string().optional(),
  "Fund": z.string().optional(),
  "Average Cost": z.string().optional(),
  "Book Value": z.string().optional(),
  "Market Value": z.string().optional(),
  "Accrued Interest": z.string().optional(),
  "G/L": z.string().optional(),
  "G/L (%)": z.string().optional(),
  "Percentage of Assets": z.string().optional(),
});

// CSV row schema matching Wealthsimple export format
export const wealthsimpleCsvRowSchema = z.object({
  "Account Name": z.string().optional(),
  "Account Type": z.string().optional(),
  "Account Classification": z.string().optional(),
  "Account Number": z.string().optional(), // Not stored for security
  "Symbol": z.string().optional(),
  "Exchange": z.string().optional(),
  "MIC": z.string().optional(),
  "Name": z.string().optional(),
  "Security Type": z.string().optional(),
  "Quantity": z.string().optional(),
  "Position Direction": z.string().optional(),
  "Market Price": z.string().optional(),
  "Market Price Currency": z.string().optional(),
  "Book Value (CAD)": z.string().optional(),
  "Book Value Currency": z.string().optional(),
  "Book Value Currency (Market)": z.string().optional(),
  "Market Value": z.string().optional(),
  "Market Value Currency": z.string().optional(),
  "Market Unrealized Returns": z.string().optional(),
  "Market Unrealized Returns Currency": z.string().optional(),
});

// Parsed holding data after cleaning
// Note: Client Id and Account Number are intentionally excluded for security
export const holdingSchema = z.object({
  clientName: z.string().nullable(),
  accountNickname: z.string().nullable(), // e.g., "Investment Account - TFSA"
  assetCategory: z.string().nullable(),
  industry: z.string().nullable(),
  symbol: z.string().nullable(),
  holding: z.string().nullable(),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  fund: z.string().nullable(),
  averageCost: z.number().nullable(),
  bookValue: z.number().nullable(),
  marketValue: z.number().nullable(),
  accruedInterest: z.number().nullable(),
  gainLoss: z.number().nullable(),
  gainLossPercent: z.number().nullable(),
  percentageOfAssets: z.number().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CSVRow = z.infer<typeof csvRowSchema>;
export type WealthsimpleCSVRow = z.infer<typeof wealthsimpleCsvRowSchema>;
export type HoldingInput = z.infer<typeof holdingSchema>;

// Helper to parse currency strings to numbers (rounds to 2 decimal places for money values)
export function parseCurrency(value: string | undefined | null, decimals: number = 2): number | null {
  if (!value || value.trim() === "" || value === "-") return null;
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "-");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  // Round to specified decimal places to handle long decimal values from Wealthsimple
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Helper to parse percentage strings
export function parsePercent(value: string | undefined | null): number | null {
  if (!value || value.trim() === "" || value === "-") return null;
  // Remove % symbol and parse
  const cleaned = value.replace(/%/g, "").replace(/[()]/g, "-").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Transform Raymond James CSV row to holding data
// Note: Client Id and Account Number are read but NOT stored for security
export function transformCsvRow(row: CSVRow): HoldingInput {
  return {
    clientName: row["Client Name"] || null,
    accountNickname: row["Account Nickname"] || null, // Used for grouping (e.g., "Investment Account - TFSA")
    assetCategory: row["Asset Category"] || null,
    industry: row["Industry"] || null,
    symbol: row["Symbol"] || null,
    holding: row["Holding"] || null,
    quantity: parseCurrency(row["Quantity"], 6), // 6 decimal places for quantity
    price: parseCurrency(row["Price"], 4), // 4 decimal places for price
    fund: row["Fund"] || null,
    averageCost: parseCurrency(row["Average Cost"], 4), // 4 decimal places
    bookValue: parseCurrency(row["Book Value"], 2), // 2 decimal places for money
    marketValue: parseCurrency(row["Market Value"], 2),
    accruedInterest: parseCurrency(row["Accrued Interest"], 2),
    gainLoss: parseCurrency(row["G/L"], 2),
    gainLossPercent: parsePercent(row["G/L (%)"]),
    percentageOfAssets: parsePercent(row["Percentage of Assets"]),
  };
}

// Transform Wealthsimple CSV row to holding data
// Note: Account Number is read but NOT stored for security
export function transformWealthsimpleCsvRow(row: WealthsimpleCSVRow): HoldingInput {
  // Round long decimal values from Wealthsimple to appropriate precision
  const bookValue = parseCurrency(row["Book Value (CAD)"], 2); // 2 decimal places for money
  const marketValue = parseCurrency(row["Market Value"], 2);
  const gainLoss = parseCurrency(row["Market Unrealized Returns"], 2);
  const quantity = parseCurrency(row["Quantity"], 6); // 6 decimal places for quantity
  const price = parseCurrency(row["Market Price"], 4); // 4 decimal places for price

  // Calculate gain/loss percent if we have book value
  const gainLossPercent = bookValue && bookValue !== 0 && marketValue !== null
    ? Math.round(((marketValue - bookValue) / Math.abs(bookValue)) * 10000) / 100 // Round to 2 decimal %
    : null;

  // Build account nickname from Account Name and Account Type
  const accountName = row["Account Name"] || "";
  const accountType = row["Account Type"] || "";
  const accountNickname = accountType ? `${accountName} - ${accountType}` : accountName;

  // Calculate average cost if we have book value and quantity
  const averageCost = bookValue && quantity && quantity !== 0
    ? Math.round((bookValue / quantity) * 10000) / 10000 // Round to 4 decimal places
    : null;

  return {
    clientName: null, // Wealthsimple doesn't have client name in export
    accountNickname: accountNickname || null,
    assetCategory: row["Security Type"] || null,
    industry: null, // Wealthsimple doesn't have industry in export
    symbol: row["Symbol"] || null,
    holding: row["Name"] || null,
    quantity,
    price,
    fund: null, // Wealthsimple doesn't have fund in export
    averageCost,
    bookValue,
    marketValue,
    accruedInterest: null, // Wealthsimple doesn't have accrued interest in export
    gainLoss,
    gainLossPercent,
    percentageOfAssets: null, // Will be calculated after all rows are processed
  };
}
