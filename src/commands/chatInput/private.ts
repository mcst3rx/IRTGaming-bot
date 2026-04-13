import {
    ApplicationCommandOptionType,
    type CategoryChannel,
    EmbedBuilder,
    OverwriteType,
    type TextChannel,
    PermissionFlagsBits,
    roleMention,
    MessageFlags
} from "discord.js";
import { Routes } from "farming-simulator-types/2025";
import { Command } from "#structures";
import { collectAck, formatRequestInit, fsServers, onPrivateFarms, youNeedRole } from "#util";

const modLinkRegex = new RegExp(/https:\/\/(www\.)?farming-simulator\.com\/mod\.php\?mod_id=(?<code>\d+)/);

export default new Command<"chatInput">({
    async autocomplete(interaction) {
        const serverAcro = interaction.options.getSubcommandGroup(true);
        const serverObj = fsServers.getPrivateOne(serverAcro);
        const farmsData = Object.entries(serverObj.farms);
        const farmRoles = farmsData.map(x => interaction.client.mainGuild().roles.cache.get(x[1].roleId)!);

        switch (interaction.options.getSubcommand()) {
            case "member": {
                const displayedRoles = interaction.member.roles.cache.hasAny(...serverObj.managerRoles)
                    ? farmRoles
                    : interaction.member.roles.cache.has(serverObj.farmOwnerRole)
                        ? farmRoles.filter(x => onPrivateFarms(interaction.member, serverAcro).some(y => x.id === y))
                        : [];

                await interaction.respond(displayedRoles.map(({ name, id }) => ({ name, value: id })));

                break;
            };
            case "rename-role": {
                await interaction.respond(
                    interaction.member.roles.cache.hasAny(...serverObj.managerRoles)
                        ? farmRoles.map(x => ({ name: x.name, value: x.id }))
                        : []
                );

                break;
            };
            case "archive": {
                if (!interaction.member.roles.cache.hasAny(...serverObj.managerRoles)) return interaction.respond([]);

                const farmChannels = farmsData.map(([farmId, farm]) => {
                    const channel = interaction.guild.channels.resolve(farm.channelId) as TextChannel;
                    const isActive = channel.parentId === serverObj.category;

                    return {
                        name: `(${isActive ? "Active" : "Archived"}) ${channel.name}`,
                        value: `${farmId}-${farm.channelId}`
                    };
                });

                await interaction.respond(farmChannels.sort((a, b) => {
                    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
                    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;

                    return 0;
                }));

                break;
            };
        }
    },
    async run(interaction) {
        const serverAcro = interaction.options.getSubcommandGroup();

        if (!serverAcro) return interaction.reply({ content: "Incomplete command", flags: MessageFlags.Ephemeral });

        const serverObj = fsServers.getPrivateOne(serverAcro);

        switch (interaction.options.getSubcommand()) {
            case "member": {
                if (
                    !interaction.member.roles.cache.hasAny(...serverObj.managerRoles)
                    && !interaction.member.roles.cache.has(serverObj.farmOwnerRole)
                ) return youNeedRole(interaction, "mpManager");

                const member = interaction.options.getMember("member");
                const roleId = interaction.options.getString("role", true);
                const validFarmIds = Object.values(serverObj.farms).map(x => x.roleId);

                if (!validFarmIds.includes(roleId)) {
                    return interaction.reply(`You need to select a valid ${serverAcro.toUpperCase()} Farm role from the list provided!`);
                }

                if (!member) return interaction.reply({ content: "You need to select a member that's in this server", flags: MessageFlags.Ephemeral });

                if (!member.roles.cache.has(roleId)) {
                    await member.roles.add([roleId, serverObj.memberRole]);

                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription(`${member} (${member.user.tag}) has been given the <@&${serverObj.memberRole}> and <@&${roleId}> roles`)
                            .setColor(interaction.client.config.EMBED_COLOR)
                        ]
                    });
                }

                await collectAck({
                    interaction,
                    payload: { embeds: [new EmbedBuilder()
                        .setDescription(`This member already has the <@&${roleId}> role, do you want to remove it from them?`)
                        .setColor(interaction.client.config.EMBED_COLOR)
                    ] },
                    async confirm(int) {
                        const rolesToRemove = onPrivateFarms(member, serverAcro).length === 1
                            ? [roleId, serverObj.memberRole]
                            : [roleId];
                        const displayedRoles = rolesToRemove.map(roleMention).join(" and ");

                        await member.roles.remove(rolesToRemove);

                        await int.update({
                            embeds: [new EmbedBuilder()
                                .setDescription(`${member} (${member.user.tag}) has been removed from the ${displayedRoles} role(s).`)
                                .setColor(interaction.client.config.EMBED_COLOR)
                            ],
                            components: []
                        });
                    },
                    async cancel(int) {
                        await int.update({
                            embeds: [new EmbedBuilder().setDescription("Command canceled").setColor(interaction.client.config.EMBED_COLOR)],
                            components: []
                        });
                    },
                    async rejection() {
                        await interaction.editReply({
                            embeds: [new EmbedBuilder().setDescription("Command canceled").setColor(interaction.client.config.EMBED_COLOR)],
                            components: []
                        });
                    }
                });

                break;
            };
            case "owner": {
                if (!interaction.member.roles.cache.hasAny(...serverObj.managerRoles)) return youNeedRole(interaction, "mpManager");

                const member = interaction.options.getMember("member");

                if (!member) return interaction.reply({ content: "You need to select a member that's in this server!", flags: MessageFlags.Ephemeral });

                if (!member.roles.cache.has(serverObj.farmOwnerRole)) {
                    await member.roles.add(serverObj.farmOwnerRole);

                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setDescription(`${member} (${member.user.tag}) has been given the <@&${serverObj.farmOwnerRole}> role`)
                            .setColor(interaction.client.config.EMBED_COLOR)
                        ]
                    });
                }

                await collectAck({
                    interaction,
                    payload: {
                        embeds: [new EmbedBuilder()
                            .setDescription(`This member already has the <@&${serverObj.farmOwnerRole}> role, do you want to remove it from them?`)
                            .setColor(interaction.client.config.EMBED_COLOR)
                        ],
                    },
                    async confirm(int) {
                        await member.roles.remove(serverObj.farmOwnerRole);

                        await int.update({
                            embeds: [new EmbedBuilder()
                                .setDescription(`${member} (${member.user.tag}) has been removed from the <@&${serverObj.farmOwnerRole}> role`)
                                .setColor(interaction.client.config.EMBED_COLOR)
                            ],
                            components: []
                        });
                    },
                    async cancel(int) {
                        await int.update({
                            embeds: [new EmbedBuilder().setDescription("Command canceled").setColor(interaction.client.config.EMBED_COLOR)],
                            components: []
                        });
                    },
                    async rejection() {
                        await interaction.editReply({
                            embeds: [new EmbedBuilder().setDescription("Command canceled").setColor(interaction.client.config.EMBED_COLOR)],
                            components: []
                        });
                    },
                });

                break;
            };
            case "install-mod": {
                if (!interaction.member.roles.cache.hasAny(...serverObj.managerRoles)) return youNeedRole(interaction, "mpManager");

                if (interaction.client.fsCache[serverAcro].state === 1) return interaction.reply({
                    content: "Cannot install mod while server is online!",
                    flags: MessageFlags.Ephemeral
                });

                const modLink = interaction.options.getString("link", true);
                const regexResult = modLinkRegex.exec(modLink);
                const foundModId = regexResult?.groups?.code;

                if (!regexResult || !foundModId) return interaction.reply({
                    content: "Invalid link provided! Must be ModHub link from <https://farming-simulator.com/mods.php>",
                    flags: MessageFlags.Ephemeral
                });

                await interaction.deferReply();

                const res = await fetch(
                    serverObj.url + Routes.startModDownload(serverObj.username, serverObj.password, foundModId),
                    formatRequestInit(10_000, `ModInstall-${foundModId}`)
                ).catch(() => null);

                if (res?.status === 200) {
                    await interaction.editReply("Successfully started installing mod");
                } else {
                    await interaction.editReply("Failed to start installing mod");
                }

                break;
            }
            case "rename-role": {
                if (!interaction.member.roles.cache.hasAny(...serverObj.managerRoles)) return youNeedRole(interaction, "mpManager");

                const roleId = interaction.options.getString("role", true);
                const isValidRole = Object.values(serverObj.farms).map(x => x.roleId).includes(roleId);

                if (!isValidRole) {
                    return interaction.reply(`You need to select a valid ${serverAcro.toUpperCase()} Farm role from the list provided!`);
                }

                const role = interaction.client.mainGuild().roles.cache.get(roleId)!;
                const name = interaction.options.getString("name", false);
                const roleNamePrefix = role.name.split(" ").slice(0, 3).join(" ");

                await role.setName(name ? `${roleNamePrefix} (${name})` : roleNamePrefix);

                await interaction.reply(`${roleNamePrefix} role name set to \`${role.name}\``);

                break;
            };
            case "archive": {
                if (!interaction.member.roles.cache.hasAny(...serverObj.managerRoles)) return youNeedRole(interaction, "mpManager");

                const [farmId, channelId] = interaction.options.getString("channel", true).split("-");
                const channel = interaction.client.channels.cache.get(channelId) as TextChannel | undefined;
                const farm = serverObj.farms[farmId];

                if (!channel || !farm || farm.channelId !== channel.id) {
                    return interaction.reply("You need to select a channel from the list provided!");
                }

                const { archived } = interaction.client.config.mainServer.categories;
                const channelisActive = channel.parentId === serverObj.category;

                if (channelisActive) { // Channel currently active, change to archived
                    await channel.edit({
                        parent: archived,
                        permissionOverwrites: [
                            ...(interaction.guild.channels.resolve(archived) as CategoryChannel).permissionOverwrites.cache.values(),
                            {
                                id: interaction.client.config.mainServer.roles.mpManager,
                                allow: PermissionFlagsBits.ViewChannel,
                                type: OverwriteType.Role
                            }
                        ]
                    });

                    await interaction.reply(`${channel} successfully set to archived`);
                } else { // Channel currently archived, change to active
                    await channel.edit({
                        parent: serverObj.category,
                        permissionOverwrites: [
                            {
                                id: interaction.client.config.mainServer.id,
                                deny: PermissionFlagsBits.ViewChannel,
                                type: OverwriteType.Role
                            },
                            {
                                id: serverObj.farmOwnerRole,
                                allow: [PermissionFlagsBits.MentionEveryone, PermissionFlagsBits.ManageMessages],
                                type: OverwriteType.Role
                            },
                            {
                                id: farm.roleId,
                                allow: PermissionFlagsBits.ViewChannel,
                                type: OverwriteType.Role
                            },
                            ...serverObj.managerRoles.map(roleId => ({
                                id: roleId,
                                allow: [
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ManageMessages,
                                    PermissionFlagsBits.ManageRoles,
                                    PermissionFlagsBits.MentionEveryone,
                                    PermissionFlagsBits.ViewChannel,
                                ],
                                type: OverwriteType.Role
                            }))
                        ]
                    });

                    await interaction.reply(`${channel} successfully set to active`);
                }

                break;
            };
            case "apply": {
                if (!interaction.member.roles.cache.hasAny(...serverObj.managerRoles)) return youNeedRole(interaction, "mpManager");

                await interaction.reply(serverObj.form);

                break;
            };
        }
    },
    data: {
        name: "private",
        description: "Private server management",
        options: fsServers.getPrivateAll().map(([serverAcro, server]) => ({
            type: ApplicationCommandOptionType.SubcommandGroup,
            name: serverAcro,
            description: `${server.fullName} management`,
            options: [
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "member",
                    description: `Manage ${serverAcro.toUpperCase()} farm members`,
                    options: [
                        {
                            type: ApplicationCommandOptionType.User,
                            name: "member",
                            description: "The member to add or remove a role from",
                            required: true
                        },
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "role",
                            description: "The role to add or remove",
                            autocomplete: true,
                            required: true
                        }
                    ]
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "owner",
                    description: `Manage ${serverAcro.toUpperCase()} farm owners`,
                    options: [
                        {
                            type: ApplicationCommandOptionType.User,
                            name: "member",
                            description: `The member to add or remove the ${serverAcro.toUpperCase()} Farm Owner role from`,
                            required: true
                        }
                    ]
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "install-mod",
                    description: "Install a ModHub mod onto the server",
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "link",
                            description: "The ModHub mod link",
                            required: true
                        }
                    ]
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "rename-role",
                    description: `Rename a given ${serverAcro.toUpperCase()} Farm role`,
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "role",
                            description: "The role to rename",
                            autocomplete: true,
                            required: true
                        },
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "name",
                            description: "The new name for the role",
                            required: false
                        }
                    ]
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "archive",
                    description: `Manage archivement of ${serverAcro.toUpperCase()} Farm channels`,
                    options: [
                        {
                            type: ApplicationCommandOptionType.String,
                            name: "channel",
                            description: `The ${serverAcro.toUpperCase()} Farm channel to manage archivement of`,
                            autocomplete: true,
                            required: true
                        }
                    ]
                },
                {
                    type: ApplicationCommandOptionType.Subcommand,
                    name: "apply",
                    description: `Send the Google Form to apply to be an ${serverAcro.toUpperCase()} Farm Owner`
                }
            ]
        }))
    }
});