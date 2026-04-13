import { ApplicationCommandOptionType, channelMention, EmbedBuilder, MessageFlags, ThreadAutoArchiveDuration } from "discord.js";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const suggestion = interaction.options.getString("suggestion", true);
        const { communityIdeas } = interaction.client.config.mainServer.channels;

        if (interaction.channelId !== communityIdeas) {
            return interaction.reply({ content: "This command only works in " + channelMention(communityIdeas), flags: MessageFlags.Ephemeral });
        }

        const response = await interaction.reply({
            embeds: [new EmbedBuilder()
                .setAuthor({
                    name: `${interaction.member.displayName} (${interaction.user.id})`,
                    iconURL: interaction.user.displayAvatarURL({ extension: "png", size: 128 })
                })
                .setTitle("Community Idea")
                .setDescription(suggestion)
                .setTimestamp()
                .setColor(interaction.client.config.EMBED_COLOR)
            ],
            withResponse: true,
        });

        await response.resource!.message!.react("✅");
        await response.resource!.message!.react("❌");
        await response.resource!.message!.startThread({
            name: `Discussion of ${interaction.member.displayName}'s Community Idea`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
        });
    },
    data: {
        name: "suggest",
        description: "Create a suggestion",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "suggestion",
                description: "Your suggestion",
                required: true
            }
        ]
    }
});
