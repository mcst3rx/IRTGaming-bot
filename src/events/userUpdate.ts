import { codeBlock, EmbedBuilder, Events } from "discord.js";
import { Event } from "#structures";
import { formatUser } from "#util";

export default new Event({
    name: Events.UserUpdate,
    async run(oldUser, newUser) {
        if (!newUser.client.config.toggles.logs || oldUser.tag === newUser.tag) return;

        await newUser.client.getChan("botLogs").send({ embeds: [new EmbedBuilder()
            .setTimestamp()
            .setColor(newUser.client.config.EMBED_COLOR)
            .setTitle(`User Update: ${newUser.tag}`)
            .setDescription(formatUser(newUser))
            .setThumbnail(newUser.displayAvatarURL({ extension: "png", size: 2048 }))
            .setFields(
                { name: "🔹 Old Tag", value: codeBlock(oldUser.tag ?? "") },
                { name: "🔹 New Tag", value: codeBlock(newUser.tag) })
        ] });
    }
});