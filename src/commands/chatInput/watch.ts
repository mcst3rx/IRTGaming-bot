import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { db, watchListPingsTable, watchListTable } from "#db";
import { Command } from "#structures";
import { collectAck, isMPStaff, youNeedRole } from "#util";

const regExp = new RegExp(/https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/channels\/(\d{17,19})?\/(\d{17,20})\/(\d{17,20})/);

export default new Command<"chatInput">({
    async run(interaction) {
        if (!isMPStaff(interaction.member)) return await youNeedRole(interaction, "mpStaff");

        switch (interaction.options.getSubcommand()) {
            case "add": {
                const reason = interaction.options.getString("reason", true);
                const name = interaction.options.getString("username", true);
                const severity = interaction.options.getString("severity", true) as "ban" | "watch";
                const reference = interaction.options.getString("reference", false);
                const watchListData = (await db.select().from(watchListTable).where(eq(watchListTable.name, name))).at(0);

                if (watchListData) return await interaction.reply(`\`${name}\` already exists for reason \`${watchListData.reason}\``);

                if (reference && !regExp.test(reference)) return interaction.reply("Invalid reference, must be a message link!");

                await db.insert(watchListTable).values({
                    name,
                    reason,
                    isSevere: severity === "ban",
                    reference
                });

                const severityText = severity === "ban" ? "banned" : "watched over";
                const referenceText = reference ? `\nReference: ${reference}` : "";

                await interaction.reply(`Successfully added \`${name}\` who needs to be **${severityText}** with reason \`${reason}\`${referenceText}`);

                break;
            };
            case "update": {
                const reason = interaction.options.getString("reason", false);
                const name = interaction.options.getString("username", true);
                const severity = interaction.options.getString("severity", false) as "ban" | "watch" | null;
                const reference = interaction.options.getString("reference", false);
                const watchListData = (await db.select().from(watchListTable).where(eq(watchListTable.name, name))).at(0);

                if (!watchListData) return interaction.reply(`\`${name}\` doesn't exist on watchList`);

                if (reference && !regExp.test(reference)) return interaction.reply("Invalid reference, must be a message link!");

                await db
                    .update(watchListTable)
                    .set({
                        reason: reason ?? undefined,
                        isSevere: severity ? severity === "ban" : undefined,
                        reference: reference ?? undefined
                    })
                    .where(eq(watchListTable.name, name));

                await interaction.reply(`Successfully updated watchList details for \`${name}\``);

                break;
            }
            case "remove": {
                const name = interaction.options.getString("username", true);
                const watchListData = (await db.select().from(watchListTable).where(eq(watchListTable.name, name))).at(0);

                if (!watchListData) return await interaction.reply(`\`${name}\` doesn't exist on watchList`);

                await db.delete(watchListTable).where(eq(watchListTable.name, name));

                await interaction.reply(`Successfully removed \`${name}\` from watchList`);

                break;
            };
            case "view": {
                const username = interaction.options.getString("username", false);
                const watchListData = await db.select().from(watchListTable);

                if (username) {
                    const playerData = watchListData.find(x => x.name === username);

                    if (playerData) {
                        await interaction.reply(
                            `Player name: \`${playerData.name}\`` +
                            `\nReason: **${playerData.reason}**` +
                            "\nSeverity: " + (playerData.isSevere ? "**Needs banning**" : "**Needs watching over**") +
                            (playerData.reference ? `\nReference: ${playerData.reference}` : "")
                        );
                    } else {
                        await interaction.reply(`No watch list details found with username \`${username}\``);
                    }
                } else {
                    await interaction.reply({ files: [{
                        attachment: Buffer.from(JSON.stringify(watchListData, null, 2)),
                        name: "watch_List.json"
                    }] });
                }

                break;
            };
            case "notifications": {
                const watchListPingsData = await db.select().from(watchListPingsTable);

                if (!watchListPingsData.some(x => x.userId === interaction.user.id)) {
                    await db.insert(watchListPingsTable).values({ userId: interaction.user.id });

                    return await interaction.reply({ embeds: [new EmbedBuilder()
                        .setDescription("You have successfully subscribed to watchList notifications")
                        .setFooter({ text: "Run this command again to unsubscribe" })
                        .setColor(interaction.client.config.EMBED_COLOR)
                    ] });
                }

                await collectAck({
                    interaction,
                    payload: {
                        embeds: [new EmbedBuilder()
                            .setDescription("You are already subscribed to watchList notifications, do you want to unsubscribe?")
                            .setColor(interaction.client.config.EMBED_COLOR)
                        ]
                    },
                    async confirm(int) {
                        await db.delete(watchListPingsTable).where(eq(watchListPingsTable.userId, interaction.user.id));

                        await int.update({
                            embeds: [new EmbedBuilder()
                                .setDescription("You have successfully unsubscribed from watchList notifications")
                                .setColor(interaction.client.config.EMBED_COLOR)
                            ],
                            components: []
                        });
                    },
                    async cancel(int) {
                        await int.update({
                            embeds: [new EmbedBuilder().setDescription("Command canceled").setColor(interaction.client.config.EMBED_COLOR)],
                            components: []
                        });
                    },
                });

                break;
            };
        };
    },
    data: {
        name: "watch",
        description: "Manage watch list",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "add",
                description: "Add a player to watchList",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "username",
                        description: "The player name to add",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "reason",
                        description: "The reason for adding the player",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "severity",
                        description: "Whether this player needs to be banned or watched over",
                        choices: [
                            { name: "Needs to be banned", value: "ban" },
                            { name: "Needs to be watched over", value: "watch" }
                        ],
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "reference",
                        description: "An optional reference (message link) to attach",
                        required: false
                    },
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "update",
                description: "Update the details of a watchList entry",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "username",
                        description: "The player name to update the details for",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "reason",
                        description: "The updated reason for adding the player",
                        required: false
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "severity",
                        description: "Update whether this player needs to be banned or watched over",
                        choices: [
                            { name: "Needs to be banned", value: "ban" },
                            { name: "Needs to be watched over", value: "watch" }
                        ],
                        required: false
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "reference",
                        description: "An optional updated reference (message link) to attach",
                        required: false
                    },
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "remove",
                description: "Remove a player from watchList",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "username",
                        description: "The player name to remove",
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "view",
                description: "View watch list details",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "username",
                        description: "The player name to view details of",
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "notifications",
                description: "Manage your subscription to watchList notifications"
            }
        ]
    }
});
