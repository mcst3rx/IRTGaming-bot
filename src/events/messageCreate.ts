import { Events } from "discord.js";
import { incrementUser } from "#db";
import { Event } from "#structures";
import { fsServers, isDCStaff, tempReply } from "#util";

const privateServers = fsServers.getPrivateAll();

export default new Event({
    name: Events.MessageCreate,
    async run(message) {
        if (
            (
                !message.client.config.toggles.commands
                && !message.client.config.devWhitelist.includes(message.author.id)
            )
            || message.system
            || message.author.bot
            || !message.inGuild()
        ) return;
        // Bot is set to ignore commands and non-dev sent a message, ignore the message

        let automodded = false;

        // RepeatedMessages
        const isWhitelisted = message.client.config.whitelist.bannedWords.some(x => [message.channelId, message.channel.parentId].includes(x));

        if (message.client.config.toggles.automod && !isDCStaff(message.member) && !isWhitelisted) {
            automodded = await message.client.repeatedMessages.triageMessage(message);
        }

        // Community idea message management
        if (
            message.channelId === message.client.config.mainServer.channels.communityIdeas
            && message.author.id !== message.client.user.id
            && !isDCStaff(message.member)
        ) {
            automodded = true;

            await tempReply(message, {
                timeout: 10_000,
                content: `You can only post community ideas in this channel using the ${message.client.getCommandMention("suggest")} command!`
            });
            await message.delete();
        }

        if (automodded) return;

        if (message.channelId !== message.client.config.mainServer.channels.spamZone) {
            await incrementUser(message.client, message.author.id);
        }

        if (!message.client.config.toggles.autoResponses) return;

        // Private server mod voting
        if (
            privateServers.some(x => x[1].modSuggestions === message.channelId)
            && message.content.includes("http")
        ) {
            await message.react("764965325342244915");
            await message.react("764965659423408148");
        }
    }
});