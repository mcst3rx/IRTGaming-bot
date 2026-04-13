import config from "#config" with { type: "json" };
import { FSServers } from "#structures";
import { normalizeConfig } from "./config.js";

export const fsServers = new FSServers(normalizeConfig(config).fs);
