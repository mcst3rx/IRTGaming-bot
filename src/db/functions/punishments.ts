import { type Client, EmbedBuilder, type Snowflake } from "discord.js";
import ms from "ms";
import { db, punishmentsTable } from "#db";
import { formatString, formatTime } from "#util";
import { eq } from "drizzle-orm";
import type { PunishmentType } from "#typings";

async function makeModlogEntry(
    client: Client,
    punishmentData: typeof punishmentsTable.$inferSelect,
    overwrites?: typeof punishmentsTable.$inferSelect
) {
    const user = await client.users.fetch(punishmentData.userId);
    const embed = new EmbedBuilder()
        .setTitle(`${formatString(punishmentData.type)} | Case #${punishmentData.id}`)
        .addFields(
            { name: "🔹 User", value: `${user.tag}\n<@${punishmentData.userId}>\n\`${punishmentData.userId}\``, inline: true },
            { name: "🔹 Moderator", value: `<@${punishmentData.moderatorId}> \`${punishmentData.moderatorId}\``, inline: true },
            { name: "\u200b", value: "\u200b", inline: true },
            { name: "🔹 Reason", value: `\`${punishmentData.reason}\``, inline: true })
        .setColor(client.config.EMBED_COLOR)
        .setTimestamp(punishmentData.timestamp);

    if (punishmentData.duration) embed.addFields(
        { name: "🔹 Duration", value: formatTime(punishmentData.duration, 100), inline: true },
        { name: "\u200b", value: "\u200b", inline: true }
    );

    if (overwrites) {
        embed.addFields({ name: "🔹 Overwrites", value: `This case overwrites Case #${overwrites.id} \`${overwrites.reason}\`` });
    }

    await client.getChan("staffReports").send({ embeds: [embed] });
}

export async function addPunishment(
    client: Client,
    type: PunishmentType,
    moderatorId: Snowflake,
    reason: string,
    userId: Snowflake,
    duration?: string
) {
    const now = new Date();
    const guild = client.mainGuild();
    const caseData: typeof punishmentsTable.$inferInsert = {
        type,
        userId,
        reason,
        moderatorId,
        timestamp: now,
    };

    switch (type) {
        case "ban": {
            const isBanned = await guild.bans.fetch(userId).catch(() => null);

            if (isBanned) throw new Error("User is already banned!");

            await guild.bans.create(userId, { reason });

            break;
        };
        case "softban": {
            const isBanned = await guild.bans.fetch(userId).catch(() => null);

            if (isBanned) throw new Error("User is already banned!");

            await guild.bans.create(userId, { reason, deleteMessageSeconds: 86_400 });

            await guild.bans.remove(userId, reason);

            break;
        };
        case "kick": {
            await guild.members.kick(userId, reason);

            break;
        };
        case "detain": {
            await Promise.all([
                guild.voiceStates.cache.get(userId)?.disconnect(reason),
                guild.members.addRole({ user: userId, role: client.config.mainServer.roles.detained, reason })
            ]);

            break;
        };
        case "mute": {
            const member = await guild.members.fetch(userId);

            if (member.isCommunicationDisabled()) throw new Error("User is already muted!");

            const parsedTime = duration ? ms(duration) : 1_814_400_000; // 3 week default

            if (parsedTime > 2_073_600_000) throw new Error("Cannot mute user for longer than 24 days!");

            await member.timeout(parsedTime, reason);

            caseData.duration = parsedTime;

            break;
        };
    }
    const [newPunishment] = await db.insert(punishmentsTable).values(caseData).returning();

    await makeModlogEntry(client, newPunishment);

    return newPunishment;
}

export async function overwritePunishment(client: Client, punishment: typeof punishmentsTable.$inferSelect, moderatorId: Snowflake, reason: string) {
    const guild = client.mainGuild();
    const caseData: typeof punishmentsTable.$inferInsert = {
        type: `un${punishment.type}`,
        overwrites: punishment.id,
        userId: punishment.userId,
        timestamp: new Date(),
        reason,
        moderatorId
    };

    switch (punishment.type) {
        case "ban": {
            await guild.bans.remove(punishment.userId);

            break;
        };
        case "softban": {
            throw new Error("Cannot undo softban!");
        };
        case "kick": {
            throw new Error("Cannot undo kick!");
        };
        case "detain": {
            await guild.members.removeRole({
                user: punishment.userId,
                role: client.config.mainServer.roles.detained,
                reason
            });

            break;
        };
        case "mute": {
            await guild.members.edit(punishment.userId, { communicationDisabledUntil: null, reason });

            break;
        };
    }
    const [newPunishment] = await db.insert(punishmentsTable).values(caseData).returning();

    await db.update(punishmentsTable).set({ overwritten: true }).where(eq(punishmentsTable.id, punishment.id));

    await makeModlogEntry(client, newPunishment, punishment);

    return newPunishment;
}