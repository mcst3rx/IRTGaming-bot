import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    codeBlock,
    EmbedBuilder,
    Events
} from "discord.js";
import { Event } from "#structures";
import { formatDiff, formatUser, hasProfanity, isDCStaff, isMPStaff } from "#util";

export default new Event({
    name: Events.MessageUpdate,
    async run(oldMessage, newMessage) {
        if (
            !oldMessage.content
            || newMessage.content === oldMessage.content
            || !newMessage.inGuild()
            || newMessage.author.bot
            || newMessage.client.config.whitelist.logs.some(x => [newMessage.channelId, newMessage.channel.parentId].includes(x))
        ) return;

        // Handle case of users editing profanity into their message
        if ((!isMPStaff(newMessage.member) && !isDCStaff(newMessage.member)) && newMessage.client.config.toggles.automod) {
            const msg = newMessage.content.replaceAll("\n", " ").toLowerCase();

            if (hasProfanity(msg)) await newMessage.delete();
        }

        if (!newMessage.client.config.toggles.logs) return;

        const { oldText, newText } = formatDiff(oldMessage.content, newMessage.content);

        await newMessage.client.getChan("botLogs").send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Message Edited")
                    .setDescription(formatUser(newMessage.author))
                    .addFields(
                        { name: "🔹 Old Content", value: codeBlock("ansi", oldText.slice(0, 1000)) },
                        { name: "🔹 New Content", value: codeBlock("ansi", newText.slice(0, 1000)) },
                        { name: "🔹 Channel", value: newMessage.channel.toString() })
                    .setAuthor({
                        name: newMessage.author.tag,
                        iconURL: newMessage.author.displayAvatarURL({ extension: "png", size: 128 })
                    })
                    .setColor(newMessage.client.config.EMBED_COLOR)
                    .setTimestamp()
            ],
            components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL(oldMessage.url)
                .setLabel("Jump to message")
            )]
        });
    }
});