import { styleText } from "node:util";

export function log(color: Parameters<typeof styleText>[0], text: string) {
    console.log(styleText(color, `[${(new Date()).toLocaleString("en-GB")}] ${text}`));
}