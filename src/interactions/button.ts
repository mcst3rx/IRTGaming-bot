import { type ButtonInteraction, MessageFlags, roleMention } from "discord.js";

export async function handleButton(interaction: ButtonInteraction<"cached">) {
    if (!interaction.customId.includes("-")) return;

    const args = interaction.customId.split("-");

    switch (args[0]) {
        case "reaction": {
            const roleId = args[1];

            if (interaction.member.roles.cache.has(roleId)) {
                await interaction.member.roles.remove(roleId);
                await interaction.reply({ content: "You've been removed from " + roleMention(roleId), flags: MessageFlags.Ephemeral });
            } else {
                await interaction.member.roles.add(roleId);
                await interaction.reply({ content: "You've been added to " + roleMention(roleId), flags: MessageFlags.Ephemeral });
            }

            break;
        };
        case "sub": {
            switch (args[1]) {
                case "yes": {
                    await interaction.guild.members.cache.get(args[2])?.roles.add(interaction.client.config.mainServer.roles.subscriber);

                    await interaction.message.edit({
                        content: interaction.message.content + "\n**Accepted verification**",
                        components: []
                    });

                    break;
                };
                case "no": {
                    await interaction.message.edit({
                        content: interaction.message.content + "\n**Denied verification**",
                        components: []
                    });

                    break;
                }
            }
            break;
        };
    }
}