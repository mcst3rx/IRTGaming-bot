import { ApplicationCommandOptionType, EmbedBuilder, MessageFlags, type Message, type User } from "discord.js";
import { Command } from "#structures";
import { formatString } from "#util";

const possibleMoves = ["rock", "paper", "scissors"] as const;
const rpsInstances = new Map<string, RPSInstance>();

type Move = (typeof possibleMoves)[number];

class RPSInstance {
    public constructor(public readonly user: User, public readonly move: Move, public readonly message: Message<true>) {
        setTimeout(async () => {
            if (!rpsInstances.has(this.message.channelId)) return;

            await this.message.edit({ embeds: [], content: `This ${possibleMoves.join(" ")} game has ended due to inactivity.` });
            rpsInstances.delete(this.message.channelId);
        }, 60_000);
    }
}

export default new Command<"chatInput">({
    async run(interaction) {
        const move = interaction.options.getString("move", true) as Move;
        const firstMove = rpsInstances.get(interaction.channelId);

        if (!firstMove) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }).then(() => interaction.deleteReply());

            const message = await interaction.channel!.send({ embeds: [new EmbedBuilder()
                .setTitle("Rock paper scissors game started!")
                .setColor(interaction.client.config.EMBED_COLOR)
                .setDescription(`To play against ${interaction.user}, use the ${interaction.client.getCommandMention("rps")} command with your move`)
                .setFooter({ text: "Game will time out in 60 seconds" })
            ] });

            rpsInstances.set(interaction.channelId, new RPSInstance(interaction.user, move, message));

            return;
        }

        if (interaction.user.id === firstMove.user.id) return await interaction.reply("You can't play against yourself");

        await interaction.deferReply();

        let winner = null;

        if (move === "rock") if (firstMove.move === "paper") winner = firstMove.user; else winner = interaction.user;
        if (move === "scissors") if (firstMove.move === "rock") winner = firstMove.user; else winner = interaction.user;
        if (move === "paper") if (firstMove.move === "scissors") winner = firstMove.user; else winner = interaction.user;
        if (move === firstMove.move) winner = null;

        await firstMove.message.edit({ embeds: [new EmbedBuilder()
            .setTitle([
                `${winner?.tag ?? "Nobody"} won this rock paper scissors game!`,
                "",
                `**${firstMove.user.tag}** chose ${firstMove.move}`,
                `**${interaction.user.tag}** chose ${move}`
            ].join("\n"))
            .setColor(interaction.client.config.EMBED_COLOR)
        ] });

        rpsInstances.delete(interaction.channelId);
        await interaction.deleteReply();
    },
    data: {
        name: "rps",
        description: "Play a game of rock paper scissors",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "move",
                description: "The move you want to play",
                choices: possibleMoves.map(x => ({ name: formatString(x), value: x })),
                required: true
            }
        ]
    }
});
