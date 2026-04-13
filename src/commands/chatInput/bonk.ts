import { ApplicationCommandOptionType, EmbedBuilder, MessageFlags } from "discord.js";
import { Command } from "#structures";
import { getEmbedColor, getConfigResource } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        const member = interaction.options.getMember("member");
        let reason = interaction.options.getString("reason", false);

        if (!member) return await interaction.reply({ content: "You cannot bonk someone who's not in the server!", flags: MessageFlags.Ephemeral });
        if (reason?.startsWith("for ")) reason = reason.replace("for ", "");

        const embed = new EmbedBuilder()
            .setColor(getEmbedColor(interaction.client))
            .setTitle([
                interaction.user.username,
                " bonked ",
                interaction.user.id === member.id ? "themselves" : member.user.username,
                "\nfor ",
                reason ?? "no reason",
                "!"
            ].join(""));
        const thumbnail = getConfigResource(interaction.client, "bonkEmbedThumbnail");

        if (thumbnail) embed.setThumbnail(thumbnail);

        await interaction.reply({ embeds: [embed] });
    },
    data: {
        name: "bonk",
        description: "Bonk someone",
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to bonk",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for bonking the member",
                required: false
            }
        ]
    }
});
