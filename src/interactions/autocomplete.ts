import type { AutocompleteInteraction } from "discord.js";
import { log } from "#util";

export async function handleAutocomplete(interaction: AutocompleteInteraction<"cached">) {
    const command = interaction.client.chatInputCommands.get(interaction.commandName);

    if (!command) {
        await interaction.respond([]);
        return log("red", `Autocomplete - missing command: ${interaction.commandName}`);
    }

    if (!command.autocomplete) {
        await interaction.respond([]);
        return log("red", `Autocomplete - missing autocomplete function: ${interaction.commandName}`);
    }

    await command.autocomplete(interaction);
}