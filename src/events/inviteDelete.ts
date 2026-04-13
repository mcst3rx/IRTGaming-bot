import { Events } from "discord.js";
import { Event } from "#structures";

export default new Event({
    name: Events.InviteDelete,
    async run(invite) {
        invite.client.inviteCache.delete(invite.code);
    }
});