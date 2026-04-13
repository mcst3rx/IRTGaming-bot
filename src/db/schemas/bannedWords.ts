import { pgTable, text } from "drizzle-orm/pg-core";

export const bannedWordsTable = pgTable("bannedWords", {
    word: text("word").primaryKey()
});
