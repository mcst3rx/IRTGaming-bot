import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

/**
 * Generates button components for acknowledging a given action
 * @returns Respective `confirm` & `cancel` button components - action row & array-wrapped
 */
export const ACK_BUTTONS = [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
        .setCustomId("confirm")
        .setStyle(ButtonStyle.Success)
        .setLabel("Confirm"),
    new ButtonBuilder()
        .setCustomId("cancel")
        .setStyle(ButtonStyle.Danger)
        .setLabel("Cancel"))
];

/** Text used as a response for if command execution fails */
export const ERR_TEXT = ":warning: An error occurred while running this command - developers notified of issue";

/** Icon used for those who are trusted farmers */
export const TF_ICON = ":angel:";

/** Icon used for those who are farm managers */
export const FM_ICON = ":farmer:";

/** Icon used for those who are logged in as admin */
export const ADMIN_ICON = ":detective:";

/** Icon used for those who are on watchList */
export const WL_ICON = ":no_entry:";

export const REMINDERS_INTERVAL = 3_600_000;

export const UUID_LENGTH = 44;
