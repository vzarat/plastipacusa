import { db } from "./index";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

/**
 * One-off reconciliation: enforce that GENESIS (Standard / High Performance / Elite)
 * products are always `application = 'machine'`, and every other category is `application = 'hand'`.
 * Run with: npm run db:fix-genesis-application
 */
async function run() {
  const genesisResult = await db.execute(sql`
    UPDATE products
    SET application = 'machine', updated_at = now()
    WHERE application IS DISTINCT FROM 'machine'
      AND (
        category_id ILIKE 'genesis%'
        OR category_id = 'b0000000-0000-0000-0000-000000000003'
        OR name ILIKE '%genesis%'
        OR slug ILIKE '%genesis%'
      )
  `);
  console.log("GENESIS products updated to machine application:", genesisResult);

  const otherResult = await db.execute(sql`
    UPDATE products
    SET application = 'hand', updated_at = now()
    WHERE application IS DISTINCT FROM 'hand'
      AND NOT (
        category_id ILIKE 'genesis%'
        OR category_id = 'b0000000-0000-0000-0000-000000000003'
        OR name ILIKE '%genesis%'
        OR slug ILIKE '%genesis%'
      )
  `);
  console.log("Non-GENESIS products reaffirmed as hand application:", otherResult);
}

run()
  .then(() => {
    console.log("✅ Application/category reconciliation complete.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Reconciliation failed:", err);
    process.exit(1);
  });
