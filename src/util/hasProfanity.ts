import { bannedWordsTable, db } from "#db";

const bannedWordsData = await db.select().from(bannedWordsTable);

/**
 * Checks whether a given text has profanity or not
 * @param text The text to analyze for profanity
 * @param profanityList A list of words considered profanity
 */
export function hasProfanity(rawText: string) {
    let loopCount = 0;
    let text = rawText.replace(/[^a-zA-Z\s]/g, "");

    for (const [regExp, str] of new Map([
        [/!/g, "i"],
        [/@/g, "a"],
        [/\$/g, "s"],
        [/3/g, "e"],
        [/1/g, "i"],
        [/¡/g, "i"],
        [/5/g, "s"],
        [/0/g, "o"],
        [/4/g, "h"],
        [/7/g, "t"],
        [/9/g, "g"],
        [/6/g, "b"],
        [/8/g, "b"]
    ])) text = text.replace(regExp, str);

    function allPossibleCases(arr: string[][]) {
        loopCount++;

        if (arr.length === 1 || loopCount > 20) return arr[0];

        const result: string[] = [];
        const allCasesOfRest = allPossibleCases(arr.slice(1));

        for (let i = 0; i < allCasesOfRest.length; i++) {
            for (let j = 0; j < arr[0].length; j++) result.push(arr[0][j] + allCasesOfRest[i]);
        }

        return result;
    }

    const parsedText = text
        .split(" ")
        .map(word => {
            if (!/(.)\1{1,}/.test(word) || word.length <= 3) return word;

            const val: string[] = [];
            const arr: string[][] = [];
            let chop = word[0];

            for (let i = 1; i <= word.length; i++) {
                if (chop[0] != word[i]) {
                    val.push(chop);
                    chop = word[i];
                } else chop += word[i];
            }

            for (let i = 0; i < val.length; i++) {
                const temp: string[] = [];

                if (val[i].length >= 2) temp.push(val[i][0].repeat(2));

                temp.push(val[i][0]);
                arr.push(temp);
            }

            return allPossibleCases(arr).join(" ");
        })
        .join(" ")
        .replace(/ +(?= )/g, "")
        .split(" ");

    return bannedWordsData.some(x => parsedText.includes(x.word));
}