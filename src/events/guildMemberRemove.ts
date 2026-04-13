import { EmbedBuilder, Events, time } from "discord.js";
import { eq } from "drizzle-orm";
import { db, userLevelsTable } from "#db";
import { Event } from "#structures";
import { formatUser } from "#util";

export default new Event({
    name: Events.GuildMemberRemove,
    async run(member) {
        const userLevelsData = (await db.select().from(userLevelsTable).where(eq(userLevelsTable.userId, member.id))).at(0);
        const embed = new EmbedBuilder()
            .setTitle(`Member Left: ${member.user.tag}`)
            .setDescription(formatUser(member.user))
            .addFields(
                { name: "🔹 Account Created", value: time(member.user.createdAt, "R") },
                { name: "🔹 Joined server", value: time(member.joinedAt!, "R") },
                {
                    name: `🔹 Roles: ${member.roles.cache.size - 1}`,
                    value: member.roles.cache.size > 1
                        ? member.roles.cache
                            .filter(x => x.id !== member.client.config.mainServer.id)
                            .sort((a, b) => b.position - a.position)
                            .map(x => x.toString())
                            .join(member.roles.cache.size > 4 ? " " : "\n")
                            .slice(0, 1024)
                        : "None",
                    inline: true
                }
            )
            .setTimestamp()
            .setColor(member.client.config.EMBED_COLOR_RED)
            .setThumbnail(member.user.displayAvatarURL({ extension: "png", size: 2048 }));

        if (userLevelsData) {
            await db
                .update(userLevelsTable)
                .set({ hasLeft: true })
                .where(eq(userLevelsTable.userId, member.id));

            if (userLevelsData.messageCount) {
                embed.addFields({
                    name: "🔹 Ranking Total",
                    value: userLevelsData.messageCount.toLocaleString("en-US"),
                    inline: true
                });
            }
        }

        if (member.client.config.toggles.logs) {
            await member.client.getChan("botLogs").send({ embeds: [embed] });

            await member.client.getChan("leaveLogs").send(`**${member.user.tag}** left the server.`);
        }
    }
});