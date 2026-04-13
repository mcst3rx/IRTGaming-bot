import TClient from "./client.js";
import * as Actions from "#actions";

const client = new TClient();

Actions.loadLoggers(client);
await Actions.loadCommands(client);
await Actions.loadEvents(client);

await client.login(client.config.TOKEN);
