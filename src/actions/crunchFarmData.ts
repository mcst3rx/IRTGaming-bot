import { EmbedBuilder, type Client } from "discord.js";
import { eq } from "drizzle-orm";
import { db, getPlayerTimesRow, playerTimesTable } from "#db";
import { FTPActions } from "#structures";
import { fsServers, jsonFromXML, FM_ICON, TF_ICON, log } from "#util";
import type { DBData, FarmFormat } from "#typings";

type CrunchFarmDataDBData = DBData & { playerTimesData: (typeof playerTimesTable.$inferSelect)[] }

export async function crunchFarmData(client: Client, dbData: CrunchFarmDataDBData, serverAcro: string) {
    log("yellow", `Farm data cruncher running on ${serverAcro.toUpperCase()}`);

    const server = fsServers.getPublicOne(serverAcro);
    const farmData = jsonFromXML<FarmFormat>(await new FTPActions(server.ftp).get("savegame1/farms.xml"));
    const decorators = (name: string) => {
        return (dbData.fmNamesData.some(x => x.name === name) ? FM_ICON : "") + (dbData.tfNamesData.some(x => x.name === name) ? TF_ICON : "");
    };
    const channel = client.getChan("fsLogs");
    const embed = new EmbedBuilder()
        .setColor(client.config.EMBED_COLOR_YELLOW)
        .setTitle("Player name change")
        .setTimestamp();
    let changedNameCount = 0;
    let addedUuidCount = 0;

    for (const player of farmData.farms.farm[0].players.player) {
        const playerDatabyUuid = dbData.playerTimesData.find(x => x.uuid === player._attributes.uniqueUserId);

        if (!playerDatabyUuid) {
            const playerDataByName = dbData.playerTimesData.find(x => x.name === player._attributes.lastNickname);

            if (playerDataByName && !playerDataByName.uuid) {
                await db
                    .update(playerTimesTable)
                    .set({
                        uuid: player._attributes.uniqueUserId
                    })
                    .where(eq(playerTimesTable.name, player._attributes.lastNickname));

                addedUuidCount++;
            }

            continue;
        }

        // PlayerTimes name matches farm data name, no need to update playerTimes data
        if (playerDatabyUuid.name === player._attributes.lastNickname) continue;

        await channel.send({
            embeds: [embed.setDescription(
                `**UUID:** \`${playerDatabyUuid.uuid}\`\n` +
                `**Old name:** \`${playerDatabyUuid.name}\` ${decorators(playerDatabyUuid.name)}\n` +
                `**New name:** \`${player._attributes.lastNickname}\` ${decorators(player._attributes.lastNickname)}`
            )]
        });

        changedNameCount++;

        const rowExists = await getPlayerTimesRow(player._attributes.lastNickname);

        if (rowExists) {
            // Name occupied, transfer data to new name
            await db
                .update(playerTimesTable)
                .set({
                    uuid: null,
                    discordId: null
                })
                .where(eq(playerTimesTable.name, playerDatabyUuid.name));

            await db
                .update(playerTimesTable)
                .set({
                    uuid: player._attributes.uniqueUserId,
                    discordId: playerDatabyUuid.discordId
                })
                .where(eq(playerTimesTable.name, player._attributes.lastNickname));
        } else {
            // Name not occupied, create data with new name
            await db.insert(playerTimesTable).values({
                name: player._attributes.lastNickname,
                uuid: player._attributes.uniqueUserId,
                servers: playerDatabyUuid.servers,
                discordId: playerDatabyUuid.discordId
            });
        }
    }

    await channel.send(
        `⚠️ Farm data cruncher ran on **${server.fullName}**\n` +
        `Found ${changedNameCount} changed names\n` +
        `Added UUIDs to ${addedUuidCount} names`
    );
};