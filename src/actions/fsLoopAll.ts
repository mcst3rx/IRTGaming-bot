import { type Client, EmbedBuilder } from "discord.js";
import { formatDecorators, formatUptime, log } from "#util";
import type { DBData } from "#typings";

export async function fsLoopAll(client: Client, dbData: DBData) {
    const embed = new EmbedBuilder().setColor(client.config.EMBED_COLOR);
    const throttleList: (boolean | null)[] = [];
    const totalCount: number[] = [];
    const footerText: string[] = [];

    for (const [serverAcro, server] of Object.entries(client.fsCache)) {
        const playerInfo: string[] = [];
        const serverSlots = server.players.length;

        totalCount.push(serverSlots);
        throttleList.push(server.throttled);

        for (const player of server.players) {
            const decorators = formatDecorators(player, dbData, false);

            playerInfo.push(`\`${player.name.slice(0, 46)}\` ${decorators} **|** ${formatUptime(player)}`);
        }

        if (playerInfo.length) embed.addFields({
            name: `${serverAcro.toUpperCase()} - ${serverSlots}/16`,
            value: playerInfo.join("\n")
        });

        if (server.state === 0) footerText.push(`${serverAcro.toUpperCase()} offline`);
    }

    // Throttle message updating if no changes in API data on any servers
    if (throttleList.every(x => x)) return;

    if (footerText.length) embed.setFooter({ text: footerText.join(", ") });

    await client.getChan("juniorAdminChat").messages
        .edit(client.config.mainServer.fsLoopMsgId, { embeds: [embed.setTitle(totalCount.reduce((a, b) => a + b, 0) + " online")] })
        .catch(() => log("red", "FSLoopAll invalid msg"));
}
