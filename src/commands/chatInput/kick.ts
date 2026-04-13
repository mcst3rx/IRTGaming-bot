import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";
import { punish } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        await punish(interaction, "kick");
    },
    data: {
        name: "kick",
        description: "Kick a member",
        default_member_permissions: PermissionFlagsBits.KickMembers.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to kick",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for kicking the member",
                required: false
            }
        ]
    }
});
