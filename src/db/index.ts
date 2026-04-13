import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import config from "#config" with { type: "json" };

export const db = drizzle(postgres(config.PG_URI));

export * from "./functions/index.js";
export * from "./schemas/index.js";