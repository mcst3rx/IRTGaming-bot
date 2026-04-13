import {
    db,
    fmNamesTable,
    tfNamesTable,
    whitelistTable,
    watchListTable,
    watchListPingsTable,
    playerTimesTable
} from "#db";

export async function fetchDBData() {
    const dbData = {
        fmNamesData: await db.select().from(fmNamesTable),
        tfNamesData: await db.select().from(tfNamesTable),
        whitelistData: await db.select().from(whitelistTable),
        watchListData: await db.select().from(watchListTable),
        watchlistPingsData: await db.select().from(watchListPingsTable),
        playerTimesData: await db.select().from(playerTimesTable)
    };

    return dbData;
}