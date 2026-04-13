import type { GuildMember } from "discord.js";

/**
 * @param guildMember The member to check
 * @returns Whether the GuildMember is a Discord Staff member or not
 */
export function isDCStaff(guildMember: GuildMember | null) {
    if (!guildMember) return false;

    const dcStaffRoles = Array.isArray(guildMember.client.config.mainServer.dcStaffRoles)
        ? guildMember.client.config.mainServer.dcStaffRoles
        : [];

    return dcStaffRoles
        .map(x => guildMember.client.config.mainServer.roles[x])
        .filter((x): x is string => typeof x === "string" && Boolean(x))
        .some(x => guildMember.roles.cache.has(x));
}
