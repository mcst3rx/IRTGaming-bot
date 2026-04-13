import { integer, pgTable, serial } from "drizzle-orm/pg-core";

export const dailyMsgsTable = pgTable("dailyMsgs", {
    id: serial("id").primaryKey(),
    count: integer("count").notNull()
});
