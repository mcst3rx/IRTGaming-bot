import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";
import { punish } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        await punish(interaction, "mute");
    },
    data: {
        name: "mute",
        description: "Mute a member",
        default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "The member to mute",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "time",
                description: "The duration of the mute",
                required: false
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for muting the member",
                required: false
            }
        ]
    }
});
