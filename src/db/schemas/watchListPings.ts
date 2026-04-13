import { pgTable, text } from "drizzle-orm/pg-core";

export const watchListPingsTable = pgTable("watchListPings", {
    userId: text("user_id").primaryKey()
});
