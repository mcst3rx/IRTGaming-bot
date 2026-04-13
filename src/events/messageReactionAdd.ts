import { Events } from "discord.js";
import { Event } from "#structures";
import { fsServers, log, tempReply } from "#util";

const privateServers = fsServers.getPrivateAll();

export default new Event({
    name: Events.MessageReactionAdd,
    async run(reaction, user) {
        if (
            (
                reaction.message.channelId === user.client.config.mainServer.channels.communityIdeas &&
                reaction.message.embeds[0]?.author?.name?.includes(user.id)
            )
            || (
                reaction.message.author?.id === user.id &&
                privateServers.some(x => x[1].modSuggestions === reaction.message.channelId)
            )
        ) {
            await reaction.users.remove(user.id);
            await tempReply(reaction.message, { content: `You cannot vote on your own suggestion, ${user}!`, timeout: 10_000 });

            log("magenta", `Blocked self-vote from ${user.tag} in ${reaction.message.channelId}`);
        }
    }
});