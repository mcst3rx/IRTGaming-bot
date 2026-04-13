import { ApplicationCommandOptionType, channelMention, EmbedBuilder, hyperlink, MessageFlags, time } from "discord.js";
import { eq, ilike } from "drizzle-orm";
import canvas from "@napi-rs/canvas";
import { DSSExtension, type DSSResponse, Feeds, filterUnused } from "farming-simulator-types/2025";
import { db, getTimeData, playerTimesTable } from "#db";
import { Command } from "#structures";
import {
    FM_ICON,
    TF_ICON,
    UUID_LENGTH,
    fetchDBData,
    formatDecorators,
    formatRequestInit,
    formatUptime,
    fsServers,
    getConfigCategoryId,
    getEmbedColor,
    isMPStaff,
    log
} from "#util";

function formatPlayerTime(playerTime: number) {
    const hours = Math.floor(playerTime / 60);
    const minutes = (playerTime % 60).toString();
    let text = hours ? hours + "h" : "";

    text += " " + minutes + "min";

    return text;
}

export default new Command<"chatInput">({
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().trim();
        const data = await db
            .select()
            .from(playerTimesTable)
            .where(ilike(playerTimesTable.name, `%${focused}%`))
            .orderBy(playerTimesTable.name)
            .limit(25);

        await interaction.respond(data.map(x => ({ name: x.name, value: x.name })));
    },
    async run(interaction) {
        const subCmd = interaction.options.getSubcommand();
        const dbData = await fetchDBData();
        const { channels } = interaction.client.config.mainServer;
        const embedColor = getEmbedColor(interaction.client);
        const embedColorDanger = getEmbedColor(interaction.client, "danger");
        const embedColorWarning = getEmbedColor(interaction.client, "warning");
        const embedColorSuccess = getEmbedColor(interaction.client, "success");
        const fsPublicMP = getConfigCategoryId(interaction.client, "fsPublicMP");

        if (fsPublicMP && interaction.channel!.parentId === fsPublicMP && !isMPStaff(interaction.member)) {
            const restrictionRedirect = interaction.client.config.resources.statsRestrictionRedirect;
            const botCommandsChannel = channels.botCommands;

            if (!restrictionRedirect || !botCommandsChannel) {
                return interaction.reply({
                    content: "This command is restricted here, but the required restriction config is missing.",
                    flags: MessageFlags.Ephemeral
                });
            }

            const link = hyperlink("restrictions", restrictionRedirect);
            const channel = channelMention(botCommandsChannel);

            return interaction.reply({
                content: `This command has ${link} set, please use ${channel} for ${interaction.client.getCommandMention("stats")} commands.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (subCmd === "all") {
            await interaction.deferReply();

            const embed = new EmbedBuilder().setColor(embedColor);
            const failedFooter: string[] = [];
            const totalUsedCount: number[] = [];

            await Promise.allSettled(fsServers.entries().map(async ([serverAcro, server]) => {
                const serverAcroUp = serverAcro.toUpperCase();
                let dss: DSSResponse;

                try {
                    const res = await fetch(
                        server.url + Feeds.dedicatedServerStats(server.code, DSSExtension.JSON),
                        formatRequestInit(4_000, "StatsAll")
                    );

                    dss = await res.json();
                } catch (err) {
                    log("red", `Stats all ${serverAcroUp}; ${err}`);

                    return void failedFooter.push(serverAcroUp);
                }

                if (!dss.slots || !dss.slots.used) return;

                if (!dss.server.name) return void failedFooter.push(`${serverAcroUp} offline`);

                totalUsedCount.push(dss.slots.used);

                const playerInfo = filterUnused(dss.slots.players).map(player => {
                    const decorators = formatDecorators(player, dbData, true);

                    return `\`${player.name}\` ${decorators} **|** ${formatUptime(player)}`;
                });

                embed.addFields({
                    name: `${server.fullName} - ${dss.slots.used}/${dss.slots.capacity}`,
                    value: playerInfo.join("\n"),
                    inline: true
                });
            }));

            embed.setTitle(`All Servers: ${totalUsedCount.reduce((a, b) => a + b, 0)} players online`);

            if (failedFooter.length) embed.setFooter({ text: "Failed to connect to " + failedFooter.join(" & ") });

            await interaction.editReply({ embeds: [embed] });
        } else if (subCmd === "playertimes") {
            const sortedPlayersData = dbData.playerTimesData.sort((a, b) =>
                getTimeData(b).reduce((x, y) => x + y[1].time, 0) - getTimeData(a).reduce((x, y) => x + y[1].time, 0)
            );
            const playerName = interaction.options.getString("name");
            const leaderboard = (data: (typeof playerTimesTable.$inferSelect)[], isFirstField: boolean) => data.map((playerData, i) => [
                `**${i + (isFirstField ? 1 : 26)}.** \`${playerData.name}\``,
                dbData.fmNamesData.some(x => x.name === playerData.name) ? FM_ICON : "",
                dbData.tfNamesData.some(x => x.name === playerData.name) ? TF_ICON : "",
                " - ",
                formatPlayerTime(getTimeData(playerData).reduce((x, y) => x + y[1].time, 0))
            ].join("")).join("\n");

            if (!playerName) {
                return interaction.reply({ embeds: [new EmbedBuilder()
                    .setColor(embedColor)
                    .setDescription(`Top 50 players with the most time spent on IRTGaming FS servers since ${interaction.client.config.PLAYERTIMES_START_DATE}`)
                    .addFields(
                        { name: "\u200b", value: leaderboard(sortedPlayersData.slice(0, 25), true), inline: true },
                        { name: "\u200b", value: leaderboard(sortedPlayersData.slice(25, 50), false) + "\u200b", inline: true })
                ] });
            }

            const dbQuery = playerName.length === UUID_LENGTH && isMPStaff(interaction.member)
                ? playerTimesTable.uuid
                : playerTimesTable.name;

            const playerData = (await db.select().from(playerTimesTable).where(eq(dbQuery, playerName))).at(0);

            if (!playerData) {
                return interaction.reply(
                    interaction.client.config.resources.statsNoDataRedirect
                        ? "No data found with that name. " + hyperlink("Find out why.", interaction.client.config.resources.statsNoDataRedirect)
                        : "No data found with that name."
                );
            }

            const fsKeys = fsServers.keys();
            const playerTimeData = getTimeData(playerData).sort((a, b) => fsKeys.indexOf(a[0]) - fsKeys.indexOf(b[0]));
            const playerTimeDataTotal = playerTimeData.reduce((x, y) => x + y[1].time, 0);
            const isInCache = (serverAcro: string) => interaction.client.fsCache[serverAcro].players.some(x => x.name === playerData.name);
            const formattedTimeData = playerTimeData
                .filter(x => interaction.client.fsCache[x[0]])
                .map(([serverAcro, timeData]) => ({
                    name: serverAcro.toUpperCase(),
                    value: `Time - ${formatPlayerTime(timeData.time)}\nLast on - ${isInCache(serverAcro) ? "Right now" : time(timeData.lastOn, "R")}`
                }));
            let decorators = "";

            if (dbData.fmNamesData.some(x => x.name === playerData.name)) decorators += FM_ICON;

            if (dbData.tfNamesData.some(x => x.name === playerData.name)) decorators += TF_ICON;

            await interaction.reply({ embeds: [new EmbedBuilder()
                .setColor(embedColor)
                .setTitle(
                    `Player - \`${playerData.name}\`${decorators}\n` +
                    `Leaderboard position - **#${sortedPlayersData.findIndex(x => x.name === playerData.name) + 1}**\n` +
                    `Total time - **${formatPlayerTime(playerTimeDataTotal)}**\n` +
                    ((isMPStaff(interaction.member) && playerData.uuid) ? `UUID: \`${playerData.uuid}\`\n` : "") +
                    ((isMPStaff(interaction.member) && playerData.discordId) ? `Discord user ID - \`${playerData.discordId}\`\n` : "")
                )
                .setFields(formattedTimeData)
            ] });
        } else {
            const server = interaction.client.config.fs[subCmd];
            const dss = await fetch(server.url + Feeds.dedicatedServerStats(server.code, DSSExtension.JSON), formatRequestInit(2_000, "Stats"))
                .then(res => res.json() as Promise<DSSResponse>)
                .catch(() => log("red", `Stats ${subCmd.toUpperCase()} failed`));

            if (!dss || !dss.slots) return await interaction.reply("Server did not respond");

            const { graphPoints } = interaction.client.fsCache[subCmd];

            // handle negative days
            for (const [i, change] of graphPoints.entries()) if (change < 0) graphPoints[i] = graphPoints[i - 1] || graphPoints[i + 1] || 0;

            const firstGraphTop = 16;
            const secondGraphTop = 16;
            const textSize = 40;
            const img = canvas.createCanvas(1500, 750);
            const ctx = img.getContext("2d");
            const graphOrigin = [15, 65];
            const graphSize = [1275, 630];
            const nodeWidth = graphSize[0] / (graphPoints.length - 1 || 1);

            ctx.fillStyle = "#36393f";
            ctx.fillRect(0, 0, img.width, img.height);

            // grey horizontal lines
            ctx.lineWidth = 5;

            const intervalCandidates: [number, number, number][] = [];

            for (let i = 4; i < 10; i++) {
                const interval = firstGraphTop / i;

                if (Number.isInteger(interval)) {
                    const intervalString = interval.toString();
                    const referenceNumber =
                        i *
                        Math.max(intervalString.split("").filter(x => x === "0").length / intervalString.length, 0.3) *
                        (["1", "2", "4", "5", "6", "8"].includes(intervalString[0]) ? 1.5 : 0.67);

                    intervalCandidates.push([interval, i, referenceNumber]);
                }
            }

            const chosenInterval = intervalCandidates.sort((a, b) => b[2] - a[2])[0];
            const previousY: number[] = [];

            ctx.strokeStyle = "#202525";

            for (let i = 0; i <= chosenInterval[1]; i++) {
                const y = graphOrigin[1] + graphSize[1] - (i * (chosenInterval[0] / secondGraphTop) * graphSize[1]);

                if (y < graphOrigin[1]) continue;

                const even = ((i + 1) % 2) === 0;

                if (even) ctx.strokeStyle = "#2c2f33";

                ctx.beginPath();
                ctx.lineTo(graphOrigin[0], y);
                ctx.lineTo(graphOrigin[0] + graphSize[0], y);
                ctx.stroke();
                ctx.closePath();

                if (even) ctx.strokeStyle = "#202525";

                previousY.push(y, i * chosenInterval[0]);
            }

            // 30 min mark
            ctx.setLineDash([8, 16]);
            ctx.beginPath();

            const midPoint = graphOrigin[0] + (nodeWidth * (graphPoints.length - 60));

            ctx.lineTo(midPoint, graphOrigin[1]);
            ctx.lineTo(midPoint, graphOrigin[1] + graphSize[1]);
            ctx.stroke();
            ctx.closePath();
            ctx.setLineDash([]);

            // draw points
            ctx.lineWidth = 5;

            const gradient = ctx.createLinearGradient(0, graphOrigin[1], 0, graphOrigin[1] + graphSize[1]);

            gradient.addColorStop(1 / 16, String(embedColorDanger));
            gradient.addColorStop(5 / 16, String(embedColorWarning));
            gradient.addColorStop(12 / 16, String(embedColorSuccess));

            let lastCoords: [number, number] | [] = [];

            for (const [i, currentPlayerCount] of graphPoints.entries()) {
                const x = i * nodeWidth + graphOrigin[0];
                const y = ((1 - (currentPlayerCount / secondGraphTop)) * graphSize[1]) + graphOrigin[1];
                const nextPlayerCount = graphPoints[i + 1];
                const previousPlayerCount = graphPoints[i - 1];

                ctx.strokeStyle = gradient;
                ctx.beginPath();

                if (lastCoords.length) ctx.moveTo(lastCoords[0], lastCoords[1]);

                // if the line being drawn is horizontal, make it go until it has to go down
                if (y === lastCoords.at(1)) {
                    let newX = x;

                    for (let j = i + 1; j <= graphPoints.length; j++) {
                        if (graphPoints[j] === currentPlayerCount) {
                            newX += nodeWidth;
                        } else break;
                    }

                    ctx.lineTo(newX, y);
                } else ctx.lineTo(x, y);

                lastCoords = [x, y];
                ctx.stroke();
                ctx.closePath();

                // Ball if vertical different to next or prev point
                if (currentPlayerCount !== previousPlayerCount || currentPlayerCount !== nextPlayerCount) {
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, ctx.lineWidth * 1.3, 0, 2 * Math.PI);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // draw text
            ctx.font = "400 " + textSize + "px DejaVu Sans";
            ctx.fillStyle = "white";

            // highest value
            if (!isNaN(previousY.at(-2)!)) {
                const maxx = graphOrigin[0] + graphSize[0] + textSize / 2;
                const maxy = (previousY.at(-2)!) + (textSize / 3);

                ctx.fillText((previousY.at(-1)!).toLocaleString("en-US"), maxx, maxy);
            }

            // lowest value
            const lowx = graphOrigin[0] + graphSize[0] + textSize / 2;
            const lowy = graphOrigin[1] + graphSize[1] + (textSize / 3);

            ctx.fillText("0 players", lowx, lowy);

            // 30 min
            ctx.fillText("30 min ago", midPoint, graphOrigin[1] - (textSize / 2));

            // time ->
            const tx = graphOrigin[0] + (textSize / 2);
            const ty = graphOrigin[1] + graphSize[1] + (textSize);

            ctx.fillText("time ->", tx, ty);

            const players = filterUnused(dss.slots.players);
            const playerInfo = players.map(player => {
                const decorators = formatDecorators(player, dbData, true);

                return `\`${player.name}\` ${decorators} **|** ${formatUptime(player)}`;
            });
            const serverTimeHrs = Math.floor(dss.server.dayTime / 3_600 / 1_000).toString().padStart(2, "0");
            const serverTimeMins = Math.floor((dss.server.dayTime / 60 / 1_000) % 60).toString().padStart(2, "0");
            const embed = new EmbedBuilder()
                .setAuthor({ name: `${dss.slots.used}/${dss.slots.capacity} - ${serverTimeHrs}:${serverTimeMins}` })
                .setTitle(dss.server.name ? server.fullName : "Offline")
                .setDescription(dss.slots.used ? playerInfo.join("\n"): "*No players online*")
                .setImage("attachment://FSStats.png")
                .setColor(dss.slots.used === dss.slots.capacity
                    ? embedColorDanger
                    : dss.slots.used > (dss.slots.capacity / 2)
                        ? embedColorWarning
                        : embedColorSuccess
                );

            if (!players.some(x => x.isAdmin) && interaction.client.fsCache[subCmd].lastAdmin) embed
                .setTimestamp(interaction.client.fsCache[subCmd].lastAdmin)
                .setFooter({ text: "Admin last on" });

            await interaction.reply({
                embeds: [embed],
                files: [{
                    attachment: img.toBuffer("image/png"),
                    name: "FSStats.png"
                }]
            });
        }
    },
    data: {
        name: "stats",
        description: "Get info on an FS server",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "all",
                description: "Get info on all servers",
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "playertimes",
                description: "Player time data",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "name",
                        description: "The in-game name of the player to get stats for",
                        autocomplete: true,
                        required: false
                    }
                ]
            },
            ...fsServers.entries().map(([serverAcro, { fullName }]) => ({
                type: ApplicationCommandOptionType.Subcommand,
                name: serverAcro,
                description: `${fullName} server stats`
            }) as const)
        ]
    }
});
