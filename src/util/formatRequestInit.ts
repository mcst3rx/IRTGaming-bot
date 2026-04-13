import config from "#config" with { type: "json" };

/**
 * Create a request init object for making fetches with
 * @param timeout The timeout before the request expires
 * @param identifier The identifier in the user agent for what feature is doing this request
 */
export function formatRequestInit<
    TIdentifier extends string,
    THeaders extends Record<string, string>
>(timeout: number, identifier: TIdentifier, headers: THeaders = {} as THeaders) {
    const configData = config as Record<string, unknown>;
    const userAgentHeader = typeof configData.USER_AGENT_HEADER === "string" && configData.USER_AGENT_HEADER
        ? configData.USER_AGENT_HEADER
        : "IRTGamingBot";

    return {
        signal: AbortSignal.timeout(timeout),
        headers: { "User-Agent": `${userAgentHeader}/${identifier}` as const, ...headers }
    };
}
