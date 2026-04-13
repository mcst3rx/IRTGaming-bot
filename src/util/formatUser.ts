import type { User } from "discord.js";

/**
 * @returns A string with the given user"s tag, global name if present, and codeblocked ID
 */
export function formatUser(user: User) {
    return user.globalName
        ? [
            user.toString(),
            user.globalName,
            `\`${user.id}\``
        ].join("\n")
        : [
            user.toString(),
            `\`${user.id}\``
        ].join("\n");
}