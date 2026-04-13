import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const time = interaction.options.getInteger("time", true);

        await interaction.channel!.setRateLimitPerUser(time, `Done by ${interaction.user.tag}`);

        await interaction.reply(time
            ? `Slowmode set to \`${time}\` ${time === 1 ? "second" : "seconds"}`
            : "Slowmode removed"
        );
    },
    data: {
        name: "slowmode",
        description: "Set a slowmode for this channel",
        default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Integer,
                name: "time",
                description: "The time amount for the slowmode in seconds",
                min_value: 0,
                max_value: 21600,
                required: true
            }
        ]
    }
});
