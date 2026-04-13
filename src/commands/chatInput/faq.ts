import {
    ActionRowBuilder,
    ApplicationCommandOptionType,
    ButtonBuilder,
    ButtonStyle,
    channelMention,
    EmbedBuilder,
    hyperlink,
    roleMention
} from "discord.js";
import { Command } from "#structures";
import {
    fsServers,
    getEmbedColor,
    requireConfigCategoryId,
    requireConfigChannelId,
    requireConfigResource,
    requireConfigRoleId
} from "#util";

const channelMentions = fsServers.getPublicAll().map(x => channelMention(x[1].channelId));
const toDoDetails = fsServers.getPublicAll().map(([_, x]) => ({ name: x.fullName, value: "- " + x.todo.join("\n- ") }));

export default new Command<"chatInput">({
    async run(interaction) {
        const content = interaction.options.getUser("user", false)?.toString() || "";

        switch (interaction.options.getString("question", true)) {
            case "staff": {
                const staffButtonRedirect = requireConfigResource(interaction.client, "faqStaffButtonRedirect");

                await interaction.reply({ content, components: [
                    new ActionRowBuilder<ButtonBuilder>().setComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setURL(staffButtonRedirect)
                            .setLabel("Apply for MP Staff")
                    )
                ] });

                break;
            };
            case "troll": {
                const activeTickets = requireConfigCategoryId(interaction.client, "activeTickets");
                const mpStaffRoleId = requireConfigRoleId(interaction.client, "mpStaff");
                const mpRulesAndInfo = requireConfigChannelId(interaction.client, "mpRulesAndInfo");
                const trollEmbedImage = requireConfigResource(interaction.client, "faqTrollEmbedImage");
                const isFromTicket = interaction.channel!.parentId === activeTickets;
                const staffMention = roleMention(mpStaffRoleId);
                const ticketTextOpening = isFromTicket ? "let us know" : `don't hesitate to send a report to ${channelMentions.join(" or ")}`;
                const ticketTextClosing = isFromTicket ? "" : `, use the ${staffMention} tag as mentioned above`;

                await interaction.reply({ content, embeds: [new EmbedBuilder()
                    .setTitle("Reporting trolls")
                    .setColor(getEmbedColor(interaction.client))
                    .setImage(trollEmbedImage)
                    .setDescription(
                        `If a player is causing problems on a server, ${ticketTextOpening} with:\n\n` +
                        "- The name of the player\n" +
                        "- What they are doing\n" +
                        "- A picture or video as proof if possible\n" +
                        (isFromTicket ? "\n" : `- The ${staffMention} tag to notify staff\n\n`) +
                        `Please do not ping or DM individual staff members${ticketTextClosing}.\n` +
                        `Check ${channelMention(mpRulesAndInfo)} to see what a good reason could be for a player report.`
                    )
                ] });

                break;
            };
            case "appeal": {
                const supportChannelId = requireConfigChannelId(interaction.client, "support");
                const appealSupportMsg = requireConfigResource(interaction.client, "faqAppealSupportMsg");
                const channel = channelMention(supportChannelId);
                const supportHyperlink = hyperlink("MP Support", appealSupportMsg);

                await interaction.reply(
                    `${content} \n` +
                    "If you would like to appeal your ban on our MP servers, " +
                    `head to ${channel} and open an ${supportHyperlink} ticket to privately discuss it with MP Staff.`
                );

                break;
            };
            case "todo": {
                await interaction.reply({ content, embeds: [new EmbedBuilder()
                    .setTitle("To-do")
                    .setColor(getEmbedColor(interaction.client))
                    .setFooter({ text:
                        "Note that not every task listed might be available to do at the time, " +
                        "so do your due dilligence to see what may need doing in the moment."
                    })
                    .setFields(toDoDetails)
                ] });

                break;
            };
            case "filters": {
                await interaction.reply(requireConfigResource(interaction.client, "faqFiltersEmbedImage"));

                break;
            };
            case "passwords": {
                await interaction.reply(
                    "MP Staff may sometimes need to lock our public servers for any number of reasons." +
                    "\nIf this is ever the case, we may use a password that Discord members can access," +
                    ` found in the pinned messages of ${channelMentions.join(" or ")}.` +
                    "\n-# For mobile users, tap the channel name at the top of your screen" +
                    "\nIf that password doesn't work, the server may be locked to a separate password that only MP Staff have access to."
                );

                break;
            }
            case "equipment": {
                await interaction.reply(
                    content +
                    "\nPurchasing new equipment while beneficial can also come with inverse consequences, including:" +
                    "\n- Increased slot amounts" +
                    "\n- More vehicles needing to be handled by the game, degrading gameplay performance" +
                    "\n- Unnecessary clutter around the map and yard" +
                    "\nTherefore, we try to keep equipment purchases to a minimum where possible."
                );

                break;
            };
        }
    },
    data: {
        name: "faq",
        description: "Frequently asked questions",
        options: [
            {
                type: ApplicationCommandOptionType.String,
                name: "question",
                description: "A list of answers to frequently asked questions",
                choices: [
                    { name: "Applying for MP Staff", value: "staff" },
                    { name: "Reporting trolls", value: "troll" },
                    { name: "Appeal an MP ban", value: "appeal" },
                    { name: "What to do on MP servers", value: "todo" },
                    { name: "MP filters to join", value: "filters" },
                    { name: "Server passwords", value: "passwords" },
                    { name: "Buying equipment", value: "equipment" }
                ],
                required: true
            },
            {
                type: ApplicationCommandOptionType.User,
                name: "user",
                description: "The optional user to notify of with this FAQ answer",
                required: false
            }
        ]
    }
});
