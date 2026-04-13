import { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const member = interaction.options.getMember("member");

        if (!member) return await interaction.reply({ content: "You need to select a member that is in this server", flags: MessageFlags.Ephemeral });

        await interaction.client.getChan("counting").permissionOverwrites.edit(member, { SendMessages: false });
        await interaction.reply(
            `${member}'s permisson to send messages in <#${interaction.client.config.mainServer.channels.counting}> has been removed`
        );
    },
    data: {
        name: "discount",
        description: "Remove a member's ability to participate in #counting",
        default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to restrict participation for",
                required: true
            }
        ]
    }
});
