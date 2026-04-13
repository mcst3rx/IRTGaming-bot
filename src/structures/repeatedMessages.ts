import type { Message, MessageCollector } from "discord.js";
import type TClient from "../client.js";
import { hasProfanity, isMPStaff, log, tempReply } from "#util";
import { addPunishment } from "#db";

const inviteRegEx = new RegExp(/(https?:\/\/)?(www\.)?((discordapp\.com\/invite)|(discord\.gg))\/(?<code>\w+)/m);

enum RepeatedMessagesType {
    Advertisement,
    BannedWords,
    Spam,
}

interface IncrementOptions {
    thresholdTime: number;
    thresholdAmt: number;
    type: RepeatedMessagesType;
    muteTime: string;
    muteReason: string;
}

interface RepeatedMessagesData {
    entries: {
        type: RepeatedMessagesType;
        channel: string;
        msgId: string;
        timestamp: number;
    }[];
    timeout: NodeJS.Timeout;
}

export class RepeatedMessages {
    private readonly data = new Map<string, RepeatedMessagesData>();
    private staffPingCollector?: MessageCollector;

    public constructor(private readonly client: TClient) {}

    private async increment(message: Message<true>, options: IncrementOptions) {
        const userData = this.data.get(message.author.id);

        // Create user data if none already exists
        if (!userData) {
            this.data.set(message.author.id, {
                entries: [{
                    type: options.type,
                    channel: message.channelId,
                    msgId: message.id,
                    timestamp: message.createdTimestamp,
                }],
                timeout: setTimeout(() => this.data.delete(message.author.id), options.thresholdTime),
            });

            return;
        }

        // Add this message to the list
        userData.entries.push({
            type: options.type,
            channel: message.channelId,
            msgId: message.id,
            timestamp: message.createdTimestamp,
        });

        // Reset timeout
        clearTimeout(userData.timeout);
        userData.timeout = setTimeout(() => this.data.delete(message.author.id), options.thresholdTime);

        // Message must've been sent after (now - threshold), so purge those that were sent earlier
        userData.entries = userData.entries.filter(entry => entry.timestamp >= Date.now() - options.thresholdTime);

        // A spammed message is one that has been sent within the threshold parameters
        const spammedMessage = userData.entries.find(x => {
            return userData.entries.filter(y => x.type === y.type).length >= options.thresholdAmt;
        });

        if (!spammedMessage) return;

        this.data.delete(message.author.id);

        await addPunishment(this.client, "mute", this.client.user.id, `Automod; ${options.muteReason}`, message.author.id, options.muteTime)
            .catch(err => log("red", `Failed to add punishment: ${err}`));

        const spamMsgIds = userData.entries.filter(x => x.type === RepeatedMessagesType.Spam).map(x => x.msgId);

        if (spamMsgIds.length) await message.channel.bulkDelete(spamMsgIds);
    }

    public async triageMessage(message: Message<true>) {
        let automodded = false;

        // Misuse of staff ping
        if (message.mentions.roles.has(this.client.config.mainServer.roles.mpStaff)) {
            log("magenta", `${message.author.tag} mentioned staff role`);

            if (this.staffPingCollector && !this.staffPingCollector.ended) this.staffPingCollector.stop();

            this.staffPingCollector = message.channel.createMessageCollector({
                filter: x => isMPStaff(x.member) && x.content === "y",
                max: 1,
                time: 60_000
            }).on("collect", async collected => {
                log("magenta", `Received "y" from ${collected.author.tag}, indicating to mute`);

                try {
                    await addPunishment(this.client, "mute", collected.author.id, "Automod; Misuse of staff ping", message.author.id, "12h");
                    await collected.react("✅");
                } catch (err) {
                    log("red", `Failed to add punishment: ${err}`);

                    await collected.react("❗");
                }
            });
        }

        const regexResult = inviteRegEx.exec(message.content);

        if (hasProfanity(message.content.toLowerCase())) {
            automodded = true;

            await tempReply(message, { timeout: 10_000, content: "That word is banned here" });
            await message.delete();

            await this.increment(message, {
                thresholdTime: 60_000,
                thresholdAmt: 4,
                type: RepeatedMessagesType.BannedWords,
                muteTime: "12h",
                muteReason: "Banned words",
            });
        } else if (regexResult && !isMPStaff(message.member)) {
            const validInvite = regexResult?.groups?.code
                ? await this.client.fetchInvite(regexResult.groups.code).catch(() => null)
                : null;

            if (validInvite && validInvite.guild?.id !== this.client.config.mainServer.id) {
                automodded = true;

                await tempReply(message, { timeout: 10_000, content: "No advertising other Discord servers" });
                await message.delete();

                await this.increment(message, {
                    thresholdTime: 120_000,
                    thresholdAmt: 2,
                    type: RepeatedMessagesType.Advertisement,
                    muteTime: "6h",
                    muteReason: "Discord advertisement",
                });
            }
        } else if (message.channelId !== this.client.config.mainServer.channels.spamZone && !isMPStaff(message.member)) {
            await this.increment(message, {
                thresholdTime: 5_000,
                thresholdAmt: 5,
                type: RepeatedMessagesType.Spam,
                muteTime: "24h",
                muteReason: "Spam",
            });
        }

        return automodded;
    }
}
