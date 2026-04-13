/**
 * Formats a string by making every first letter of each word (separated by a space) uppercase
 * @param text The text to format
 */
export function formatString(rawText: string) {
    const text = rawText.trim();

    return text.includes(" ")
        ? text.split(" ").map(x => x[0].toUpperCase() + x.toLowerCase().slice(1)).join(" ")
        : text[0].toUpperCase() + text.toLowerCase().slice(1);

}