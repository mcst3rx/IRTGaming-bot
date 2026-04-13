import { EmbedBuilder, MessageFlags } from "discord.js";
import { Command } from "#structures";
import { fsServers, isMPStaff } from "#util";

const serverNames = fsServers.getPublicNames().join(" or ");

export default new Command<"chatInput">({
    async run(interaction) {
        if (
            interaction.channel!.parentId !== interaction.client.config.mainServer.categories.activeTickets
            && !isMPStaff(interaction.member)
        ) return await interaction.reply({ content: "You cannot use this command here", flags: MessageFlags.Ephemeral });

        await interaction.reply({ embeds: [new EmbedBuilder()
            .setTitle("MP Support - Ban Appeal")
            .setColor(interaction.client.config.EMBED_COLOR)
            .setDescription([
                "To appeal a ban on one of our MP servers, please provide the following information:",
                "- In-game name at the time of being banned",
                "- Rough time and date",
                `- Server name (${serverNames})`,
                "- If applicable; what you were doing at the time of being banned",
                "- Anything else which could help with the appeal, e.g. additional names you've used",
                "\u200b",
                "Once you have done so, we will review your ban as soon as possible. Please be patient as we may have to wait for staff in other time zones before making a decision."
            ].join("\n"))
        ] });
    },
    data: {
        name: "appeal",
        description: "Appeal an MP ban"
    }
});
