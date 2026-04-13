import { ApplicationCommandType, ComponentType, EmbedBuilder, MessageFlags, TextInputStyle } from "discord.js";
import { Command } from "#structures";
import { isDCStaff, isMPStaff, log, youNeedRole } from "#util";

export default new Command<"message">({
    async run(interaction) {
        if (!isDCStaff(interaction.member) && !isMPStaff(interaction.member)) return await youNeedRole(interaction, "discordStaff");

        if (
            interaction.channelId !== interaction.client.config.mainServer.channels.communityIdeas
            || !interaction.targetMessage.embeds[0]?.title?.includes("Community Idea")
        ) return await interaction.reply({ content: "You need to select a message that is a community idea!", flags: MessageFlags.Ephemeral });

        const embed = EmbedBuilder.from(interaction.targetMessage.embeds[0]);
        const id = Date.now();

        await interaction.showModal({
            custom_id: `modal-${id}`,
            title: "Mark a community idea",
            components: [
                {
                    type: ComponentType.ActionRow,
                    components: [
                        {
                            custom_id: "marking",
                            label: "Mark this community idea (exclude \"by staff\")",
                            style: TextInputStyle.Short,
                            placeholder: "e.g. Accepted, rejected, liked, disliked",
                            type: ComponentType.TextInput
                        }
                    ]
                }
            ]
        });

        let modalInt;

        try {
            modalInt = await interaction.awaitModalSubmit({ time: 120_000, filter: int => int.customId === `modal-${id}` });
        } catch (err) {
            return log("yellow", "Modal premateurly closed");
        }

        const modalResponse = modalInt.fields.getTextInputValue("marking").replace("by staff", "").trim();

        embed.setTitle(`Community Idea\n__**${modalResponse} by staff**__`);

        await interaction.targetMessage.edit({ embeds: [embed] });
        await modalInt.reply({ content: `Community idea updated and marked as \`${modalResponse} by staff\``, flags: MessageFlags.Ephemeral });
    },
    data: {
        name: "Mark Suggestion",
        type: ApplicationCommandType.Message
    }
});