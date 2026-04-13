import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";
import { punish } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        await punish(interaction, "ban");
    },
    data: {
        name: "ban",
        description: "Ban a member",
        default_member_permissions: PermissionFlagsBits.BanMembers.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to ban",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for banning the member",
                required: false
            }
        ]
    }
});
