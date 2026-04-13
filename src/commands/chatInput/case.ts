import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits, userMention } from "discord.js";
import { eq } from "drizzle-orm";
import { db, punishmentsTable } from "#db";
import { Command } from "#structures";
import { formatString, formatTime, formatUser } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        switch (interaction.options.getSubcommand()) {
            case "view": {
                const caseId = interaction.options.getInteger("id", true);
                const punishment = (await db.select().from(punishmentsTable).where(eq(punishmentsTable.id, caseId))).at(0);

                if (!punishment) return await interaction.reply("A case with that ID wasn't found!");

                const user = await interaction.client.users.fetch(punishment.userId);

                // If the current punishment was overwritten by another
                const overwrittenBy = punishment.overwritten
                    ? (await db.select().from(punishmentsTable).where(eq(punishmentsTable.overwrites, punishment.id))).at(0)
                    : null;

                // If the current punishment overwrites another
                const overwrites = punishment.overwrites
                    ? (await db.select().from(punishmentsTable).where(eq(punishmentsTable.id, punishment.overwrites))).at(0)
                    : null;
                const embed = new EmbedBuilder()
                    .setTitle(`${formatString(punishment.type)} | Case #${punishment.id}`)
                    .addFields(
                        { name: "🔹 User", value: `${user.tag}\n<@${punishment.userId}> \`${punishment.userId}\``, inline: true },
                        { name: "🔹 Moderator", value: `<@${punishment.moderatorId}> \`${punishment.moderatorId}\``, inline: true },
                        { name: "\u200b", value: "\u200b", inline: true },
                        { name: "🔹 Reason", value: `\`${punishment.reason || "unspecified"}\``, inline: true })
                    .setColor(interaction.client.config.EMBED_COLOR)
                    .setTimestamp(punishment.timestamp);

                if (punishment.duration) embed.addFields(
                    {
                        name: "🔹 Duration",
                        value: formatTime(punishment.duration, 100),
                        inline: true
                    },
                    {
                        name: "\u200b",
                        value: "\u200b",
                        inline: true
                    }
                );

                if (punishment.overwritten) embed.addFields({
                    name: "🔹 Expired",
                    value: `This case has been overwritten by Case #${overwrittenBy?.id} for reason \`${overwrittenBy?.reason}\``
                });

                if (punishment.overwrites) embed.addFields({
                    name: "🔹 Overwrites",
                    value: `This case overwrites Case #${overwrites?.id} \`${overwrites?.reason}\``
                });

                await interaction.reply({ embeds: [embed] });

                break;
            };
            case "member": {
                const user = interaction.options.getUser("user", true);
                const pageNumber = interaction.options.getInteger("page") ?? 1;
                const punishmentsData = await db.select().from(punishmentsTable);
                const userPunishmentsData = punishmentsData.filter(x => x.userId === user.id);
                const formattedPuns = userPunishmentsData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()).map(punishment => ({
                    name: `${formatString(punishment.type)} | Case #${punishment.id}`,
                    value: [
                        `> Reason: \`${punishment.reason}\``,
                        punishment.duration ? `\n> Duration: ${formatTime(punishment.duration, 3)}` : "",
                        `\n> Moderator: ${userMention(punishment.moderatorId)}`,
                        punishment.overwritten ? `\n> __Overwritten by Case #${punishmentsData.find(x => x.overwrites === punishment.id)?.id}__` : "",
                        punishment.overwrites ? `\n> __Overwrites Case #${punishment.overwrites}__` : ""].join("")
                }));

                if (!formattedPuns || !formattedPuns.length) return interaction.reply("No punishments found with that user ID");

                await interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`Punishments for ${user.tag}`)
                    .setDescription(formatUser(user))
                    .setFooter({
                        text: `${formattedPuns.length} total punishments. Viewing page ${pageNumber} out of ${Math.ceil(formattedPuns.length / 25)}.`
                    })
                    .setColor(interaction.client.config.EMBED_COLOR)
                    .addFields(formattedPuns.slice((pageNumber - 1) * 25, pageNumber * 25))
                ] });

                break;
            };
            case "update": {
                const caseId = interaction.options.getInteger("id", true);
                const reason = interaction.options.getString("reason", true);

                await db.update(punishmentsTable).set({ reason }).where(eq(punishmentsTable.id, caseId));

                await interaction.reply({ embeds: [new EmbedBuilder()
                    .setColor(interaction.client.config.EMBED_COLOR)
                    .setTitle(`Case #${caseId} updated`)
                    .setDescription(`**New reason:** ${reason}`)
                ] });
                break;
            }
        }
    },
    data: {
        name: "case",
        description: "Manage punishment cases",
        default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "view",
                description: "View a single case",
                options: [
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "id",
                        description: "The ID of the case to view",
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "member",
                description: "View all of a member's cases",
                options: [
                    {
                        type: ApplicationCommandOptionType.User,
                        name: "user",
                        description: "The member whose cases to view",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "page",
                        description: "The page number (if multiple case pages)"
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "update",
                description: "Update a case's reason",
                options: [
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "id",
                        description: "The ID of the case to update",
                        required: true,
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "reason",
                        description: "The new reason for the case",
                        required: true
                    }
                ]
            }
        ]
    }
});
