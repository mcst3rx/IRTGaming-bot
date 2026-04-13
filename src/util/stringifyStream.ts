/**
 * @param stream The stream to stringify the data for
 * @returns A string containing the stream's data
 */
export async function stringifyStream(stream: NodeJS.ReadableStream) {
    const chunks = [];

    for await (const chunk of stream) chunks.push(Buffer.from(chunk));

    return Buffer.concat(chunks).toString("utf-8");
}