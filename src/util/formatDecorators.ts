import type { PlayerUsed } from "farming-simulator-types/2025";
import { ADMIN_ICON, FM_ICON, TF_ICON, WL_ICON } from "./constants.js";
import type { DBData } from "#typings";

export function formatDecorators(player: PlayerUsed, dbData: DBData, isPublic: boolean) {
    let decorators = "";

    if (player.isAdmin) decorators += ADMIN_ICON;

    if (dbData.fmNamesData.some(x => x.name === player.name)) decorators += FM_ICON;

    if (dbData.tfNamesData.some(x => x.name === player.name)) decorators += TF_ICON;

    if (!isPublic) {
        if (dbData.watchListData.some(x => x.name === player.name)) decorators += WL_ICON;

        if (dbData.whitelistData.some(x => x.name === player.name)) decorators += ":white_circle:";
    }

    return decorators;
}