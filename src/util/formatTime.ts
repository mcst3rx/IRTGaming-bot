const timeNames = [
    { name: "year",   length: 1_000 * 60 * 60 * 24 * 365 },
    { name: "month",  length: 1_000 * 60 * 60 * 24 * 30 },
    { name: "week",   length: 1_000 * 60 * 60 * 24 * 7 },
    { name: "day",    length: 1_000 * 60 * 60 * 24 },
    { name: "hour",   length: 1_000 * 60 * 60 },
    { name: "minute", length: 1_000 * 60 },
    { name: "second", length: 1_000 }
] as const;

/**
 * @param integer The integer in milliseconds to format
 * @param accuracy The number of layers of accuracy to be presented in the return, e.g. `1` for "1h" or `2` for "1h, 1m"
 * @param options `longNames` - whether to display amounts as compact or not, e.g. (`s`) or (`seconds`). `commas` - Whether to space each amount with a comma or not
 * @returns The formatted output
 */
export function formatTime(integer: number, accuracy = 1, options: { longNames?: true, commas?: true } = {}) {
    let ms = integer;
    let achievedAccuracy = 0;
    let text = "";

    for (const timeName of timeNames) {
        if (achievedAccuracy >= accuracy) break;

        const fullTimelengths = Math.floor(ms / timeName.length);

        if (!fullTimelengths) continue;

        achievedAccuracy++;
        text +=
            fullTimelengths
            + (
                options.longNames
                    ? (" " + timeName.name + (fullTimelengths === 1 ? "" : "s"))
                    : timeName.name.slice(0, timeName.name === "month" ? 2 : 1))
            + (options.commas ? ", " : " ");
        ms -= fullTimelengths * timeName.length;
    }

    if (!text) text = ms + (options.longNames ? " milliseconds" : "ms") + (options.commas ? ", " : "");

    if (options.commas) {
        text = text.slice(0, -2);

        if (options.longNames) {
            const textArr = text.split("");

            textArr[text.lastIndexOf(",")] = " and";
            text = textArr.join("");
        }
    }

    return text.trim();
}