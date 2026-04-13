import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { bannedWordsTable, db } from "#db";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const word = interaction.options.getString("word", true);
        const bannedWordsData = await db.select().from(bannedWordsTable);

        if (bannedWordsData.some(x => x.word === word)) return interaction.reply("That word is already added");

        await db.insert(bannedWordsTable).values({ word });

        await interaction.reply("Successfully added to bannedWords list");
    },
    data: {
        name: "addbannedword",
        description: "Add a word to the bannedWords list",
        default_member_permissions: PermissionFlagsBits.ModerateMembers.toString(),
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "word",
                description: "The word to add",
                required: true
            }
        ]
    }
});
