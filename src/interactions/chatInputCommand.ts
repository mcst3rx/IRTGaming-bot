import type { ChatInputCommandInteraction } from "discord.js";
import { styleText } from "node:util";
import { ERR_TEXT, getConfigErrorMessage, log } from "#util";

export async function handleChatInputCommand(interaction: ChatInputCommandInteraction<"cached">) {
    const subCmd = interaction.options.getSubcommand(false);
    const command = interaction.client.chatInputCommands.get(interaction.commandName);

    if (!command) {
        await interaction.reply(ERR_TEXT);
        return log("red", `ChatInput - missing command: /${interaction.commandName}`);
    }

    log("white",
        styleText("green", interaction.user.tag) +
        " used " +
        styleText("green", `/${interaction.commandName} ${subCmd ?? ""}`) +
        " in " +
        styleText("green", "#" + interaction.channel!.name)
    );

    if (
        !interaction.client.config.toggles.commands
        && !interaction.client.config.devWhitelist.includes(interaction.user.id)
    ) return await interaction.reply("Commands are currently disabled.");

    try {
        await command.run(interaction);
    } catch (err: any) {
        await interaction.client.errorLog(err);

        const configErrorMessage = getConfigErrorMessage(err);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(configErrorMessage ?? ERR_TEXT);
        } else {
            await interaction.reply(configErrorMessage ?? ERR_TEXT);
        }
    }
}
