import { ApplicationCommandOptionType, codeBlock, MessageFlags } from "discord.js";
import { Command } from "#structures";

const stages = [
    [
        "      ",
        "      ",
        "      ",
        "      ",
        "╭────╮",
        "╯    ╰"
    ],
    [
        "      ",
        "      ",
        "  ┃   ",
        "  ┃   ",
        "╭─┸──╮",
        "╯    ╰"
    ],
    [
        "  ┏   ",
        "  ┃   ",
        "  ┃   ",
        "  ┃   ",
        "╭─┸──╮",
        "╯    ╰"
    ],
    [
        "  ┏   ",
        "  ┃   ",
        "  ┃   ",
        " ┌┨   ",
        "╭┴┸──╮",
        "╯    ╰"
    ],
    [
        "  ┏━┓ ",
        "  ┃   ",
        "  ┃   ",
        " ┌┨   ",
        "╭┴┸──╮",
        "╯    ╰"
    ],
    [
        "  ┏━┓ ",
        "  ┃ ⎔ ",
        "  ┃   ",
        " ┌┨   ",
        "╭┴┸──╮",
        "╯    ╰"
    ],
    [
        "  ┏━┓ ",
        "  ┃ ⎔ ",
        "  ┃╶╂╴",
        " ┌┨ ^ ",
        "╭┴┸──╮",
        "╯    ╰"
    ],
];

export default new Command<"chatInput">({
    async run(interaction) {
        await interaction.reply({ content: "Game started!", flags: MessageFlags.Ephemeral });

        let hiddenLetters = true;
        let fouls = 0;
        let latestActivity = Date.now();
        const guesses: string[] = [];
        const guessedWordsIndices: number[] = [];
        const phrase = interaction.options.getString("phrase", true).toLowerCase();
        const wordOrPhrase = phrase.includes(" ") ? "phrase" : "word";
        const botMsg = await interaction.followUp(
            `A hangman game has been started by *${interaction.user.tag}*!\n` +
            `Anyone can guess letters${phrase.includes(" ") ? ", a word, or the full phrase": " or the full word"} by doing \`guess [letter${phrase.includes(" ") ? ", word, or phrase" : " or word"}]\`\n` +
            `The ${wordOrPhrase} is:\n${codeBlock(hidePhrase())}`,
        );
        const guessCollector = interaction.channel!.createMessageCollector({ filter: msg => !msg.author.bot && msg.content.toLowerCase().startsWith("guess") });

        await interaction.deleteReply();

        function hidePhrase() {
            hiddenLetters = false;

            return phrase.split("").map((x, i) => {
                if (guesses.includes(x) || guessedWordsIndices.includes(i)) return x;
                else if (x === " ") return " ";
                else {
                    hiddenLetters = true;
                    return "_";
                }
            }).join(" ");
        }

        async function checkFouls(isWord: boolean) {
            let loseText = "";

            if (fouls === 7) {
                loseText = `\nThe poor fella got hung. You lost the game. The ${wordOrPhrase} was:\n${codeBlock(phrase)}`;
                guessCollector.stop();
                clearInterval(interval);
            }

            await botMsg.reply(
                `The ${wordOrPhrase} doesn't include that ${isWord ? "piece of text" : "letter"}.\n` +
                "An incorrect guess leads to the addition of things to the drawing. It now looks like this:\n" +
                codeBlock(stages[fouls - 1].join("\n")) + loseText);
        }

        guessCollector.on("collect", async guessMessage => {
            const guess = guessMessage.content.slice(6).toLowerCase();

            if (!guess || !guess.length) return guessMessage.reply("You're using the `guess` command wrong. Get good.");

            if (guess.length > 1) {
                latestActivity = Date.now();

                if (!phrase.includes(guess)) {
                    fouls++;
                    await checkFouls(true);
                    return;
                }

                const guessedTextStartIndex = phrase.indexOf(guess);
                const guessedTextCharIndices = Array.from(Array(guess.length).keys());

                guessedWordsIndices.push(...guessedTextCharIndices.map(x => x + guessedTextStartIndex));
            } else {
                latestActivity = Date.now();

                if (guesses.includes(guess)) return await interaction.channel!.send("That letter has been guessed already.");

                guesses.push(guess);

                if (!phrase.includes(guess)) {
                    fouls++;
                    await checkFouls(false);
                }
            }

            const hideWordResult = hidePhrase();
            let text = `A part of the ${wordOrPhrase} has been revealed, this is what it looks like now:\n${codeBlock(hideWordResult)}`;

            if (!hiddenLetters) {
                text = `The whole ${wordOrPhrase} has been revealed! The hangman game ends with the ${wordOrPhrase} being:\n${codeBlock(phrase)}`;
                guessCollector.stop();
                clearInterval(interval);
            }

            await botMsg.reply(text);
        });

        const interval = setInterval(async () => {
            if (Date.now() <= (latestActivity + 120_000)) return;

            await botMsg.reply("The hangman game has ended due to inactivity.");
            guessCollector.stop();
            clearInterval(interval);
        }, 5_000);
    },
    data: {
        name: "hangman",
        description: "Start a game of hangman",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "phrase",
                description: "The word or phrase for others to guess",
                required: true
            }
        ]
    }
});
