import { ShardingManager } from "discord.js";
import { log } from "#util";

const sharder = new ShardingManager("./index.js", { totalShards: 1 });

sharder.on("shardCreate", () => log("green", "Shard started"));
sharder.spawn().catch(console.error);