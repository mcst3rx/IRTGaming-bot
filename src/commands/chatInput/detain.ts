import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";
import { punish } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        await punish(interaction, "detain");
    },
    data: {
        name: "detain",
        description: "Give a membr the \"Detained\" role",
        default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to detain",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for detaining the member",
                required: false
            }
        ]
    }
});
