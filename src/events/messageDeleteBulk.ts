import { codeBlock, EmbedBuilder, Events } from "discord.js";
import { styleText } from "node:util";
import { Event } from "#structures";

export default new Event({
    name: Events.MessageBulkDelete,
    async run(messages, channel) {
        if (!channel.client.config.toggles.logs) return;

        const formattedMsgsContent = codeBlock("ansi", messages
            .map(msg => `${styleText("yellow", msg.author?.username ?? "UNKNOWN")}: ${msg.content}`)
            .reverse()
            .join("\n")
            .slice(0, 3900)
        );

        await channel.client.getChan("botLogs").send({
            embeds: [new EmbedBuilder()
                .setTitle(`${messages.size} messages were deleted`)
                .setDescription(formattedMsgsContent)
                .addFields({ name: "🔹 Channel", value: channel.toString() })
                .setColor(channel.client.config.EMBED_COLOR_RED)
                .setTimestamp()
            ]
        });
    }
});