import { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const limit = interaction.options.getInteger("amount", true);
        const user = interaction.options.getUser("user");
        const msgs = (await interaction.channel!.messages.fetch({ limit })).filter(msg => user ? msg.author.id === user.id : true);

        await interaction.channel!.bulkDelete(msgs, true);
        await interaction.reply({ content: `Successfully deleted ${msgs.size} messages${user ? ` from ${user}` : ""}.`, flags: MessageFlags.Ephemeral });
    },
    data: {
        name: "purge",
        description: "Purge messages in this channel",
        default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Integer,
                name: "amount",
                description: "The amount of messages to purge",
                max_value: 100,
                required: true
            },
            {
                type: ApplicationCommandOptionType.User,
                name: "user",
                description: "The optional user whose messages to purge",
                required: false
            }
        ]
    }
});
