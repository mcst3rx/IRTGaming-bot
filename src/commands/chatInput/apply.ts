import { MessageFlags, time } from "discord.js";
import { eq } from "drizzle-orm";
import { db, userLevelsTable } from "#db";
import { Command } from "#structures";
import { requireConfigResource } from "#util";

export default new Command<"chatInput">({
    async run(interaction) {
        const applicationLogs = interaction.client.getChan("mpApplicationLogs");
        const userData = (await db.select().from(userLevelsTable).where(eq(userLevelsTable.userId, interaction.user.id))).at(0);
        const eligibleTime = (Date.now() - interaction.member.joinedTimestamp!) > (1000 * 60 * 60 * 24 * 14);
        const eligibleMsgs = userData?.level ? userData.level > 3 : false;
        const deniedMsgs: string[] = [];

        if (!eligibleTime) deniedMsgs.push("be on the Discord server for at least two weeks");
        if (!eligibleMsgs) deniedMsgs.push("be more active on the Discord server");

        if (!deniedMsgs.length) {
            await interaction.reply({ content: requireConfigResource(interaction.client, "applyGoogleForm"), flags: MessageFlags.Ephemeral });
            await applicationLogs.send(`${interaction.user} (${interaction.user.tag}) opened an MP Staff application on ${time()}`);
        } else {
            await interaction.reply({ content: `You need to ${deniedMsgs.join(" and ")} before applying`, flags: MessageFlags.Ephemeral });
            await applicationLogs.send(`${interaction.user} (${interaction.user.tag}) tried to open an MP Staff application but was rejected (**${deniedMsgs.join("** and **")}**)`);
        }
    },
    data: {
        name: "apply",
        description: "Apply for MP Staff"
    }
});
