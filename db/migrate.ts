import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db";

async function main() {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations applied successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

main();
