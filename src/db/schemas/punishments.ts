import {
    type AnyPgColumn,
    boolean,
    integer,
    pgTable,
    serial,
    text,
    timestamp
} from "drizzle-orm/pg-core";

export const punishmentsTable = pgTable("punishments", {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    userId: text("user_id").notNull(),
    moderatorId: text("moderator_id").notNull(),
    overwritten: boolean("overwritten").default(false).notNull(),
    timestamp: timestamp("time", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    overwrites: integer("overwrites").references((): AnyPgColumn => punishmentsTable.id),
    duration: integer("duration")
});
