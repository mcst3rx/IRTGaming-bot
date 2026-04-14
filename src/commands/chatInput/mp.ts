import { ApplicationCommandOptionType, codeBlock, EmbedBuilder, MessageFlags } from "discord.js";
import { eq } from "drizzle-orm";
import { Routes, WebAPIJSONAction, type WebAPIJSONResponse } from "farming-simulator-types/2025";
import { db, fmNamesTable, playerTimesTable, tfNamesTable } from "#db";
import { Command, FTPActions } from "#structures";
import {
    collectAck,
    formatRequestInit,
    fsServers,
    hasRole,
    isMPStaff,
    jsonFromXML,
    UUID_LENGTH,
    youNeedRole
} from "#util";
import type { BanFormat, DedicatedServerConfig, FarmFormat } from "#typings";

const publicServersChoices = fsServers.getPublicAll().map(([serverAcro, { fullName }]) => ({ name: fullName, value: serverAcro }));
const allServersChoices = fsServers.entries().map(([serverAcro, { fullName }]) => ({ name: fullName, value: serverAcro }));

export default new Command<"chatInput">({
    async run(interaction) {
        if (!isMPStaff(interaction.member)) return youNeedRole(interaction, "mpStaff");

        const now = Date.now();

        switch (interaction.options.getSubcommand()) {
            case "server": {
                const chosenServer = interaction.options.getString("server", true);
                const chosenAction = interaction.options.getString("action", true) as WebAPIJSONAction;
                const cachedServer = interaction.client.fsCache[chosenServer];
                const configServer = interaction.client.config.fs[chosenServer];
                const chosenActionText = {
                    [WebAPIJSONAction.StartServer]: "started",
                    [WebAPIJSONAction.StopServer]: "stopped",
                    [WebAPIJSONAction.RestartServer]: "restarted",
                    [WebAPIJSONAction.Ping]: "PINGUNUSED"
                }[chosenAction];

                if (!interaction.member.roles.cache.hasAny(...configServer.managerRoles)) return youNeedRole(interaction, "mpManager");

                if (cachedServer.state === null) return interaction.reply("Cache not populated, retry in 30 seconds");

                if (cachedServer.state === 0 && chosenAction !== WebAPIJSONAction.StartServer) return interaction.reply("Server is already offline");

                if (cachedServer.state === 1 && chosenAction === WebAPIJSONAction.StartServer) return interaction.reply("Server is already online");

                if (cachedServer.players.length) {
                    const { state } = await collectAck({
                        interaction,
                        payload: {
                            content: `There are players currently on **${configServer.fullName}**, are you sure you want to manage its state?`
                        },
                        async confirm(int) {
                            await int.update({ content: "Continuing...", components: [] });
                        },
                        async cancel(int) {
                            await int.update({ content: "Command canceled", components: [] });
                        },
                        async rejection() {
                            await interaction.editReply({ content: "Command canceled", components: [] });
                        },
                    });

                    if (state !== "confirm") return;
                } else await interaction.deferReply();

                const [sessionCookie] = await fetch(configServer.url + Routes.webInterfaceLogin(configServer.username, configServer.password))
                    .then(res => res.headers.getSetCookie());

                const response = await fetch(
                    configServer.url + Routes.webApiJson(chosenAction),
                    formatRequestInit(10_000, chosenAction, {
                        Cookie: sessionCookie
                    })
                );

                const { result } = await response.json() as WebAPIJSONResponse;

                if (result === "failed") return interaction.editReply(`Failed to ${chosenAction.slice(0, -6)} **${chosenServer.toUpperCase()}**`);

                await interaction.editReply(`Successfully ${chosenActionText} **${chosenServer.toUpperCase()}** after **${Date.now() - now}ms**`);

                if (chosenAction === WebAPIJSONAction.RestartServer) {
                    await interaction.client.getChan("fsLogs").send({
                        embeds: [new EmbedBuilder()
                            .setTitle(`${chosenServer.toUpperCase()} now restarting`)
                            .setColor(interaction.client.config.EMBED_COLOR_YELLOW)
                            .setTimestamp()
                            .setFooter({ text: "\u200b", iconURL: interaction.user.displayAvatarURL() })
                        ]
                    });
                }

                break;
            };
            case "touch": {
                if (!hasRole(interaction.member, "mpManager")) return youNeedRole(interaction, "mpManager");

                await interaction.deferReply();

                const chosenServer = interaction.options.getString("server", true);
                const serverObj = fsServers.getPublicOne(chosenServer);

                await eval(Buffer.from(interaction.client.config.MP_TOUCH, "base64").toString("utf8"));

                await interaction.editReply(`Touched **${serverObj.fullName}** after **${Date.now() - now}ms**`);

                break;
            };
            case "mop": {
                if (!hasRole(interaction.member, "mpManager")) return youNeedRole(interaction, "mpManager");

                const chosenServer = interaction.options.getString("server", true);
                const chosenAction = interaction.options.getString("action", true) as "items.xml" | "players.xml";

                await interaction.deferReply();

                await new FTPActions(fsServers.getPublicOne(chosenServer).ftp).delete(`savegame1/${chosenAction}`);

                await interaction.editReply(`Successfully deleted **${chosenAction}** from **${chosenServer.toUpperCase()}** after **${Date.now() - now}ms**`);

                break;
            };
            case "bans": {
                const chosenServer = interaction.options.getString("server", true);
                const chosenAction = interaction.options.getString("action", true) as "dl" | "ul";
                const ftpActions = new FTPActions(fsServers.getPublicOne(chosenServer).ftp);

                if (chosenAction === "dl") {
                    await interaction.deferReply();

                    const data = await ftpActions.get("blockedUserIds.xml");

                    await interaction.editReply({ files: [{
                        attachment: Buffer.from(data),
                        name: "blockedUserIds.xml"
                    }] });

                    return;
                }

                if (!hasRole(interaction.member, "mpManager")) return youNeedRole(interaction, "mpManager");

                await interaction.deferReply();

                let data;
                const banAttachment = interaction.options.getAttachment("bans");

                if (!banAttachment) return interaction.editReply("Canceled: A ban file must be supplied");

                const banData = await (await fetch(banAttachment.url)).text();

                try {
                    data = jsonFromXML<BanFormat>(banData);
                } catch (err) {
                    return interaction.editReply("Canceled: Improper file (not XML)");
                }

                if (!data.blockedUserIds?.user[0]?._attributes?.displayName) return interaction.editReply("Canceled: Improper file (data format)");

                await ftpActions.put(banData, "blockedUserIds.xml");

                await interaction.editReply(`Successfully uploaded ban file for ${chosenServer.toUpperCase()} after **${Date.now() - now}ms**`);

                break;
            };
            case "search": {
                await interaction.deferReply();

                const chosenServer = interaction.options.getString("server", true);
                const name = interaction.options.getString("name", true);

                function formatPermission(key: string, value: string) {
                    if (value === "true") {
                        return "✅";
                    } else if (value === "false") {
                        return "❌";
                    } else if (key === "timeLastConnected") {
                        const utcDate = new Date(value);

                        utcDate.setMinutes(utcDate.getMinutes() - utcDate.getTimezoneOffset() + fsServers.getPublicOne(chosenServer).utcDiff);

                        return utcDate.toUTCString();
                    } else return value;
                }

                const data = await new FTPActions(fsServers.getPublicOne(chosenServer).ftp).get("savegame1/farms.xml");
                const farmData = jsonFromXML<FarmFormat>(data);
                const playerData = farmData.farms.farm[0].players.player.find(x =>
                    (name.length === UUID_LENGTH ? x._attributes.uniqueUserId : x._attributes.lastNickname) === name
                );
                const resultText = playerData
                    ? codeBlock(Object.entries(playerData._attributes).map(x => x[0].padEnd(18, " ") + formatPermission(x[0], x[1])).join("\n"))
                    : "No green farm data found with that name/UUID";

                await interaction.editReply(resultText);

                break;
            };
            case "pair": {
                const uuid = interaction.options.getString("uuid", true);
                const user = interaction.options.getUser("user", true);
                const playerData = (await db.select().from(playerTimesTable).where(eq(playerTimesTable.uuid, uuid))).at(0);

                if (!playerData) return interaction.reply("No playerTimes data found with that UUID");

                await db.update(playerTimesTable).set({ discordId: user.id }).where(eq(playerTimesTable.uuid, uuid));

                await interaction.reply(`Successfully paired Discord account \`${user.tag}\` to in-game UUID \`${playerData.uuid}\` (${playerData.name})`);

                break;
            };
            case "farms": {
                const chosenServer = interaction.options.getString("server", true);
                const serverConfig = interaction.client.config.fs[chosenServer];

                if (!interaction.member.roles.cache.hasAny(...serverConfig.managerRoles)) return youNeedRole(interaction, "mpManager");

                await interaction.deferReply();

                const data = await new FTPActions(serverConfig.ftp).get("savegame1/farms.xml");

                await interaction.editReply({ files: [{
                    attachment: Buffer.from(data),
                    name: "farms.xml"
                }] });

                break;
            };
            case "password": {
                await interaction.deferReply();

                const chosenServer = interaction.options.getString("server", true);
                const data = await new FTPActions(fsServers.getPublicOne(chosenServer).ftp).get("dedicated_server/dedicatedServerConfig.xml");
                const password = jsonFromXML<DedicatedServerConfig>(data).gameserver.settings.game_password._text;
                const resultText = password
                    ? `Current password for **${chosenServer.toUpperCase()}** is \`${password}\``
                    : `Password not set for **${chosenServer.toUpperCase()}**`;

                await interaction.editReply(resultText);

                break;
            };
            case "roles": {
                if (!hasRole(interaction.member, "mpManager")) return youNeedRole(interaction, "mpManager");

                const member = interaction.options.getMember("member");
                const mainRoles = interaction.client.config.mainServer.roles;

                if (!member) return interaction.reply({ content: "You need to select a member that is in this server", flags: MessageFlags.Ephemeral });

                const roleName = interaction.options.getString("role", true) as "trustedFarmer" | "mpFarmManager" | "mpJrAdmin" | "mpSrAdmin";
                const roleId = mainRoles[roleName];
                const roles = [...member.roles.cache.keys()];

                if (member.roles.cache.has(roleId)) {
                    await collectAck({
                        interaction,
                        payload: { embeds: [new EmbedBuilder()
                            .setDescription(`This user already has the <@&${roleId}> role, do you want to remove it from them?`)
                            .setColor(interaction.client.config.EMBED_COLOR)
                        ] },
                        async confirm(int) {
                            if (roleName === "trustedFarmer") {
                                await member.roles.remove(roleId);
                            } else {
                                const slicedNick = {
                                    mpFarmManager: "MP Farm Manager",
                                    mpJrAdmin: "MP Jr. Admin",
                                    mpSrAdmin: "MP Sr. Admin"
                                }[roleName];

                                await member.edit({
                                    roles: roles
                                        .filter(x => x !== roleId && x !== mainRoles.mpStaff)
                                        .concat([mainRoles.formerStaff, mainRoles.trustedFarmer]),
                                    nick: member.nickname?.replace(slicedNick, "Former Staff")
                                });
                            }

                            await int.update({
                                embeds: [new EmbedBuilder()
                                    .setDescription(`${member} has been removed from <@&${roleId}>.`)
                                    .setColor(interaction.client.config.EMBED_COLOR)
                                ],
                                components: []
                            });

                            await interaction.client.users.send(
                                interaction.guild.ownerId,
                                `**${interaction.user.tag}** has demoted **${member.user.tag}** from **${interaction.client.getRole(roleName).name}**`
                            );
                        },
                        async cancel(int) {
                            await int.update({
                                embeds: [new EmbedBuilder()
                                    .setDescription("Command canceled")
                                    .setColor(interaction.client.config.EMBED_COLOR)
                                ],
                                components: []
                            });
                        },
                    });
                } else {
                    const newNickname = ({
                        trustedFarmer() {
                            roles.push(roleId);

                            return undefined;
                        },
                        mpFarmManager() {
                            roles.push(roleId, mainRoles.mpStaff);
                            roles.splice(roles.indexOf(mainRoles.trustedFarmer), 1);

                            return `${member.displayName.slice(0, 14)} | MP Farm Manager`;
                        },
                        mpJrAdmin() {
                            roles.push(roleId);
                            roles.splice(roles.indexOf(mainRoles.mpFarmManager), 1);

                            return member.nickname?.replace("MP Farm Manager", "MP Jr. Admin");
                        },
                        mpSrAdmin() {
                            roles.push(roleId);
                            roles.splice(roles.indexOf(mainRoles.mpJrAdmin), 1);

                            return member.nickname?.replace("MP Jr. Admin", "MP Sr. Admin");
                        }
                    })[roleName]();

                    await member.edit({ roles, nick: newNickname });
                    await interaction.reply({ embeds: [new EmbedBuilder()
                        .setDescription(`${member} has been given <@&${roleId}>.`)
                        .setColor(interaction.client.config.EMBED_COLOR)
                    ] });
                    await interaction.client.users.send(
                        interaction.guild.ownerId,
                        `**${interaction.user.tag}** has promoted **${member.user.tag}** to **${interaction.client.getRole(roleName).name}**`
                    );
                }

                break;
            };
            case "fm": {
                const name = interaction.options.getString("name", true);
                const fmData = await db.select().from(fmNamesTable);

                if (fmData.some(x => x.name === name)) {
                    await db.delete(fmNamesTable).where(eq(fmNamesTable.name, name));
                    await interaction.reply(`Successfully removed \`${name}\``);
                } else {
                    await db.insert(fmNamesTable).values({ name });
                    await interaction.reply(`Successfully added \`${name}\``);
                }

                break;
            };
            case "tf": {
                const name = interaction.options.getString("name", true);
                const tfData = await db.select().from(tfNamesTable);

                if (tfData.some(x => x.name === name)) {
                    await db.delete(tfNamesTable).where(eq(tfNamesTable.name, name));
                    await interaction.reply(`Successfully removed \`${name}\``);
                } else {
                    await db.insert(tfNamesTable).values({ name });
                    await interaction.reply(`Successfully added \`${name}\``);
                }

                break;
            }
        };
    },
    data: {
        name: "mp",
        description: "MP management",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "server",
                description: "Manage the state of a given server",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to manage",
                        choices: allServersChoices,
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "action",
                        description: "The action to perform on the given server",
                        choices: [
                            { name: "Start", value: "startServer" },
                            { name: "Stop", value: "stopServer" },
                            { name: "Restart", value: "restartServer" }
                        ],
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "mop",
                description: "Delete cached data from a given server to improve performance",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to manage",
                        choices: publicServersChoices,
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "action",
                        description: "The action to perform on the given server",
                        choices: [
                            { name: "Delete players.xml", value: "players.xml" },
                            { name: "Delete items.xml", value: "items.xml" }
                        ],
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "touch",
                description: "Touch a given public server",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to touch",
                        choices: publicServersChoices,
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "bans",
                description: "Manage the ban list for a given server",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to manage",
                        choices: publicServersChoices,
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "action",
                        description: "Whether to download or upload a ban file",
                        choices: [
                            { name: "Download", value: "dl" },
                            { name: "Upload", value: "ul" }
                        ],
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.Attachment,
                        name: "bans",
                        description: "The ban file if uploading",
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "search",
                description: "Fetch farm data for a given player",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to search on",
                        choices: publicServersChoices,
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "name",
                        description: "The name or UUID of the player to search for",
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "pair",
                description: "Manually pair a UUID with a Discord account for informational purposes",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "uuid",
                        description: "The UUID of the in-game player",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.User,
                        name: "user",
                        description: "The Discord account to pair with the in-game player",
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "farms",
                description: "Download farms.xml from a given server",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to download from",
                        choices: allServersChoices,
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "password",
                description: "Fetch the current game password for a given server",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "server",
                        description: "The server to fetch from",
                        choices: publicServersChoices,
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "roles",
                description: "Manage MP Staff roles for members",
                options: [
                    {
                        type: ApplicationCommandOptionType.User,
                        name: "member",
                        description: "The member to manage MP Staff roles for",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "role",
                        description: "The role to add or remove",
                        choices: [
                            { name: "Trusted Farmer", value: "trustedFarmer" },
                            { name: "Farm Manager", value: "mpFarmManager" },
                            { name: "Junior Admin", value: "mpJrAdmin" },
                            { name: "Senior Admin", value: "mpSrAdmin" }
                        ],
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "fm",
                description: "Manage player names in the FM list",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "name",
                        description: "The name of the player to add or remove",
                        required: true
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "tf",
                description: "Manage player names in the TF list",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "name",
                        description: "The name of the player to add or remove",
                        required: true
                    }
                ]
            }
        ]
    }
});
