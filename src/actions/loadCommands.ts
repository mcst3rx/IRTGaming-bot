import type { Client } from "discord.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { log } from "#util";

function isValidCommand(obj: unknown) {
    return typeof obj === "object"
        && obj !== null
        && "run" in obj
        && typeof obj.run === "function"
        && "data" in obj
        && typeof obj.data === "object";
}

export async function loadCommands(client: Client) {
    const commandFolders = await readdir(new URL(join("..", "commands"), import.meta.url));

    for (const folder of commandFolders) {
        const commandFiles = await readdir(new URL(join("..", "commands", folder), import.meta.url));

        for (const file of commandFiles) {
            const commandPath = new URL(join("..", "commands", folder, file), import.meta.url);
            const { default: commandFile } = await import(commandPath.toString());

            if (!isValidCommand(commandFile)) {
                log("red", `${file} not Command`);

                continue;
            }

            const collectionType = commandFile.data.description
                ? "chatInputCommands"
                : "contextMenuCommands";

            client[collectionType].set(commandFile.data.name, commandFile);
        }
    }
}