import type { Message, MessageCreateOptions, PartialMessage } from "discord.js";

/**
 * Send a temporary message reply that deletes after a set timeout in milliseconds. Pings the user in the reply
 * @param message The message to temporarily reply to
 * @param options Options for sending the reply
 */
export async function tempReply(message: Message | PartialMessage, options: MessageCreateOptions & { timeout: number; }) {
    const msg = await message.reply({ ...options, allowedMentions: { repliedUser: true } });

    setTimeout(msg.delete.bind(msg), options.timeout);
}