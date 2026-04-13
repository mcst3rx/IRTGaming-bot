import { eq } from "drizzle-orm";
import { db, playerTimesTable } from "#db";
import { log } from "#util";

export function getTimeData(data: typeof playerTimesTable.$inferSelect) {
    return Object.entries(data.servers).filter((x): x is [string, NonNullable<typeof x[1]>] => x[1] !== null);
}

export async function addPlayerTime(playerName: string, playerTime: number, serverAcro: string) {
    if (playerName.length > 99 || playerName.length === 0) return log("yellow", `Skipping addPlayerTime due to length: "${playerName}"`);

    const now = Math.floor(Date.now() / 1_000);
    const playerTimesData = await getPlayerTimesRow(playerName);

    if (!playerTimesData) {
        await db.insert(playerTimesTable).values({
            name: playerName,
            servers: {
                [serverAcro]: {
                    time: playerTime,
                    lastOn: now
                }
            }
        });

        return;
    }

    await db
        .update(playerTimesTable)
        .set({
            servers: {
                ...playerTimesData.servers,
                [serverAcro]: {
                    time: (playerTimesData.servers[serverAcro]?.time ?? 0) + playerTime,
                    lastOn: now
                }
            }
        })
        .where(eq(playerTimesTable.name, playerName));
}

export async function getPlayerTimesRow(playerName: string) {
    const rows = await db
        .select()
        .from(playerTimesTable)
        .limit(1)
        .where(eq(playerTimesTable.name, playerName));

    return rows.at(0) ?? null;
}