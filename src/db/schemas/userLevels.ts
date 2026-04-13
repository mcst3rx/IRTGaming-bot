import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const userLevelsTable = pgTable("userLevels", {
    userId: text("user_id").primaryKey(),
    messageCount: integer("message_count").notNull(),
    level: integer("level").notNull(),
    hasLeft: boolean("has_left").default(false).notNull()
});
