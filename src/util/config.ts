import type { Client, ColorResolvable } from "discord.js";
import type { Config } from "#typings";

const DEFAULT_EMBED_COLOR = "#5865F2";
const DEFAULT_EMBED_COLOR_GREEN = "#57F287";
const DEFAULT_EMBED_COLOR_RED = "#ED4245";
const DEFAULT_EMBED_COLOR_YELLOW = "#FEE75C";

export class ConfigError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}

export function isConfigError(error: unknown): error is ConfigError {
    return error instanceof ConfigError || (error instanceof Error && error.name === "ConfigError");
}

export function getConfigErrorMessage(error: unknown) {
    return isConfigError(error)
        ? `Configuration error: ${error.message}`
        : null;
}

export function normalizeConfig(rawConfig: unknown): Config {
    const config = (rawConfig && typeof rawConfig === "object" ? rawConfig : {}) as Record<string, any>;

    config.devWhitelist = Array.isArray(config.devWhitelist) ? config.devWhitelist : [];
    config.fs = config.fs && typeof config.fs === "object" ? config.fs : {};
    config.resources = config.resources && typeof config.resources === "object" ? config.resources : {};
    config.whitelist = config.whitelist && typeof config.whitelist === "object" ? config.whitelist : {};
    config.whitelist.bannedWords = Array.isArray(config.whitelist.bannedWords) ? config.whitelist.bannedWords : [];
    config.whitelist.logs = Array.isArray(config.whitelist.logs) ? config.whitelist.logs : [];
    config.toggles = config.toggles && typeof config.toggles === "object" ? config.toggles : {};
    config.mainServer = config.mainServer && typeof config.mainServer === "object" ? config.mainServer : {};
    config.mainServer.mpStaffRoles = Array.isArray(config.mainServer.mpStaffRoles) ? config.mainServer.mpStaffRoles : [];
    config.mainServer.dcStaffRoles = Array.isArray(config.mainServer.dcStaffRoles) ? config.mainServer.dcStaffRoles : [];
    config.mainServer.roles = config.mainServer.roles && typeof config.mainServer.roles === "object" ? config.mainServer.roles : {};
    config.mainServer.channels = config.mainServer.channels && typeof config.mainServer.channels === "object" ? config.mainServer.channels : {};
    config.mainServer.categories = config.mainServer.categories && typeof config.mainServer.categories === "object" ? config.mainServer.categories : {};

    return config as Config;
}

export function getEmbedColor(
    client: Client,
    variant: "default" | "success" | "danger" | "warning" = "default"
): ColorResolvable {
    return {
        default: client.config.EMBED_COLOR || DEFAULT_EMBED_COLOR,
        success: client.config.EMBED_COLOR_GREEN || DEFAULT_EMBED_COLOR_GREEN,
        danger: client.config.EMBED_COLOR_RED || DEFAULT_EMBED_COLOR_RED,
        warning: client.config.EMBED_COLOR_YELLOW || DEFAULT_EMBED_COLOR_YELLOW
    }[variant];
}

export function getConfigRoleId(client: Client, roleName: string) {
    const roleId = client.config.mainServer.roles?.[roleName as keyof typeof client.config.mainServer.roles];

    return typeof roleId === "string" && roleId ? roleId : null;
}

export function requireConfigRoleId(client: Client, roleName: string, label = roleName) {
    const roleId = getConfigRoleId(client, roleName);

    if (!roleId) throw new ConfigError(`Missing config role: mainServer.roles.${label}`);

    return roleId;
}

export function getConfigChannelId(client: Client, channelName: string) {
    const channelId = client.config.mainServer.channels?.[channelName as keyof typeof client.config.mainServer.channels];

    return typeof channelId === "string" && channelId ? channelId : null;
}

export function requireConfigChannelId(client: Client, channelName: string, label = channelName) {
    const channelId = getConfigChannelId(client, channelName);

    if (!channelId) throw new ConfigError(`Missing config channel: mainServer.channels.${label}`);

    return channelId;
}

export function getConfigCategoryId(client: Client, categoryName: string) {
    const categoryId = client.config.mainServer.categories?.[categoryName as keyof typeof client.config.mainServer.categories];

    return typeof categoryId === "string" && categoryId ? categoryId : null;
}

export function requireConfigCategoryId(client: Client, categoryName: string, label = categoryName) {
    const categoryId = getConfigCategoryId(client, categoryName);

    if (!categoryId) throw new ConfigError(`Missing config category: mainServer.categories.${label}`);

    return categoryId;
}

export function getConfigResource(client: Client, resourceName: string) {
    const resource = client.config.resources?.[resourceName as keyof typeof client.config.resources];

    return typeof resource === "string" && resource ? resource : null;
}

export function requireConfigResource(client: Client, resourceName: string, label = resourceName) {
    const resource = getConfigResource(client, resourceName);

    if (!resource) throw new ConfigError(`Missing config resource: resources.${label}`);

    return resource;
}
