import {
    type ChatInputCommandInteraction,
    type StringSelectMenuInteraction,
    ActionRowBuilder,
    ApplicationCommandOptionType,
    codeBlock,
    ComponentType,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
} from "discord.js";
import { eq } from "drizzle-orm";
import ms from "ms";
import { db, executeReminder, remindersTable } from "#db";
import { Command } from "#structures";
import { collectAck, REMINDERS_INTERVAL } from "#util";

function formatTime(time: number) {
    return `<t:${Math.round(time / 1000)}> (<t:${Math.round(time / 1000)}:R>)`;
}

function rplText(content: string) {
    return { content, embeds: [], components: [] };
}

export default new Command<"chatInput">({
    async run(interaction) {
        async function promptDeletion(
            reminder: typeof remindersTable.$inferSelect,
            ackInt: StringSelectMenuInteraction<"cached"> | ChatInputCommandInteraction<"cached">
        ) {
            await collectAck({
                interaction: ackInt,
                time: 60_000,
                payload: {
                    embeds: [new EmbedBuilder()
                        .setColor(interaction.client.config.EMBED_COLOR)
                        .setDescription(`Are you sure you want to delete the reminder \`${reminder.content}\`?`)
                        .setFooter({ text: "60s to respond" })
                    ],
                    flags: MessageFlags.Ephemeral
                },
                async confirm(int) {
                    await db.delete(remindersTable).where(eq(remindersTable.id, reminder.id));

                    await int.update(rplText(`Successfully deleted reminder \`${reminder.content}\``));
                },
                async cancel(int) {
                    await int.update(rplText("Command manually canceled"));
                },
                async rejection() {
                    await interaction.editReply(rplText("No response given, command canceled"));
                },
            });
        }

        switch (interaction.options.getSubcommand()) {
            case "create": {
                const reminderText = interaction.options.getString("what", true);
                const reminderTime = ms(interaction.options.getString("when", true)) as number | undefined;

                if (!reminderTime) return interaction.reply({
                    flags: MessageFlags.Ephemeral,
                    embeds: [new EmbedBuilder()
                        .setTitle("Incorrect timestamp")
                        .setColor(interaction.client.config.EMBED_COLOR)
                        .setDescription([
                            "**Format:** `[amount][quantity]`",
                            "**Quantities:**",
                            [
                                "- Seconds: `s`, `sec`, `secs`, `second`, `seconds`",
                                "- Minutes: `m`, `min`, `mins`, `minute`, `minutes`",
                                "- Hours: `h`, `hour`, `hours`",
                                "- Days: `d`, `day`, `days`"
                            ].join("\n"),
                            "**Examples:** `60s`, `1min`, `45minutes`, `3hours`, `7days`"
                        ].join("\n"))
                        .setFooter({ text: "Note that times should be relative from now, i.e. 45 minutes from now" })
                    ]
                });

                if (reminderTime < 60_000) return interaction.reply({
                    flags: MessageFlags.Ephemeral,
                    content: "You cannot set a 1 minute reminder."
                });

                const timeToRemind = Date.now() + reminderTime;
                const remindersData = await db.select().from(remindersTable).where(eq(remindersTable.userId, interaction.user.id));

                if (remindersData.length > 25) return interaction.reply({
                    content: "You can only have up to 25 reminders at a time",
                    flags: MessageFlags.Ephemeral
                });

                await collectAck({
                    interaction,
                    payload: {
                        embeds: [new EmbedBuilder()
                            .setColor(interaction.client.config.EMBED_COLOR)
                            .setDescription([
                                "Are you sure you want to create a new reminder?",
                                `> Content: \`${reminderText}\``,
                                `> Time to remind: ${formatTime(timeToRemind)}`
                            ].join("\n"))
                            .setFooter({ text: "60s to respond" })
                        ],
                        flags: MessageFlags.Ephemeral
                    },
                    async confirm(int) {
                        const [reminder] = await db.insert(remindersTable).values({
                            userId: interaction.user.id,
                            content: reminderText,
                            time: new Date(timeToRemind),
                            channelId: interaction.channelId
                        }).returning();

                        if (reminderTime < REMINDERS_INTERVAL) {
                            interaction.client.remindersCache.set(reminder.id, reminder);

                            setTimeout(() => executeReminder(interaction.client, reminder), reminderTime);
                        }

                        await int.update({
                            components: [],
                            embeds: [new EmbedBuilder()
                                .setTitle("Reminder set")
                                .setDescription(codeBlock(reminderText) + "\n" + formatTime(timeToRemind))
                                .setColor(interaction.client.config.EMBED_COLOR)
                            ]
                        });
                    },
                    async cancel(int) {
                        await int.update(rplText("Command manually canceled"));
                    },
                    async rejection() {
                        await interaction.editReply(rplText("No response given, command canceled"));
                    },
                });

                break;
            };
            case "delete": {
                const remidnersData = await db.select().from(remindersTable).where(eq(remindersTable.userId, interaction.user.id));

                if (remidnersData.length === 0) return await interaction.reply({ content: "You have no active current reminders", flags: MessageFlags.Ephemeral });

                if (remidnersData.length === 1) return await promptDeletion(remidnersData[0], interaction);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("reminders")
                    .setPlaceholder("Choose a reminder to delete");

                const embed = new EmbedBuilder()
                    .setColor(interaction.client.config.EMBED_COLOR)
                    .setTitle(`You have ${remidnersData.length} active reminder(s)`)
                    .setFooter({ text: "Select a reminder to delete, 60s to respond" });

                for (const [i, x] of remidnersData.entries()) {
                    const index = (i + 1).toString();

                    selectMenu.addOptions({ label: `#${index}`, value: index });

                    embed.addFields({
                        name: `#${index}`,
                        value: [
                            `> Content: \`${x.content}\``,
                            `> Time to remind: ${formatTime(x.time.getTime())}`
                        ].join("\n")
                    });
                }

                const response = await interaction.reply({
                    embeds: [embed],
                    flags: MessageFlags.Ephemeral,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)],
                    withResponse: true
                });

                response.resource!.message!.createMessageComponentCollector({
                    filter: x => x.user.id === interaction.user.id,
                    max: 1,
                    time: 60_000,
                    componentType: ComponentType.StringSelect
                })

                    .on("collect", int => promptDeletion(remidnersData[parseInt(int.values[0]) - 1], int))
                    .on("end", async ints => {
                        if (!ints.size) await interaction.editReply(rplText("No response given, command canceled"));
                    });

                break;
            };
        }
    },
    data: {
        name: "remind",
        description: "Manage reminders",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "create",
                description: "Create a reminder",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "what",
                        description: "The content of the reminder",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "when",
                        description: "The time to remind from now (e.g. 5m, 3h, 1d)",
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "delete",
                description: "Delete an active reminder"
            }
        ]
    }
});
