import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const user = interaction.options.getUser("member", true);

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).then(() => interaction.deleteReply());
        await interaction.channel!.send(`${user} had their honorary ban revoked!`);
    },
    data: {
        name: "unband",
        description: "Revoke an honorary ban",
        options: [
            {
                type: ApplicationCommandOptionType.User,
                name: "member",
                description: "It's an honor",
                required: true
            }
        ]
    }
});
