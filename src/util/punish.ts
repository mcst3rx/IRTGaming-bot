import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import { addPunishment } from "#db";
import { formatString, formatTime, hasRole, youNeedRole } from "#util";
import type { PunishmentType } from "#typings";

export async function punish(interaction: ChatInputCommandInteraction<"cached">, type: PunishmentType) {
    if (type !== "mute" && hasRole(interaction.member, "discordHelper")) return youNeedRole(interaction, "discordStaff");

    const time = interaction.options.getString("time") ?? undefined;
    const reason = interaction.options.getString("reason") ?? "Unspecified";
    const guildMember = interaction.options.getMember("member");
    const user = interaction.options.getUser("member", true);

    if (interaction.user.id === user.id) return interaction.reply(`You cannot ${type} yourself!`);
    if (!guildMember && type !== "ban") return interaction.reply(`You cannot ${type} someone who is not in the server!`);

    await interaction.deferReply();

    let result;

    try {
        result = await addPunishment(interaction.client, type, interaction.user.id, reason, user.id, time);
    } catch (err: any) {
        console.log(err);

        return interaction.editReply(err.message);
    }

    const embed = new EmbedBuilder()
        .setColor(interaction.client.config.EMBED_COLOR)
        .setTitle(`Case #${result.id}: ${formatString(result.type)}`)
        .setDescription(`${user.tag}\n${user}\n(\`${user.id}\`)`)
        .setFields({ name: "Reason", value: reason });

    if (result.duration) embed.addFields({
        name: "Duration",
        value: formatTime(result.duration, 4, { longNames: true, commas: true })
    });

    await interaction.editReply({ embeds: [embed] });
}