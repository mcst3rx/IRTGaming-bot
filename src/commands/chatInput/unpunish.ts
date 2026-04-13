import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { eq } from "drizzle-orm";
import { db, punishmentsTable, overwritePunishment } from "#db";
import { Command } from "#structures";
import { formatString, hasRole, youNeedRole } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        const caseId = interaction.options.getInteger("id", true);
        const punishmentData = (await db.select().from(punishmentsTable).where(eq(punishmentsTable.id, caseId))).at(0);
        const reason = interaction.options.getString("reason") ?? "Unspecified";

        if (!punishmentData) return interaction.reply("No case found with that ID!");

        if (punishmentData.overwritten) return interaction.reply(`Case #${caseId} has already been overwritten!`);

        if (punishmentData.type !== "mute" && hasRole(interaction.member, "discordHelper")) return youNeedRole(interaction, "discordModerator");

        await interaction.deferReply();

        let caseDoc;

        try {
            caseDoc = await overwritePunishment(interaction.client, punishmentData, interaction.user.id, reason);
        } catch (err: any) {
            return interaction.editReply(err.message);
        }

        const user = await interaction.client.users.fetch(caseDoc.userId);

        await interaction.editReply({ embeds: [new EmbedBuilder()
            .setColor(interaction.client.config.EMBED_COLOR)
            .setTitle(`Case #${caseDoc.id}: ${formatString(caseDoc.type)}`)
            .setDescription(`${user.tag}\n${user}\n(\`${user.id}\`)`)
            .addFields(
                { name: "Reason", value: reason },
                { name: "Overwrites", value: `Case #${punishmentData.id}` })
        ] });
    },
    data: {
        name: "unpunish",
        description: "Overwrite a case",
        default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.Integer,
                name: "id",
                description: "The ID of the punishment to overwrite",
                required: true
            },
            {
                type: ApplicationCommandOptionType.String,
                name: "reason",
                description: "The reason for overwriting the punishment"
            }
        ]
    }
});
