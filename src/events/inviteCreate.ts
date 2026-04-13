import { Events } from "discord.js";
import { Event } from "#structures";

export default new Event({
    name: Events.InviteCreate,
    async run(invite) {
        invite.client.inviteCache.set(invite.code, { uses: invite.uses ?? 0, creator: invite.inviter?.id ?? "UNKNOWN" });
    }
});