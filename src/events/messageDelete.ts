import { codeBlock, EmbedBuilder, Events, time } from "discord.js";
import { Event } from "#structures";
import { formatUser } from "#util";

export default new Event({
    name: Events.MessageDelete,
    async run(message) {
        if (
            !message.client.config.toggles.logs
            || message.partial
            || !message.inGuild()
            || message.author.bot
            || message.client.config.whitelist.logs.some(x => [message.channelId, message.channel.parentId ?? ""].includes(x))
        ) return;

        const embed = new EmbedBuilder()
            .setTitle("Message Deleted")
            .setDescription(formatUser(message.author))
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ extension: "png", size: 128 })
            })
            .setColor(message.client.config.EMBED_COLOR_RED)
            .setTimestamp();

        if (message.content.length) embed.addFields({ name: "🔹 Content", value: codeBlock(message.content.slice(0, 1000)) });

        embed.addFields(
            { name: "🔹 Channel", value: message.channel.toString() },
            { name: "🔹 Sent", value: time(message.createdAt, "R") }
        );

        await message.client.getChan("botLogs").send({
            embeds: [embed],
            files: [...message.attachments.values()]
        });
    }
});