import type { GuildMember } from "discord.js";

/**
 * @param guildMember The member to check
 * @returns Whether the GuildMember is an MP Staff member or not
 */
export function isMPStaff(guildMember: GuildMember | null) {
    if (!guildMember) return false;

    const mpStaffRoles = Array.isArray(guildMember.client.config.mainServer.mpStaffRoles)
        ? guildMember.client.config.mainServer.mpStaffRoles
        : [];

    return mpStaffRoles
        .map(x => guildMember.client.config.mainServer.roles[x])
        .filter((x): x is string => typeof x === "string" && Boolean(x))
        .some(x => guildMember.roles.cache.has(x));
}
