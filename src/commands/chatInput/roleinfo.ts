import { ApplicationCommandOptionType, bold, EmbedBuilder, PermissionFlagsBits, PermissionsBitField, time } from "discord.js";
import { Command } from "#structures";

const keyPermissions = [
    PermissionFlagsBits.Administrator,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ViewAuditLog,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.MentionEveryone,
    PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageGuildExpressions,
    PermissionFlagsBits.ModerateMembers
];

export default new Command<"chatInput">({
    async run(interaction) {
        const role = interaction.options.getRole("role", true);
        const roleMembers = role.members.map(member => bold(member.user.tag)).join("\n");
        const includedPermissions = role.permissions.has(PermissionFlagsBits.Administrator)
            ? [PermissionFlagsBits.Administrator]
            : keyPermissions.filter(perm => role.permissions.has(perm, false));

        await interaction.reply({ embeds: [new EmbedBuilder()
            .setTitle(`Role Info: ${role.name}`)
            .addFields(
                { name: "🔹 ID", value: `\`${role.id}\``, inline: true },
                { name: "🔹 Color", value: `\`${role.hexColor}\``, inline: true },
                { name: "🔹 Created", value: time(role.createdAt, "R"), inline: true },
                { name: "🔹 Misc", value: [
                    `Hoist: \`${role.hoist}\``,
                    `Mentionable: \`${role.mentionable}\``,
                    `Position: \`${role.position}\` from bottom`,
                    `Members: \`${role.members.size}\`\n${role.members.size < 21 ? roleMembers : ""}`
                ].join("\n"), inline: true },
                { name: "🔹 Key Permissions", value: new PermissionsBitField(includedPermissions).toArray().join(", ") || "None", inline: true })
            .setColor(role.hexColor || "#ffffff")
            .setThumbnail(role.iconURL())
        ] });
    },
    data: {
        name: "roleinfo",
        description: "Get information about a role",
        options: [
            {
                type: ApplicationCommandOptionType.Role,
                name: "role",
                description: "The role to get information about",
                required: true
            }
        ]
    }
});
