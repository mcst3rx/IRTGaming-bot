import type {
    ApplicationCommandType,
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    MessageContextMenuCommandInteraction,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    RESTPostAPIContextMenuApplicationCommandsJSONBody,
    UserContextMenuCommandInteraction
} from "discord.js";

/**
 * Creates a new instance of an application command
 */
export class Command<
    TCommand extends "chatInput" | "message" | "user",
    TData = TCommand extends "chatInput"
        ? RESTPostAPIChatInputApplicationCommandsJSONBody
        : TCommand extends "message"
            ? RESTPostAPIContextMenuApplicationCommandsJSONBody & { type: ApplicationCommandType.Message }
            : RESTPostAPIContextMenuApplicationCommandsJSONBody & { type: ApplicationCommandType.User },
    TInteraction = TCommand extends "chatInput"
        ? ChatInputCommandInteraction<"cached">
        : TCommand extends "message"
            ? MessageContextMenuCommandInteraction<"cached">
            : UserContextMenuCommandInteraction<"cached">,
    TAutocomplete = TCommand extends "chatInput"
        ? ((interaction: AutocompleteInteraction<"cached">) => Promise<any>)
        : undefined
> {
    /** The optional autocomplete function that is ran for this command */
    public autocomplete?: TAutocomplete;
    /** The function that is ran for this command */
    public run: (interaction: TInteraction) => Promise<any>;
    /** The data for this command */
    public readonly data: TData;

    public constructor(commandData: Command<TCommand, TData, TInteraction, TAutocomplete>) {
        this.autocomplete = commandData.autocomplete;
        this.run = commandData.run;
        this.data = commandData.data;
    }
}