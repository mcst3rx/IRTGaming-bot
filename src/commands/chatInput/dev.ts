import * as Discord from "discord.js";
import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    codeBlock,
    ComponentType,
    EmbedBuilder
} from "discord.js";
import { exec } from "child_process";
import * as drizzle from "drizzle-orm";
import fs from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { formatWithOptions } from "node:util";
import * as actions from "#actions";
import * as db from "#db";
import * as structures from "#structures";
import * as util from "#util";

export default new structures.Command<"chatInput">({
    async run(interaction) {
        if (!interaction.client.config.devWhitelist.includes(interaction.user.id)) {
            return await interaction.reply("You're not allowed to use dev commands.");
        }

        switch (interaction.options.getSubcommand()) {
            case "eval": {
                // eslint-disable-next-line no-unused-expressions
                sleep; fs; Discord; actions; db; drizzle; // Imports possibly used in eval
                const { client } = interaction;
                const code = interaction.options.getString("code", true);
                const depth = interaction.options.getInteger("depth") ?? 1;
                const useAsync = Boolean(interaction.options.getBoolean("async", false));
                const embed = new EmbedBuilder()
                    .setColor(client.config.EMBED_COLOR)
                    .addFields({ name: "Input", value: codeBlock("js", code.slice(0, 1010)) });
                const now = performance.now();
                let output;

                try {
                    output = await eval(useAsync ? `(async () => { ${code} })()` : code);
                } catch (err: any) {
                    console.log(err);

                    embed
                        .setColor("#ff0000")
                        .addFields({
                            name: `Output • ${(performance.now() - now).toFixed(5)}ms • ${util.formatString(typeof output)}`,
                            value: codeBlock(err)
                        });

                    let msg;
                    const msgPayload = {
                        embeds: [embed],
                        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder().setCustomId("stack").setStyle(ButtonStyle.Primary).setLabel("Stack")
                        )],
                        withResponse: true as const
                    };

                    try {
                        const response = await interaction.reply(msgPayload);

                        msg = response.resource!.message!;
                    } catch (replyErr) {
                        msg = await interaction.channel!.send(msgPayload);
                    }

                    msg.createMessageComponentCollector({
                        filter: x => x.user.id === interaction.user.id,
                        max: 1,
                        time: 60_000,
                        componentType: ComponentType.Button
                    })
                        .on("collect", int => void int.reply(codeBlock(err.stack.slice(0, 1950))))
                        .on("end", () => void msg.edit({ components: [] }));

                    return;
                }

                // Output manipulation
                const outputType = util.formatString(typeof output);
                output = typeof output === "object"
                    ? "js\n" + formatWithOptions({ depth }, "%O", output)
                    : "\n" + String(output);

                embed.addFields({
                    name: `Output • ${(performance.now() - now).toFixed(5)}ms • ${outputType}`,
                    value: `\`\`\`${output.slice(0, 1016)}\n\`\`\``
                });

                await interaction.reply({ embeds: [embed] }).catch(() => interaction.channel!.send({ embeds: [embed] }));

                break;
            };
            case "restart": {
                await interaction.reply("Compiling...");

                exec("tsc", async (error, stdout) => {
                    if (error) return await interaction.editReply(codeBlock(stdout.slice(0, 1950)));

                    await interaction.editReply("Restarting...").then(() => process.exit(-1));
                });

                break;
            }
        }
    },
    data: {
        name: "dev",
        description: "Run bot-dev-only commands",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "eval",
                description: "Execute code within the bot",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "code",
                        description: "The code to execute",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.Integer,
                        name: "depth",
                        description: "The depth of the output",
                        max_value: 5,
                        required: false
                    },
                    {
                        type: ApplicationCommandOptionType.Boolean,
                        name: "async",
                        description: "Whether to wrap the code in an async block or not",
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "restart",
                description: "Restart the bot"
            }
        ]
    }
});
