import { ApplicationCommandOptionType, EmbedBuilder, userMention } from "discord.js";
import canvas from "@napi-rs/canvas";
import { algorithm, dailyMsgsTable, db, userLevelsTable } from "#db";
import { Command } from "#structures";

export default new Command<"chatInput">({
    async run(interaction) {
        const userLevelsData = await db.select().from(userLevelsTable);

        if (interaction.options.getSubcommand() === "view") {
            // fetch user or user interaction sender
            const member = interaction.options.getMember("member") ?? interaction.member;

            // information about users progress on level roles
            const userData = userLevelsData.find(x => x.userId === member.id);

            const pronounBool = (you: string, they: string) => { // takes 2 words and chooses which to use based on if user did this command on themself
                if (interaction.user.id === member.user.id) return you || true;
                else return they || false;
            };

            if (!userData) return await interaction.reply(`${pronounBool("You", "They")} currently don't have a level, send some messages to level up.`);

            const index = userLevelsData.sort((a, b) => b.messageCount - a.messageCount).map(x => x.userId).indexOf(member.id) + 1;
            const memberDifference = userData.messageCount - algorithm(userData.level);
            const levelDifference = algorithm(userData.level + 1) - algorithm(userData.level);
            const img = canvas.createCanvas(1000, 250);
            const ctx = img.getContext("2d");

            // Border radius
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(1000, 250);
            ctx.arcTo(0, 250, 0, 0, 30);
            ctx.arcTo(0, 0, 1000, 0, 30);
            ctx.arcTo(1000, 0, 1000, 250, 30);
            ctx.arcTo(1000, 250, 0, 250, 30);
            ctx.clip();

            // Background
            ctx.fillStyle = "#36393f";
            ctx.fillRect(0, 0, img.width, img.height);
            ctx.restore();

            // Avatar
            ctx.beginPath();
            ctx.arc(105, 125, 75, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.save();
            ctx.clip();
            ctx.drawImage(await canvas.loadImage(member.displayAvatarURL({ extension: "png" })), 30, 50, 150, 150);
            ctx.restore();

            // Progress bar back
            ctx.save();
            ctx.beginPath();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = interaction.client.config.EMBED_COLOR;
            ctx.arc(img.width - 47.5, 182.5, 17.5, Math.PI * 1.5, Math.PI * 0.5);
            ctx.arc(227.5, 182.5, 17.5, Math.PI * 0.5, Math.PI * 1.5);
            ctx.fill();
            ctx.clip();
            ctx.closePath();

            // Progress bar front
            const currentPercentXP = Math.floor((memberDifference / levelDifference) * 100);

            if (currentPercentXP >= 1) {
                ctx.beginPath();
                const onePercentBar = (img.width - 30 - 210) / 100;
                const pxBar = onePercentBar * currentPercentXP;

                ctx.globalAlpha = 1;
                ctx.fillStyle = interaction.client.config.EMBED_COLOR;
                ctx.arc(192.5 + pxBar, 182.5, 17.5, Math.PI * 1.5, Math.PI * 0.5);
                ctx.arc(227.5, 182.5, 17.5, Math.PI * 0.5, Math.PI * 1.5);
                ctx.fill();
                ctx.closePath();
            }

            ctx.restore();

            let offsetLvlXP = img.width - 30;
            const smallFont = "600 35px Nunito";
            const largeFont = "600 50px Nunito";
            const progressYOffset = 150;
            const detailsYOffset = 70;

            // Progress details
            ctx.save();
            ctx.font = smallFont;
            ctx.textAlign = "right";
            ctx.fillStyle = "#7F8384";
            ctx.fillText(`${levelDifference.toLocaleString("en-US")} messages`, offsetLvlXP, progressYOffset);
            offsetLvlXP -= ctx.measureText(`${levelDifference.toLocaleString("en-US")} messages`).width + 3;
            ctx.fillText("/", offsetLvlXP, progressYOffset);
            ctx.fillStyle = interaction.client.config.EMBED_COLOR;
            offsetLvlXP -= ctx.measureText("/").width + 3;
            ctx.fillText(memberDifference.toLocaleString("en-US"), offsetLvlXP, progressYOffset);
            offsetLvlXP -= ctx.measureText(memberDifference.toLocaleString("en-US")).width;
            ctx.restore();

            // Display name
            ctx.font = largeFont;
            ctx.fillStyle = interaction.client.config.EMBED_COLOR;
            ctx.fillText(member.user.displayName, 210, progressYOffset, offsetLvlXP - 210 - 15);

            // Header details
            ctx.save();
            let offsetRankX = img.width - 30;
            ctx.textAlign = "right";

            // Rank value
            ctx.font = largeFont;
            ctx.fillText("#" + index.toString(), offsetRankX, detailsYOffset);
            offsetRankX -= ctx.measureText("#" + index.toString()).width;

            // Rank label
            ctx.font = smallFont;
            ctx.fillText(" RANK ", offsetRankX, detailsYOffset);
            offsetRankX -= ctx.measureText(" RANK ").width;

            // Level value
            ctx.font = largeFont;
            ctx.fillText(userData.level.toString(), offsetRankX, detailsYOffset);
            offsetRankX -= ctx.measureText(userData.level.toString()).width;

            // Level label
            ctx.font = smallFont;
            ctx.fillText(" LEVEL ", offsetRankX, detailsYOffset);
            offsetRankX -= ctx.measureText(" LEVEL ").width;

            // Total value
            ctx.fillStyle = "#7F8384";
            ctx.font = largeFont;
            ctx.fillText(userData.messageCount.toLocaleString("en-US"), offsetRankX, detailsYOffset);
            offsetRankX -= ctx.measureText(userData.messageCount.toLocaleString("en-US")).width;

            // Total label
            ctx.font = smallFont;
            ctx.fillText("TOTAL ", offsetRankX, detailsYOffset);
            ctx.restore();

            await interaction.reply({ files: [{
                attachment: img.toBuffer("image/png"),
                name: "rank.png"
            }] });

            return;
        }

        const data = (await db.select().from(dailyMsgsTable))
            .map((x, i, a) => {
                const yesterday = a[i - 1] || [];

                return x.count - (yesterday.count || x.count);
            })
            .slice(1)
            .slice(-60);

        // handle negative days
        for (const [i, change] of data.entries()) if (change < 0) data[i] = data[i - 1] || data[i + 1] || 0;

        const maxValue = Math.max(...data);
        const maxValueArr = maxValue.toString().split("");
        const firstGraphTop = Math.ceil(maxValue * 10 ** (-maxValueArr.length + 1)) * 10 ** (maxValueArr.length - 1);
        const secondGraphTop = Math.ceil(maxValue * 10 ** (-maxValueArr.length + 2)) * 10 ** (maxValueArr.length - 2);
        const textSize = 40;
        const img = canvas.createCanvas(1500, 750);
        const ctx = img.getContext("2d");
        const graphOrigin = [15, 65];
        const graphSize = [1275, 630];
        const nodeWidth = graphSize[0] / (data.length - 1);

        ctx.fillStyle = "#36393f";
        ctx.fillRect(0, 0, img.width, img.height);

        // grey horizontal lines
        ctx.lineWidth = 5;

        const intervalCandidates: [number, number, number][] = [];
        for (let i = 4; i < 10; i++) {
            const interval = firstGraphTop / i;

            if (Number.isInteger(interval)) {
                const intervalString = interval.toString();
                const referenceNumber =
                    i *
                    Math.max(intervalString.split("").filter((x) => x === "0").length / intervalString.length, 0.3) *
                    (["1", "2", "4", "5", "6", "8"].includes(intervalString[0]) ? 1.5 : 0.67);

                intervalCandidates.push([interval, i, referenceNumber]);
            }
        }
        const chosenInterval = intervalCandidates.sort((a, b) => b[2] - a[2])[0];
        let previousY: number[] = [];

        ctx.strokeStyle = "#202225";

        for (let i = 0; i <= chosenInterval[1]; i++) {
            const y = graphOrigin[1] + graphSize[1] - i * (chosenInterval[0] / secondGraphTop) * graphSize[1];

            if (y < graphOrigin[1]) continue;

            const even = (i + 1) % 2 === 0;

            if (even) ctx.strokeStyle = "#2c2f33";

            ctx.beginPath();
            ctx.lineTo(graphOrigin[0], y);
            ctx.lineTo(graphOrigin[0] + graphSize[0], y);
            ctx.stroke();
            ctx.closePath();

            if (even) ctx.strokeStyle = "#202225";

            previousY = [y, i * chosenInterval[0]];
        }

        // 30d mark
        const lastMonthStart = graphOrigin[0] + nodeWidth * (data.length - 30);

        ctx.setLineDash([8, 16]);
        ctx.beginPath();
        ctx.lineTo(lastMonthStart, graphOrigin[1]);
        ctx.lineTo(lastMonthStart, graphOrigin[1] + graphSize[1]);
        ctx.stroke();
        ctx.closePath();
        ctx.setLineDash([]);

        // draw points
        ctx.strokeStyle = interaction.client.config.EMBED_COLOR;
        ctx.fillStyle = interaction.client.config.EMBED_COLOR;
        ctx.lineWidth = 5;

        let lastCoords: number[] = [];

        for (const [i, val] of data.entries()) {
            let value = val;

            ctx.beginPath();

            if (lastCoords) ctx.moveTo(lastCoords[0], lastCoords[1]);
            if (value < 0) value = 0;

            const x = i * nodeWidth + graphOrigin[0];
            const y = (1 - value / secondGraphTop) * graphSize[1] + graphOrigin[1];

            ctx.lineTo(x, y);

            lastCoords = [x, y];

            ctx.stroke();
            ctx.closePath();

            // ball
            ctx.beginPath();
            ctx.arc(x, y, ctx.lineWidth * 1.3, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        }

        // draw text
        ctx.font = "400 " + textSize + "DejaVu Sans";
        ctx.fillStyle = "white";

        // highest value
        const maxx = graphOrigin[0] + graphSize[0] + textSize;
        const maxy = previousY[0] + textSize / 3;

        ctx.fillText(previousY[1].toLocaleString("en-US"), maxx, maxy);

        // lowest value
        const lowx = graphOrigin[0] + graphSize[0] + textSize;
        const lowy = graphOrigin[1] + graphSize[1] + textSize / 3;

        ctx.fillText("0 msgs", lowx, lowy);

        // 30d
        ctx.fillText("30d ago", lastMonthStart, graphOrigin[1] - textSize / 3);

        // time ->
        const tx = graphOrigin[0] + textSize / 2;
        const ty = graphOrigin[1] + graphSize[1] + textSize;

        ctx.fillText("time ->", tx, ty);

        const topUsers = userLevelsData
            .sort((a, b) => b.messageCount - a.messageCount)
            .filter((x) => !x.hasLeft)
            .slice(0, 10)
            .map((x, i) => `\`${i + 1}.\` ${userMention(x.userId)}: ${x.messageCount.toLocaleString("en-US")}`)
            .join("\n");

        await interaction.reply({
            files: [{
                attachment: img.toBuffer("image/png"),
                name: "dailyMsgs.png"
            }],
            embeds: [new EmbedBuilder()
                .setTitle("Top users by messages sent")
                .setDescription(topUsers)
                .setImage("attachment://dailyMsgs.png")
                .setColor(interaction.client.config.EMBED_COLOR)
            ]
        });
    },
    data: {
        name: "rank",
        description: "Ranking system",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "view",
                description: "View a member's ranking information",
                options: [
                    {
                        type: ApplicationCommandOptionType.User,
                        name: "member",
                        description: "The member whose rank to view",
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "leaderboard",
                description: "View the top 10 users in the ranking system"
            }
        ]
    }
});
