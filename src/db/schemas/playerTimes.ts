import { jsonb, pgTable, text, varchar } from "drizzle-orm/pg-core";
// Conflict with hasProfanity.ts async call when generating Drizzle migration file
// So we load constants.ts directly instead of #util alias
import { UUID_LENGTH } from "../../util/constants.js";

interface PlayerTimesServer {
    time: number;
    lastOn: number;
}

export const playerTimesTable = pgTable("playerTimes", {
    name: text("name").primaryKey(),
    uuid: varchar("uuid", { length: UUID_LENGTH }),
    discordId: text("discord_id"),
    servers: jsonb("servers").$type<Record<string, PlayerTimesServer>>().notNull(),
});
