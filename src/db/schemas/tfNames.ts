import { pgTable, text } from "drizzle-orm/pg-core";

export const tfNamesTable = pgTable("tfNames", {
    name: text("name").primaryKey()
});
