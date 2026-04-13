import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Command } from "#structures";
import { formatString } from "#util";

interface BaseQuantity {
    readonly name: string;
    readonly short: string[];
    readonly value: number;
}

interface StandardQuantity extends BaseQuantity {
    readonly tempMath?: undefined;
}

interface TemperatureQuantity extends BaseQuantity {
    readonly tempMath: {
        readonly toSelf: (absolute: number) => number;
        readonly toBase: (amount: number) => number;
    };
}

type Quantity = StandardQuantity | TemperatureQuantity;

const quantities: Record<string, Quantity[]> = {
    storage: [
        { name: "bit", value: 1, short: ["bit", "bits"] },
        { name: "kilobit", value: 1_000, short: ["Kbit", "kilobits"] },
        { name: "megabit", value: 1_000_000, short: ["Mbit", "megabits"] },
        { name: "gigabit", value: 1_000_000_000, short: ["Gbit", "gigabits"] },
        { name: "terabit", value: 1_000_000_000_000, short: ["Tbit", "terabits"] },
        { name: "byte", value: 8, short: ["byte", "bytes"] },
        { name: "kilobyte", value: 8_000, short: ["KB", "kilobytes"] },
        { name: "megabyte", value: 8_000_000, short: ["MB", "megabytes"] },
        { name: "gigabyte", value: 8_000_000_000, short: ["GB", "gigabytes"] },
        { name: "terabyte", value: 8_000_000_000_000, short: ["TB", "terabytes"] },
    ],
    space: [
        { name: "metre", value: 1, short: ["m", "meter"] },
        { name: "centimetre", value: 0.01, short: ["cm", "centimeter"] },
        { name: "millimetre", value: 0.001, short: ["mm", "millimeter"] },
        { name: "kilometre", value: 1_000, short: ["km", "kilometer"] },
        { name: "mile", value: 1_609.344, short: ["mi", "miles"] },
        { name: "yard", value: 0.9144, short: ["yd", "yards"] },
        { name: "foot", value: 0.3048, short: ["ft", "feet", "\""] },
        { name: "inch", value: 0.0254, short: ["in", "inches", "\""] },
        { name: "light-year", value: 9_460_528_400_000_000, short: ["ly", "lightyear"] },
        { name: "astronomical unit", value: 149_597_870_700, short: ["au"] }
    ],
    currency: await fetchCurrencies(),
    mass: [
        { name: "gram", value: 1, short: ["g"] },
        { name: "kilogram", value: 1000, short: ["kg", "kgs"] },
        { name: "pound", value: 453.59237, short: ["lbs", "b"] },
        { name: "ounce", value: 28.3495231, short: ["oz"] }
    ],
    volume: [
        { name: "metre cubed", value: 1, short: ["m^3", "m3", "meter cubed"] },
        { name: "centimetre cubed", value: 0.000001, short: ["cm^3", "cm3", "centimeter cubed"] },
        { name: "inch cubed", value: 0.000016387, short: ["in^3", "in3", "cubic inch"] },
        { name: "US fluid ounce", value: 0.0000295735296, short: ["fl oz", "floz"] },
        { name: "litre", value: 0.001, short: ["l", "liter"] },
        { name: "desilitre", value: 0.0001, short: ["dl", "desiliter"] },
        { name: "millilitre", value: 0.000001, short: ["ml", "milliliter"] },
        { name: "US gallon", value: 0.00378541, short: ["gal"] }
    ],
    temperature: [
        {
            name: "kelvin",
            short: ["K"],
            tempMath: {
                toSelf: (absolute) => absolute,
                toBase: (amount) => amount
            },
            value: 0
        },
        {
            name: "celsius",
            short: ["°C", "c"],
            tempMath: {
                toSelf: (absolute) => absolute - 273.15,
                toBase: (amount)  => amount + 273.15
            },
            value: 0
        },
        {
            name: "fahrenheit",
            short: ["°F", "fh", "f"],
            tempMath: {
                toSelf: (absolute) => ((9 / 5) * (absolute - 273.15)) + 32,
                toBase: (amount) => ((5 / 9) * (amount - 32)) + 273.15
            },
            value: 0
        }
    ],
    time: [
        { name: "millisecond", value: 0.001, short: ["ms"] },
        { name: "second", value: 1, short: ["sec", "seconds"] },
        { name: "minute", value: 60, short: ["min", "minutes"] },
        { name: "hour", value: 3_600, short: ["hr", "hours"] },
        { name: "day", value: 86_400, short: ["d", "days"] },
        { name: "week", value: 604_800, short: ["w", "weeks"] },
        { name: "month", value: 2_592_000, short: ["mo", "months"] },
        { name: "year", value: 31_556_952, short: ["y", "yr", "years"] },
    ],
    force: [
        { name: "newton", value: 1, short: ["N"] },
        { name: "kilonewton", value: 1_000, short: ["kN"] },
        { name: "dyne", value: 100_000, short: ["dyn"] },
        { name: "pound-force", value: 4.448222, short: ["lbf"] },
        { name: "poundal", value: 0.1382550, short: ["pdl"] },
        { name: "kip", value: 4448.22, short: ["kip"] },
        { name: "kilogram-force", value: 9.806650, short: ["kgf"] },
    ],
    energy: [
        { name: "joule", value: 1, short: ["J"] },
        { name: "kilowatt-hour", value: 3600000, short: ["kWh"] },
        { name: "calorie", value: 4.184, short: ["cal"] },
        { name: "electronvolt", value: 0.0000000000000000001602176634, short: ["eV"] },
        { name: "foot-pound force", value: 1.355818, short: ["ft⋅lbf", "ftlbf", "ftlb"] },
    ]
};

const quantityKeys = Object.keys(quantities);
const quantityValues = Object.values(quantities);

async function fetchCurrencies() {
    const currencyNames: Record<string, string> = await fetch("https://latest.currency-api.pages.dev/v1/currencies.json").then(x => x.json());
    const { eur: currencyValues }: { eur: Record<string, number> } = await fetch("https://latest.currency-api.pages.dev/v1/currencies/eur.json").then(x => x.json());

    return Object.entries(currencyValues)
        .filter(x => currencyNames[x[0]])
        .map(currency => ({ name: currencyNames[currency[0]], value: currency[1], short: [currency[0]] }));
}

function findUnit(unitNameQuery: string) {
    // Short search
    for (let i = 0; i < quantityValues.length; i++) {
        const unit = quantityValues[i].find(x => x.short.some(y => y.toLowerCase() === unitNameQuery.toLowerCase()));

        if (unit) return { quantity: quantityKeys[i], unit };
    }

    // Name identical search
    for(let i = 0; i < quantityValues.length; i++) {
        const unit = quantityValues[i].find(x => x.name.toLowerCase() === unitNameQuery.toLowerCase());

        if (unit) return { quantity: quantityKeys[i], unit };
    }

    // Name inclusive search
    for (let i = 0; i < quantityValues.length; i++) {
        const unit = quantityValues[i].find(x => x.name.toLowerCase().includes(unitNameQuery.toLowerCase()));

        if (unit) return { quantity: quantityKeys[i], unit };
    }
}

export default new Command<"chatInput">({
    async run(interaction) {
        if (interaction.options.getSubcommand() === "help") {
            const chosenQuantity = interaction.options.getString("quantity");
            const commandMention = interaction.client.getCommandMention("convert", "convert");

            if (chosenQuantity) {
                const units = quantities[chosenQuantity];

                if (chosenQuantity === "currency") return await interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`Convert help: ${chosenQuantity}`)
                    .setDescription(`
                        This quantity comprises ${units.length} units.
                        Please use external sources for currency lists/names due to the amount comprised here being too large to display.
                    `)
                    .setColor(interaction.client.config.EMBED_COLOR)
                ] });

                const formattedUnits = units
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(unit => `**${formatString(unit.name)}** (\`${unit.short.join("`, `")}\`)`)
                    .join("\n");

                return await interaction.reply({ embeds: [new EmbedBuilder()
                    .setTitle(`Convert help: ${chosenQuantity}`)
                    .setDescription(`This quantity comprises ${units.length} units, which are:\n\n${formattedUnits}`)
                    .setColor(interaction.client.config.EMBED_COLOR)
                ] });
            }

            return await interaction.reply({ embeds: [new EmbedBuilder()
                .setTitle("Convert help")
                .setColor(interaction.client.config.EMBED_COLOR)
                .setDescription(`
                    • To convert something, you need a starter to convert *from* and a target to convert *to*.
                    • Your starter should consist of an **amount** (number) and **unit** (name) combination, e.g. \`5lbs\` or \`3km\`.
                    • Your target should consist of only a **unit** (name) - no amount - since the purpose of converting is to find the target's amount.
                    • Because you cannot convert fruits into lengths, your starter and target unit must be of the same **quantity**, e.g. \`1meter\` to \`centimeter\` (a space conversion).
                `)
                .addFields(
                    {
                        name: "Supported Quantities",
                        value: `
                            ${quantityKeys.map(formatString).join(", ")}
                            \nTo learn more about a quantity and its units and unit symbols.
                            Use ${interaction.client.getCommandMention("convert", "help")} with a specified quantity option.
                        `
                    },
                    {
                        name: "Conversion Examples",
                        value: `
                            ${commandMention} \`5lbs\` & \`kg\`
                            ${commandMention} \`300kelvin\` & \`celsius\`
                            ${commandMention} \`57mm\` & \`ft\`
                        `
                    }
                )
            ] });
        }

        // Construct starter data
        const starterPortion = interaction.options.getString("starter", true);
        const stMtch = starterPortion.match(/[0-9,.-]*/gi)!;
        const unitSymbol = starterPortion.slice(stMtch[0].length).trim();
        const unit = findUnit(
            unitSymbol.endsWith("s") && unitSymbol.length > 3
                ? unitSymbol.slice(0, unitSymbol.length - 1)
                : unitSymbol
        );
        const starter = unit && { ...unit, amount: parseFloat(starterPortion) };

        if (!starter) return await interaction.reply("You must convert *something;* You didn't specify a (valid) starter unit");

        // Construct target data
        const targetPortion = interaction.options.getString("target", true);
        const target = findUnit(
            targetPortion.endsWith("s") && targetPortion.length > 3
                ? targetPortion.slice(0, targetPortion.length - 1)
                : targetPortion
        );

        if (!target) return await interaction.reply("You must convert *to* something; You didn't specify a (valid) target unit");

        if (starter.quantity !== target.quantity) return await interaction.reply(`
            The starting unit and target unit must be of the same quantity.
            The quantities you used were \`${starter.quantity}\` & \`${target.quantity}\`
        `);

        const isCurrencyConversion = starter.quantity === "currency";

        if (isCurrencyConversion) quantities.currency = await fetchCurrencies();

        const valuesToConvert = {
            starter: (isCurrencyConversion ? target : starter).unit.value,
            target: (isCurrencyConversion ? starter : target).unit.value
        };

        // Get absolute value: starter amount * starter unit value)
        const absolute = starter.unit.tempMath
            ? starter.unit.tempMath.toBase(starter.amount)
            : starter.amount * valuesToConvert.starter;

        // Multiply absolute by the value of the target unit
        const amountInTarget = target.unit.tempMath
            ? target.unit.tempMath.toSelf(absolute)
            : absolute / valuesToConvert.target;

        // Display amount and target unit symbol
        await interaction.reply({ embeds: [new EmbedBuilder()
            .setTitle(`${formatString(starter.quantity)} conversion`)
            .setColor(interaction.client.config.EMBED_COLOR)
            .addFields(
                {
                    name: "Starting amount",
                    value: `${starter.amount.toLocaleString("en-US")} ${starter.unit.short[0]}`,
                    inline: true
                },
                {
                    name: "Converted amount",
                    value: `${amountInTarget.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${target.unit.short[0]}`,
                    inline: true
                }
            )
        ] });
    },
    data: {
        name: "convert",
        description: "Quantity conversion",
        options: [
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "help",
                description: "Show how to use the command",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "quantity",
                        description: "The quantity to get info on",
                        choices: quantityKeys.map(x => ({ name: formatString(x), value: x })),
                        required: false
                    }
                ]
            },
            {
                type: ApplicationCommandOptionType.Subcommand,
                name: "convert",
                description: "Convert one quantity to another",
                options: [
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "starter",
                        description: "The starting quantity to convert from",
                        required: true
                    },
                    {
                        type: ApplicationCommandOptionType.String,
                        name: "target",
                        description: "The target quantity to covert to",
                        required: true
                    }
                ]
            }
        ]
    }
});
