import { codeBlock, type EmbedBuilder, Events, InteractionContextType, userMention } from "discord.js";
import cron from "node-cron";
import { crunchFarmData, fsLoop, fsLoopAll, ytFeed } from "#actions";
import {
    dailyMsgsTable,
    db,
    executeReminder,
    fmNamesTable,
    remindersTable,
    tfNamesTable,
    userLevelsTable,
    watchListTable,
    whitelistTable
} from "#db";
import { Event } from "#structures";
import { fetchDBData, fsServers, log, REMINDERS_INTERVAL } from "#util";

export default new Event({
    name: Events.ClientReady,
    once: true,
    async run(client) {
        const guild = client.mainGuild();

        if (client.config.toggles.debug) setTimeout(() => log("yellow", "Uptime - 60 seconds"), 60_000);

        if (client.config.toggles.registerCommands) {
            const commands = [
                ...client.chatInputCommands.map(x => {
                    x.data.contexts = [InteractionContextType.Guild];

                    return x.data;
                }),
                ...client.contextMenuCommands.map(x => {
                    x.data.contexts = [InteractionContextType.Guild];

                    return x.data;
                })
            ];

            await client.application.commands.set(commands)
                .then(() => log("magenta", "Application commands registered"))
                .catch(err => log("red", `Couldn't register commands: ${err}`));
        } else {
            await client.application.commands.fetch();
        }

        await guild.members.fetch();

        for (const [code, inv] of await guild.invites.fetch()) client.inviteCache.set(code, {
            uses: inv.uses ?? 0,
            creator: inv.inviter?.id ?? "UNKNOWN"
        });

        log("blue", `Bot active as ${client.user.tag}`);

        await client.getChan("taesTestingZone").send([
            ":warning: Bot restarted :warning:",
            userMention(client.config.devWhitelist[0]),
            codeBlock("json", JSON.stringify(client.config.toggles, null, 1).slice(1, -1))
        ].join("\n"));

        // Daily jobs
        cron.schedule("0 0 * * *", async (date) => {
            if (typeof date === "string") return;

            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

            const day = date.getUTCDay();
            const channel = client.getChan("general");
            const dailyMsgsData = await db.select().from(dailyMsgsTable);
            const yesterday = dailyMsgsData.at(-1) ?? { count: 0 };
            let total = (await db.select().from(userLevelsTable)).reduce((a, b) => a + b.messageCount, 0); // Sum of all users

            if (total < yesterday.count) total = yesterday.count; // Messages went down

            await db.insert(dailyMsgsTable).values({ count: total });

            log("cyan", `Pushed ${total} to dailyMsgs`);

            if (client.config.toggles.autoResponses) {
                const dailyMsgsMsg = day === 6
                    ? client.config.DAILY_MSGS_WEEKEND
                    : day === 1
                        ? client.config.DAILY_MSGS_MONDAY
                        : client.config.DAILY_MSGS_DEFAULT;

                await channel.send(dailyMsgsMsg);
            }

            if (client.config.toggles.fsLoop) {
                const dbData = await fetchDBData();

                for (const [serverAcro] of fsServers.getCrunchable()) await crunchFarmData(client, dbData, serverAcro);
            }
        }, { timezone: "UTC" });

        // Farming Simulator stats loop
        if (client.config.toggles.fsLoop) setInterval(async () => {
            const dbData = {
                fmNamesData: await db.select().from(fmNamesTable),
                tfNamesData: await db.select().from(tfNamesTable),
                watchListData: await db.select().from(watchListTable),
                whitelistData: await db.select().from(whitelistTable)
            };
            const embedBuffer: EmbedBuilder[] = [];

            for (const serverAcro of fsServers.keys()) await fsLoop(client, dbData, serverAcro, embedBuffer);

            for (let i = 0; i < embedBuffer.length; i += 10) {
                await client.getChan("fsLogs").send({ embeds: embedBuffer.slice(i, i + 10) });
            }

            await fsLoopAll(client, dbData);
        }, 30_000);

        // YouTube upload notifications feed
        if (client.config.toggles.ytFeed) ytFeed(client);

        setInterval(async () => {
            const now = Date.now();
            const allReminders = await db.select().from(remindersTable);

            for (const reminder of allReminders) {
                if (((reminder.time.getTime() - now) < REMINDERS_INTERVAL + 30_000) && !client.remindersCache.has(reminder.id)) {
                    client.remindersCache.set(reminder.id, reminder);

                    setTimeout(() => executeReminder(client, reminder), reminder.time.getTime() - now);
                }
            }
        }, REMINDERS_INTERVAL);
    }
});