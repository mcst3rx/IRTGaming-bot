import { Events } from "discord.js";
import * as Handlers from "../interactions/index.js";
import { Event } from "#structures";

export default new Event({
    name: Events.InteractionCreate,
    async run(interaction) {
        if (!interaction.inCachedGuild()) return;

        switch (true) {
            case interaction.isChatInputCommand():
                await Handlers.handleChatInputCommand(interaction);
                break;
            case interaction.isContextMenuCommand():
                await Handlers.handleContextMenuCommand(interaction);
                break;
            case interaction.isButton():
                await Handlers.handleButton(interaction);
                break;
            case interaction.isAutocomplete():
                await Handlers.handleAutocomplete(interaction);
                break;
        }
    }
});