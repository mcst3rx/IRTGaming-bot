type Changes = { row: number; text: string; }[];
type Sections = Record<string, { n?: string | null; o?: string | null; rows: number[]; }>;

enum ANSIColor {
    Red = "\x1b[31m",
    Green = "\x1b[32m",
    Reset = "\x1b[0m"
}

/**
 * Adds a highlight to a string
 *
 * @param string - The string to highlight
 * @param color - The color of the highlight to add
 * @returns The highlighted string with a trailing space
 */
function highlight(string: string, color: ANSIColor) {
    return color + string + " " + ANSIColor.Reset;
}

/**
 * Find the differences between two strings. Credits to [John Resig](https://johnresig.com/projects/javascript-diff-algorithm/)
 * @returns `oldText` with ANSI red highlights for removed text, `newText` with ANSI green highlights for added text
 */
export function formatDiff(oldText: string, newText: string) {
    let oldTextChanges = "";
    let newTextChanges = "";
    const ns: Sections = {};
    const os: Sections = {};
    const oldChanges: Changes = oldText.trim().split(/\s+/).map(x => ({ text: x, row: -1 }));
    const newChanges: Changes = newText.trim().split(/\s+/).map(x => ({ text: x, row: -1 }));

    for (let i = 0; i < newChanges.length; i++) {
        if (!ns[newChanges[i].text]) ns[newChanges[i].text] = { rows: [], o: null };

        ns[newChanges[i].text].rows.push(i);
    }

    for (let i = 0; i < oldChanges.length; i++) {
        if (!os[oldChanges[i].text]) os[oldChanges[i].text] = { rows: [], n: null };

        os[oldChanges[i].text].rows.push(i);
    }

    for (const i in ns) {
        if (ns[i].rows.length == 1 && os[i] && os[i].rows.length == 1) {
            newChanges[ns[i].rows[0]] = { text: newChanges[ns[i].rows[0]].text, row: os[i].rows[0] };
            oldChanges[os[i].rows[0]] = { text: oldChanges[os[i].rows[0]].text, row: ns[i].rows[0] };
        }
    }

    for (let i = 0; i < newChanges.length - 1; i++) {
        if (
            newChanges[i].row > -1
            && newChanges[i + 1].row < 0
            && newChanges[i].row + 1 < oldChanges.length
            && oldChanges[newChanges[i].row + 1].row < 0
            && newChanges[i + 1].text == oldChanges[newChanges[i].row + 1].text
        ) {
            newChanges[i + 1] = { text: newChanges[i + 1].text, row: newChanges[i].row + 1 };
            oldChanges[newChanges[i].row + 1] = { text: oldChanges[newChanges[i].row + 1].text, row: i + 1 };
        }
    }

    for (let i = newChanges.length - 1; i > 0; i--) {
        if (
            newChanges[i].row > 0
            && newChanges[i - 1].row < 0
            && oldChanges[newChanges[i].row - 1].row < 0
            && newChanges[i - 1].text == oldChanges[newChanges[i].row - 1].text
        ) {
            newChanges[i - 1] = { text: newChanges[i - 1].text, row: newChanges[i].row - 1 };
            oldChanges[newChanges[i].row - 1] = { text: oldChanges[newChanges[i].row - 1].text, row: i - 1 };
        }
    }

    if (!newChanges.length) {
        for (let i = 0; i < oldChanges.length; i++) oldTextChanges += highlight(oldChanges[i].text, ANSIColor.Red);
    } else {
        if (!newChanges[0].text) {
            for (let i = 0; i < oldChanges.length && !oldChanges[i].text; i++) {
                oldTextChanges += highlight(oldChanges[i].text, ANSIColor.Red);
            }
        }

        if (oldChanges.every(x => x.row < 0)) {
            for (const oldChange of oldChanges) oldTextChanges += highlight(oldChange.text, ANSIColor.Red);
        } else if (oldChanges[0].row < 0) {
            oldTextChanges += highlight(oldChanges[0].text, ANSIColor.Red);
        }

        for (let i = 0; i < newChanges.length; i++) {
            if (newChanges[i].row < 0) {
                newTextChanges += highlight(newChanges[i].text, ANSIColor.Green);
            } else {
                let pre = "";

                for (let n = newChanges[i].row + 1; n < oldChanges.length && oldChanges[n].row < 1; n++) {
                    pre += highlight(oldChanges[n].text, ANSIColor.Red);
                }

                oldTextChanges += newChanges[i].text + " " + pre;
                newTextChanges += newChanges[i].text + " ";
            }
        }
    }

    oldTextChanges = oldTextChanges.replaceAll(ANSIColor.Reset + ANSIColor.Red, "");
    newTextChanges = newTextChanges.replaceAll(ANSIColor.Reset + ANSIColor.Green, "");

    return { oldText: oldTextChanges, newText: newTextChanges };
}