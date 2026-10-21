import chalk from "chalk";
import { client } from "../index.js";

// The logger can run before the client exists (e.g. while loading settings.yml), so don't assume it does
function isDebug(): boolean {
    try {
        return Boolean(client?.config?.debug);
    } catch {
        return true;
    }
}

export function sendInfoMessage(message: string) {
    console.log(chalk.whiteBright.bgBlueBright.bold("| INFO |") + " " + chalk.whiteBright(message));
}
export function sendHandlerMessage(message: string) {
    console.log(chalk.whiteBright.bgMagentaBright.bold("| HANDLER |") + " " + chalk.whiteBright(message));
}
export function sendSuccessMessage(message: string) {
    console.log(chalk.whiteBright.bgGreenBright.bold("| SUCCESS |") + " " + chalk.whiteBright(message));
}
export function sendWarningMessage(message: string, error?: string) {
    console.log(chalk.whiteBright.bgYellowBright.bold("| WARNING |") + " " + chalk.yellowBright(message));
    if (isDebug() && error) console.log(chalk.whiteBright.bgCyanBright.bold("| DEBUG |") + " " + chalk.whiteBright(error));
}
export function sendErrorMessage(message: string, error?: string, trace?: string) {
    console.log(chalk.whiteBright.bgRedBright.bold("| ERROR |") + " " + chalk.redBright.bold(message) + `${trace ? ` (${trace})` : ''}`);
    if (isDebug() && error) console.log(chalk.whiteBright.bgCyanBright.bold("| DEBUG |") + " " + chalk.whiteBright(error));
}
