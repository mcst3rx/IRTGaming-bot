import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import config from "#config" with { type: "json" };

const db = drizzle(postgres(config.PG_URI));

try {
    await migrate(db, { migrationsFolder: "migrations" });

    console.log("Successfully migrated");

    process.exit(0);
} catch (err) {
    console.error(err);

    process.exit(1);
}