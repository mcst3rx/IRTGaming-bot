import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";
import { punish } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        await punish(interaction, "softban");
    },
    data: {
        name: "softban",
        description: "Ban a member, delete their last day of messages, and unban them",
        default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to softban",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for softbanning the member",
                required: false
            }
        ]
    }
});
