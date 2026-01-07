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
export type HoldingInput = z.infer<typeof holdingSchema>;

// Helper to parse currency strings to numbers
export function parseCurrency(value: string | undefined | null): number | null {
  if (!value || value.trim() === "" || value === "-") return null;
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "-");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Helper to parse percentage strings
export function parsePercent(value: string | undefined | null): number | null {
  if (!value || value.trim() === "" || value === "-") return null;
  // Remove % symbol and parse
  const cleaned = value.replace(/%/g, "").replace(/[()]/g, "-").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Transform CSV row to holding data
// Note: Client Id and Account Number are read but NOT stored for security
export function transformCsvRow(row: CSVRow): HoldingInput {
  return {
    clientName: row["Client Name"] || null,
    accountNickname: row["Account Nickname"] || null, // Used for grouping (e.g., "Investment Account - TFSA")
    assetCategory: row["Asset Category"] || null,
    industry: row["Industry"] || null,
    symbol: row["Symbol"] || null,
    holding: row["Holding"] || null,
    quantity: parseCurrency(row["Quantity"]),
    price: parseCurrency(row["Price"]),
    fund: row["Fund"] || null,
    averageCost: parseCurrency(row["Average Cost"]),
    bookValue: parseCurrency(row["Book Value"]),
    marketValue: parseCurrency(row["Market Value"]),
    accruedInterest: parseCurrency(row["Accrued Interest"]),
    gainLoss: parseCurrency(row["G/L"]),
    gainLossPercent: parsePercent(row["G/L (%)"]),
    percentageOfAssets: parsePercent(row["Percentage of Assets"]),
  };
}
