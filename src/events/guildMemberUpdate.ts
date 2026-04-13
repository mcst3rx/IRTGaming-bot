import { codeBlock, EmbedBuilder, Events } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db, punishmentsTable, overwritePunishment } from "#db";
import { Event } from "#structures";
import { formatUser } from "#util";

export default new Event({
    name: Events.GuildMemberUpdate,
    async run(oldMember, newMember) {
        if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
            const activeMuteCases = await db
                .select()
                .from(punishmentsTable)
                .where(and(
                    eq(punishmentsTable.userId, newMember.id),
                    eq(punishmentsTable.type, "mute"),
                    eq(punishmentsTable.overwritten, false)
                ));

            if (activeMuteCases.at(0)) await overwritePunishment(newMember.client, activeMuteCases.at(0)!, newMember.client.user.id, "Timeout ended!");
        }

        if (!newMember.client.config.toggles.logs) return;

        let changes = false;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(newMember.client.config.EMBED_COLOR)
            .setTitle(`Member Update: ${newMember.user.tag}`)
            .setDescription(formatUser(newMember.user))
            .setThumbnail(newMember.user.displayAvatarURL({ extension: "png", size: 2048 }));

        // Nickname changes
        if (oldMember.nickname !== newMember.nickname) {
            changes = true;

            embed.addFields(
                { name: "🔹 Old Nickname", value: oldMember.nickname ? codeBlock(oldMember.nickname) : "*No nickname*" },
                { name: "🔹 New Nickname", value: newMember.nickname ? codeBlock(newMember.nickname) : "*No nickname*" }
            );
        }

        // Role changes
        const newRoles = newMember.roles.cache.filter(x => !oldMember.roles.cache.has(x.id));
        const oldRoles = oldMember.roles.cache.filter(x => !newMember.roles.cache.has(x.id));
        const boosterRole = newMember.client.config.mainServer.roles.legendaryNitroBooster;

        if ((newRoles.size || oldRoles.size) && ((Date.now() - newMember.joinedTimestamp!) > 5_000)) {
            if (newRoles.size) embed.addFields({ name: "🔹 Roles Added", value: newRoles.map(x => x.toString()).join(" ") });
            if (oldRoles.size) embed.addFields({ name: "🔹 Roles Removed", value: oldRoles.map(x => x.toString()).join(" ") });

            changes = true;
        }

        if (changes) await newMember.client.getChan("botLogs").send({ embeds: [embed] });

        if (oldRoles.has(boosterRole) || newRoles.has(boosterRole)) {
            embed.setColor("#f47fff").setFooter({ text: `Total boosts: ${newMember.guild.premiumSubscriptionCount}` });

            await newMember.client.getChan("boostLogs").send({ embeds: [embed] });
        }
    }
});