import { pgTable, text } from "drizzle-orm/pg-core";

export const fmNamesTable = pgTable("fmNames", {
    name: text("name").primaryKey()
});
