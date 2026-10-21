import chalk from "chalk";
import { Event } from "../structures/Event.js";
import { sendErrorMessage } from "../utils/logger.js";

export default new Event("error", async (error) => {
    sendErrorMessage("An error has occured: " + chalk.whiteBright(error.message), error.stack);
});
