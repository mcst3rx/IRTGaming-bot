import { db, userLevelsTable } from "#db";
import { type Client, subtext, userMention } from "discord.js";
import { eq } from "drizzle-orm";

export async function incrementUser(client: Client, userId: string) {
    const userLevelsdata = (await db.select().from(userLevelsTable).where(eq(userLevelsTable.userId, userId))).at(0);

    if (!userLevelsdata) return db.insert(userLevelsTable).values({ userId, messageCount: 1, level: 0 });

    let updatedLevel = userLevelsdata.level;

    if (userLevelsdata.messageCount >= algorithm(userLevelsdata.level + 2)) {
        while (userLevelsdata.messageCount > algorithm(userLevelsdata.level + 1)) {
            updatedLevel++;

            console.log(`${userId} EXTENDED LEVELUP ${updatedLevel}`);
        }
    } else if (userLevelsdata.messageCount >= algorithm(userLevelsdata.level + 1)) {
        updatedLevel++;

        let levelUpText = `Well done ${userMention(userId)}, you made it to **level ${updatedLevel}**!`;

        if (updatedLevel === 1) levelUpText += "\n" + subtext(`You can check your current rank via ${client.getCommandMention("rank", "view")}`);

        await client.getChan("botCommands").send(levelUpText);
    }

    await db
        .update(userLevelsTable)
        .set({ level: updatedLevel, messageCount: userLevelsdata.messageCount + 1 })
        .where(eq(userLevelsTable.userId, userId));
}

export function algorithm(level: number) {
    return level * level * 15;
}