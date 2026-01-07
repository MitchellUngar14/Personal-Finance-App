import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Enable connection caching for serverless environments
neonConfig.fetchConnectionCache = true;

// Create the Neon SQL client
const sql = neon(process.env.DATABASE_URL!);

// Create the Drizzle database instance with schema
export const db = drizzle(sql, { schema });

// Export schema for convenience
export { schema };
