import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const remindersTable = pgTable("reminders", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    content: text("content").notNull(),
    time: timestamp("time", { withTimezone: true }).notNull(),
    channelId: text("channel_id").notNull()
});
