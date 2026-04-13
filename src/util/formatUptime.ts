import type { PlayerUsed } from "farming-simulator-types/2025";

export function formatUptime(player: PlayerUsed) {
    if (!player.uptime) return "0:00";

    const playTimeHrs = Math.floor(player.uptime / 60);
    const playTimeMins = (player.uptime % 60).toString().padStart(2, "0");

    return playTimeHrs + ":" + playTimeMins;
}