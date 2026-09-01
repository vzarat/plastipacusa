import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;

export const isDbConfigured = Boolean(
  connectionString &&
  !connectionString.includes("[TU_PASSWORD]") &&
  !connectionString.includes("[YOUR-PASSWORD]") &&
  !connectionString.includes("<password>") &&
  !connectionString.includes("postgres:postgres@localhost")
);

// Singleton pool instance for serverless / Next.js dev server hot reload
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

// Activar SSL siempre que no sea una base de datos local en 127.0.0.1 / localhost
const isLocalhost =
  connectionString?.includes("localhost") ||
  connectionString?.includes("127.0.0.1");

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString:
      connectionString || "postgresql://postgres:postgres@localhost:5432/plastipac",
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
export * from "./schema";