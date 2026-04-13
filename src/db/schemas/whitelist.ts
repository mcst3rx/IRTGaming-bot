import { pgTable, text } from "drizzle-orm/pg-core";

export const whitelistTable = pgTable("whitelist", {
    name: text("name").primaryKey()
});
