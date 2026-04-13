import { ApplicationCommandOptionType, EmbedBuilder, inlineCode, type GuildMember } from "discord.js";
import { db, fmNamesTable, tfNamesTable } from "#db";
import { Command } from "#structures";
import { FM_ICON, TF_ICON, getEmbedColor } from "#util";

function sortMembers(a: GuildMember, b: GuildMember) {
    if (a.displayName.toLowerCase() < b.displayName.toLowerCase()) return -1;
    if (a.displayName.toLowerCase() > b.displayName.toLowerCase()) return 1;
    return 0;
}

export default new Command<"chatInput">({
    async run(interaction) {
        const embed = new EmbedBuilder();

        switch (interaction.options.getSubcommand()) {
            case "mp": {
                const staff = {
                    mp_manager: interaction.client.getRole("mpManager"),
                    mp_sr_admin: interaction.client.getRole("mpSrAdmin"),
                    mp_jr_admin: interaction.client.getRole("mpJrAdmin"),
                    mp_farm_manager: interaction.client.getRole("mpFarmManager"),
                    mp_trusted_farmer: interaction.client.getRole("trustedFarmer")
                };

                embed
                    .setTitle("__MP Staff Members__")
                    .setColor(getEmbedColor(interaction.client))
                    .setDescription([
                        staff.mp_manager.toString(),
                        staff.mp_manager.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None",
                        "",
                        staff.mp_sr_admin.toString(),
                        staff.mp_sr_admin.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None",
                        "",
                        staff.mp_jr_admin.toString(),
                        staff.mp_jr_admin.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None",
                        "",
                        staff.mp_farm_manager.toString(),
                        staff.mp_farm_manager.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None",
                        "",
                        staff.mp_trusted_farmer.toString(),
                        staff.mp_trusted_farmer.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None"
                    ].join("\n"));

                break;
            };
            case "fs": {
                const fmNames = (await db.select().from(fmNamesTable)).map(x => x.name).join("`\n`");
                const tfNames = (await db.select().from(tfNamesTable)).map(x => x.name).join("`\n`");

                embed
                    .setTitle("__MP Staff Usernames__")
                    .setColor(getEmbedColor(interaction.client))
                    .addFields(
                        { name: `Farm Managers ${FM_ICON}`, value: inlineCode(fmNames) },
                        { name: `Trusted Farmers ${TF_ICON}`, value: inlineCode(tfNames) }
                    );

                break;
            };
            case "discord": {
                const staff = {
                    admins: interaction.client.getRole("discordAdmin"),
                    moderators: interaction.client.getRole("discordModerator"),
                    helpers: interaction.client.getRole("discordHelper")
                };

                embed
                    .setTitle("__Discord Staff Members__")
                    .setColor(getEmbedColor(interaction.client))
                    .setDescription([
                        staff.admins.toString(),
                        staff.admins.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None",
                        "",
                        staff.moderators.toString(),
                        staff.moderators.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None",
                        "",
                        staff.helpers.toString(),
                        staff.helpers.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None"
                    ].join("\n"));

                break;
            };
            case "mc": {
                const staff = interaction.client.getRole("irtmcStaff");

                embed
                    .setTitle("__IRTMC Staff Members__")
                    .setColor(getEmbedColor(interaction.client))
                    .setDescription(`${staff.toString()}\n${staff.members.sort(sortMembers).map(x => x.toString()).join("\n") || "None"}`);

                break;
            }
        };

        await interaction.reply({ embeds: [embed] });
    },
    data: {
        name: "staff",
        description: "Staff member information",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "mp",
                description: "Shows all MP Staff members within Discord"
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "fs",
                description: "Shows all MP Staff usernames within FS"
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "discord",
                description: "Shows all Discord Staff members"
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "mc",
                description: "Shows all MC Staff members"
            },
        ]
    }
});
