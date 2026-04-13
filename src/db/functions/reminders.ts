import { codeBlock, EmbedBuilder, type GuildTextBasedChannel, userMention, type Client } from "discord.js";
import { eq } from "drizzle-orm";
import { db, remindersTable } from "#db";

export async function executeReminder(client: Client, reminder: typeof remindersTable.$inferSelect) {
    if (!client.remindersCache.has(reminder.id)) return;

    const embed = new EmbedBuilder()
        .setTitle("Reminder")
        .setColor(client.config.EMBED_COLOR)
        .setDescription(codeBlock(reminder.content));

    try {
        await client.users.send(reminder.userId, { embeds: [embed] });
    } catch (err) {
        await (client.channels.resolve(reminder.channelId) as GuildTextBasedChannel).send({
            content: `Reminder ${userMention(reminder.userId)}`,
            embeds: [embed.setFooter({ text: "Failed to DM" })]
        });
    }

    client.remindersCache.delete(reminder.id);

    await db.delete(remindersTable).where(eq(remindersTable.id, reminder.id));
}