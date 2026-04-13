import type { Client } from "discord.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { Event } from "#structures";
import { log } from "#util";

export async function loadEvents(client: Client) {
    const events = await readdir(new URL(join("..", "events"), import.meta.url));

    for (const file of events) {
        const eventPath = new URL(join("..", "events", file), import.meta.url);
        const { default: eventFile } = await import(eventPath.toString());

        if (!(eventFile instanceof Event)) {
            log("red", `${file} not Event`);

            continue;
        }

        client[eventFile.once ? "once" : "on"](eventFile.name, async (...args) => {
            try {
                await eventFile.run(...args);
            } catch (err) {
                await client.errorLog(err as Error);
            }
        });
    }
}
