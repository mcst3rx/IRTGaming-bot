import { EmbedBuilder, Events, time } from "discord.js";
import { and, eq } from "drizzle-orm";
import { db, punishmentsTable, userLevelsTable } from "#db";
import { Event } from "#structures";
import { formatUser, log } from "#util";

export default new Event({
    name: Events.GuildMemberAdd,
    async run(member) {
        const newInvitesPromise = member.guild.invites.fetch();
        const evadingCasePromise = db
            .select()
            .from(punishmentsTable)
            .where(and(
                eq(punishmentsTable.userId, member.id),
                eq(punishmentsTable.type, "detain"),
                eq(punishmentsTable.overwritten, false)
            ));
        const userLevelsUpdatePromise = db
            .update(userLevelsTable)
            .set({ hasLeft: false })
            .where(eq(userLevelsTable.userId, member.id));
        const memberRoleAddPromise = member.roles.add(member.client.config.mainServer.roles.member)
            .catch(() => log("red", `Failed to add member role to ${member.id}`));

        const [newInvites, evadingCases] = await Promise.all([newInvitesPromise, evadingCasePromise, userLevelsUpdatePromise, memberRoleAddPromise]);

        const usedInvite = newInvites.find(inv => (member.client.inviteCache.get(inv.code)?.uses ?? 0) < (inv.uses ?? 0));

        for (const [code, inv] of newInvites) member.client.inviteCache.set(code, { uses: inv.uses ?? 0, creator: inv.inviter?.id ?? "UNKNOWN" });

        const embed = new EmbedBuilder()
            .setTitle(`Member Joined: ${member.user.tag}`)
            .setDescription(formatUser(member.user))
            .setColor(member.client.config.EMBED_COLOR_GREEN)
            .setTimestamp()
            .setThumbnail(member.user.displayAvatarURL({ extension: "png", size: 2048 }))
            .setFields({ name: "🔹 Account Created", value: time(member.user.createdAt, "R") });

        if (usedInvite) embed.addFields({
            name: "🔹 Invite Data",
            value: `Invite: \`${usedInvite.code}\`\nCreated by: **${usedInvite.inviter?.tag}**`
        });

        if (member.client.config.toggles.logs) await member.client.getChan("botLogs").send({ embeds: [embed] });

        if (evadingCases.at(0)) await member.roles.add(member.client.config.mainServer.roles.detained);
    }
});