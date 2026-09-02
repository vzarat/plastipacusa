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

const isLocalhost =
  Boolean(connectionString?.includes("localhost") ||
  connectionString?.includes("127.0.0.1"));

let pool: Pool | null = null;

if (isDbConfigured && connectionString) {
  try {
    pool =
      globalForDb.pool ??
      new Pool({
        connectionString,
        ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
      });

    // Guard against unhandled 'error' events on idle clients to prevent crashing server process
    pool.on("error", (err) => {
      console.warn("Postgres pool client warning (handled):", err.message);
    });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.pool = pool;
    }
  } catch (err: any) {
    console.warn("Postgres pool initialization failed:", err?.message || err);
    pool = null;
  }
}

// Safe fallback db for when DATABASE_URL is not configured or fails
const fallbackDb: any = {
  query: {
    products: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    productVariants: {
      findMany: async () => [],
      findFirst: async () => null,
    },
    inquiries: {
      findMany: async () => [],
      findFirst: async () => null,
    },
  },
  insert: () => ({
    values: async () => ({}),
  }),
  select: () => ({
    from: () => ({
      where: () => [],
    }),
  }),
};

export const db = pool
  ? drizzle(pool, { schema })
  : (fallbackDb as ReturnType<typeof drizzle<typeof schema>>);

export * from "./schema";