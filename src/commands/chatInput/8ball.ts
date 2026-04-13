import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Command } from "#structures";

const answers = ["Without a doubt. Nah, I'm just messing with you", "My sources say no", "Yes, definitely. Unless...", "As if", "Dumb question, Ask another", "Forget about it", "In your dreams", "Not a chance", "Obviously", "Oh please", "Sure", "That's ridiculous", "Well maybe", "What do you think?", "Who cares?", "Yeah right", "You wish", "You've got to be kidding...", "Yes", "It is certain", "It is decidedly so", "Without a doubt", "Yes definitely", "You may rely on it", "As I see it, yes", "Most likely", "Outlook good", "Signs point to yes", "Reply hazy try again", "Ask again later", "Better not tell you now", "Cannot predict now", "Concentrate and ask again", "Don't count on it", "My reply is no", "Outlook not so good", "Very doubtful", "My dad said I cant answer that, try again later", "*yawn*", "Provided that you say \"Thank you\"", "Your actions will improve things", "Only do it once", "Of course", "Count to 10; ask again", "Let it go", "Don't forget to have fun", "It cannot fail", "You are sure to have support", "Now you can", "Act asthough it is already real", "It will be a pleasure", "Speak up about it", "Better to wait", "Follow the advice of experts", "Setting priorities will be a necessary part of the process", "The answer is in your backyard", "Try a more unlikely solution", "You will not be disappointed", "it's a good time to make plans", "It'll cost you", "It would be inadvisable", "Accept a change to your routine", "Reprioritize what is important", "Don't hesitate", "Remain flexible", "Keep it to yourself", "You'll need more information", "This is a good time to make a new plan", "Pay attention to the details", "Give it all you've got", "You must act now", "Tell someone what it means to you", "Don't get caught up in your emotions", "Proceed at a more relaxed pace", "Watch and see what happens", "Doubt it", "Do it early", "Be delightfully sure of it", "Absolutely not", "Don't bet on it", "It's time for you to go", "It will create a stir", "Adopt an adventurous attitude", "Listen more carefully; then you will know", "A year from now it won't matter", "Don't overdo it", "Take a chance", "Approach cautiously", "Unfavourable at this time", "It will affect how others see you", "It will bring good luck", "It will remain unpredictable", "Investigate and then enjoy it"];

export default new Command<"chatInput">({
    async run(interaction) {
        const question = interaction.options.getString("question", true);

        if (question.length < 5) return await interaction.reply("Ask a real question, numb nut.");

        const randomAnswer = Math.floor(Math.random() * answers.length);

        await interaction.reply({ embeds: [new EmbedBuilder()
            .setColor(interaction.client.config.EMBED_COLOR)
            .setTitle("8Ball")
            .setDescription(`> ${question}\n\n**${answers[randomAnswer]}**`)
        ] });
    },
    data: {
        name: "8ball",
        description: "Test your chances with 8ball",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "question",
                description: "Your close-ended question",
                required: true
            }
        ]
    }
});
