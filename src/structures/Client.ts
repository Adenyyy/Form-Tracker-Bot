import { ApplicationCommandDataResolvable, Client, ClientEvents, Collection, Events, GatewayIntentBits } from "discord.js";
import { CommandType } from "../typings/Command.js";
import { glob } from "glob";
import { RegisterCommandsOptions } from "../typings/client.js";
import { Event } from "./Event.js";
import { getBorderCharacters, table } from 'table';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { sendErrorMessage, sendHandlerMessage, sendSuccessMessage, sendWarningMessage } from "../utils/logger.js";
import { UserCommandType } from "../typings/UserCommand.js";
import { MessageCommandType } from "../typings/MessageCommand.js";
import { ButtonType } from "../typings/Button.js";
import errorHandler from "../utils/errorHandler.js";
import { AnySelectMenuType } from "../typings/SelectMenu.js";
import { ModalSubmitType } from "../typings/Modal.js";
import utils from "../utils/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let config: any = await utils.loadYaml(path.join(process.cwd(), "src", "config", "settings.yml"));

export class ExtendedClient extends Client {
    public commands: Collection<string, CommandType> = new Collection();
    public userCommands: Collection<string, UserCommandType> = new Collection();
    public messageCommands: Collection<string, MessageCommandType> = new Collection();
    public selectMenus: Collection<string, AnySelectMenuType> = new Collection();
    public buttons: Collection<string, ButtonType> = new Collection();
    public modals: Collection<string, ModalSubmitType> = new Collection();
    public events: Collection<string, any> = new Collection();
    public config: typeof config = config;

    constructor() {
        // Add more intents here if your bot needs them (e.g. GuildMessages, MessageContent)
        super({ intents: [GatewayIntentBits.Guilds] });
    }

    async start() {
        errorHandler();
        // Load everything before logging in so event handlers (e.g. clientReady) are attached in time
        await this.registerModules();
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.commands.size)} commands`);
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.userCommands.size)} user context menu commands`);
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.messageCommands.size)} message context menu commands`);
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.selectMenus.size)} select menus`);
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.buttons.size)} buttons`);
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.modals.size)} modals`);
        sendHandlerMessage(`Loaded ${chalk.magentaBright.underline(this.events.size)} events`);
        await this.login(config.bot_settings.token).catch(() => {
            sendErrorMessage(`An invalid bot token was provided in 'settings.yml' (bot_settings.token)`);
        });
    }
    async importFile(filePath: string) {
        const file: any = await import(pathToFileURL(filePath).toString());
        return file?.default;
    }

    async registerCommands({ commands, guildId, guildName }: RegisterCommandsOptions) {
        if (!this.config.bot_settings.register_commands) return sendWarningMessage("Registering commands is disabled in 'settings.yml'");
        if (guildId) {
            try {
                const guild = this.guilds.cache.get(guildId);
                if (!guild) return sendErrorMessage(`Could not find guild: ${chalk.whiteBright.underline(guildName)} (${guildId}) - is the bot in it?`);
                await guild.commands.set(commands);
                sendSuccessMessage(`Registered ${chalk.greenBright.underline(commands.length)} commands to guild: ${chalk.greenBright.underline(guildName)}`);
            } catch (e) {
                sendErrorMessage(`Could not register commands to guild: ${chalk.whiteBright.underline(guildName)}`, e);
            }
        } else {
            try {
                await this.application.commands.set(commands);
                sendSuccessMessage(`Registered ${chalk.greenBright.underline(commands.length)} commands globally`);
            } catch (e) {
                sendErrorMessage(`Could not register commands globally`, e);
            }
        }
    }

    async registerModules() {
        const commandTableConfig: any = {
            border: getBorderCharacters("honeywell"),
            columnDefault: {
                width: 16
            },
            columns: [
                { alignment: 'center' },
                { alignment: 'center' },
                { alignment: 'center' },
                { alignment: 'center' },
            ],
            header: {
                alignment: 'center',
                content: chalk.blueBright.bold('Loading Commands'),
            },
        };

        // Load Commands
        // global_commands: false -> every command is registered only to the guilds in settings.yml (for development - keeps unfinished commands out of other servers)
        // global_commands: true  -> commands are registered globally (every server the bot is in), except ones with a 'guilds' option which stay guild-only
        const globalMode: boolean = this.config.bot_settings.global_commands === true;
        const configGuilds: { name: string; id: string }[] = this.config.bot_settings.guilds ?? [];
        let commandTableData: any[] = [[chalk.blueBright("Target"), chalk.blueBright("Type"), chalk.blueBright("Command"), chalk.blueBright("Status")]];
        const globalCommands: ApplicationCommandDataResolvable[] = [];
        const guildCommands = new Map<string, ApplicationCommandDataResolvable[]>(configGuilds.map(guild => [guild.name, []]));

        if (!globalMode && configGuilds.length === 0) sendErrorMessage("No guilds were found in 'settings.yml' (bot_settings.guilds) and global_commands is disabled - no commands will be registered");

        const loadCommand = (command: CommandType | UserCommandType | MessageCommandType, type: string, collection: Collection<string, any>) => {
            if (!command?.name) return;
            if (command.disabled) { commandTableData.push([chalk.whiteBright("-"), chalk.whiteBright(type), chalk.whiteBright(command.name), chalk.whiteBright.bgRedBright("disabled")]); return; }
            collection.set(command.name, command);

            // Commands with a 'guilds' option are always guild-only, otherwise follow global_commands
            const targetGuilds = command.guilds?.length ? command.guilds : globalMode ? null : configGuilds.map(guild => guild.name);
            if (!targetGuilds) {
                globalCommands.push(command);
                commandTableData.push([chalk.whiteBright("Global"), chalk.whiteBright(type), chalk.whiteBright(command.name), chalk.whiteBright.bgGreenBright("enabled")]);
                return;
            }
            for (const guildName of targetGuilds) {
                const commands = guildCommands.get(guildName);
                if (!commands) { sendWarningMessage(`${type} command '${command.name}' references guild '${guildName}' which is not in 'settings.yml' (bot_settings.guilds)`); continue; }
                commands.push(command);
                commandTableData.push([chalk.whiteBright(guildName), chalk.whiteBright(type), chalk.whiteBright(command.name), chalk.whiteBright.bgGreenBright("enabled")]);
            }
        };

        const commandFiles = await glob(`./interactions/commands/**/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: path.join(__dirname, "../"), absolute: true, nodir: true }) as string[];
        const userCommandFiles = await glob(`./interactions/contextMenuCommands/user/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: path.join(__dirname, "../"), absolute: true, nodir: true }) as string[];
        const messageCommandFiles = await glob(`./interactions/contextMenuCommands/message/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: path.join(__dirname, "../"), absolute: true, nodir: true }) as string[];
        for (const filePath of commandFiles) loadCommand(await this.importFile(filePath), "Chat Input", this.commands);
        for (const filePath of userCommandFiles) loadCommand(await this.importFile(filePath), "User", this.userCommands);
        for (const filePath of messageCommandFiles) loadCommand(await this.importFile(filePath), "Message", this.messageCommands);
        if (this.config.debug) console.log(table(commandTableData, commandTableConfig));

        this.on(Events.ClientReady, () => {
            // Global registration is skipped in guild mode so production commands aren't wiped while developing
            if (globalMode) this.registerCommands({ commands: globalCommands }).catch(e => console.log(e));
            // Each guild is always set (even to an empty list) so dev copies are cleared when switching to global
            for (const guild of configGuilds) {
                this.registerCommands({
                    guildName: guild.name,
                    guildId: guild.id,
                    commands: guildCommands.get(guild.name)
                }).catch(e => console.log(e));
            }
        });


        // Load Select Menus
        const selectMenusTableConfig: any = {
            border: getBorderCharacters("honeywell"),
            columnDefault: {
                width: 20
            },
            columns: [
                { alignment: 'center' },
                { alignment: 'center' },
            ],
            header: {
                alignment: 'center',
                content: chalk.blueBright.bold('Loading Select Menus'),
            },
        };

        let selectMenusTableData: any[] = [[chalk.blueBright("Select Menu"), chalk.blueBright("Status")]];
        const selectMenuFiles = await glob(`../interactions/selectMenus/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: __dirname, absolute: true, nodir: true }) as string[];
        for (const filePath of selectMenuFiles) {
            const selectMenu: any = await this.importFile(
                filePath
            );
            try {
                if (selectMenu.disabled) { selectMenusTableData.push([chalk.whiteBright(selectMenu.name), chalk.whiteBright.bgRedBright("disabled")]); continue; }
                selectMenusTableData.push([chalk.whiteBright(selectMenu.name), chalk.whiteBright.bgGreenBright("enabled")]);
                this.selectMenus.set(selectMenu.name, selectMenu);
            } catch {
                selectMenusTableData.push([chalk.whiteBright(selectMenu.name), chalk.whiteBright.bgYellowBright("error")]);
            }
        }
        if (this.config.debug) console.log(table(selectMenusTableData, selectMenusTableConfig));


        // Load Buttons
        const buttonTableConfig: any = {
            border: getBorderCharacters("honeywell"),
            columnDefault: {
                width: 20
            },
            columns: [
                { alignment: 'center' },
                { alignment: 'center' },
            ],
            header: {
                alignment: 'center',
                content: chalk.blueBright.bold('Loading Buttons'),
            },
        };

        let buttonTableData: any[] = [[chalk.blueBright("Button"), chalk.blueBright("Status")]];
        const buttonFiles = await glob(`../interactions/buttons/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: __dirname, absolute: true, nodir: true }) as string[];
        for (const filePath of buttonFiles) {
            const button: ButtonType = await this.importFile(
                filePath
            );
            try {
                if (button.disabled) { buttonTableData.push([chalk.whiteBright(button.name), chalk.whiteBright.bgRedBright("disabled")]); continue; }
                buttonTableData.push([chalk.whiteBright(button.name), chalk.whiteBright.bgGreenBright("enabled")]);
                this.buttons.set(button.name, button);
            } catch {
                buttonTableData.push([chalk.whiteBright(button.name), chalk.whiteBright.bgYellowBright("error")]);
            }
        }
        if (this.config.debug) console.log(table(buttonTableData, buttonTableConfig));

        // Load Modals
        const modalTableConfig: any = {
            border: getBorderCharacters("honeywell"),
            columnDefault: {
                width: 20
            },
            columns: [
                { alignment: 'center' },
                { alignment: 'center' },
            ],
            header: {
                alignment: 'center',
                content: chalk.blueBright.bold('Loading Modals'),
            },
        };

        let modalTableData: any[] = [[chalk.blueBright("Modal"), chalk.blueBright("Status")]];
        const modalFiles = await glob(`../interactions/modals/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: __dirname, absolute: true, nodir: true }) as string[];
        for (const filePath of modalFiles) {
            const modalSubmit: ModalSubmitType = await this.importFile(
                filePath
            );
            try {
                if (modalSubmit.disabled) { modalTableData.push([chalk.whiteBright(modalSubmit.name), chalk.whiteBright.bgRedBright("disabled")]); continue; }
                modalTableData.push([chalk.whiteBright(modalSubmit.name), chalk.whiteBright.bgGreenBright("enabled")]);
                this.modals.set(modalSubmit.name, modalSubmit);
            } catch {
                modalTableData.push([chalk.whiteBright(modalSubmit.name), chalk.whiteBright.bgYellowBright("error")]);
            }
        }
        if (this.config.debug) console.log(table(modalTableData, modalTableConfig));

        // Load Events
        const eventTableConfig: any = {
            border: getBorderCharacters("honeywell"),
            columnDefault: {
                width: 20
            },
            columns: [
                { alignment: 'center' },
                { alignment: 'center' },
            ],
            header: {
                alignment: 'center',
                content: chalk.blueBright.bold('Loading Events'),
            },
        };

        let eventTableData: any[] = [[chalk.blueBright("Event"), chalk.blueBright("Status")]];

        const eventFiles = await glob(`../events/**/*.{ts,js}`, { ignore: ['node_modules/**', '**/node_modules/**'], cwd: __dirname, absolute: true, nodir: true }) as string[];
        for (const filePath of eventFiles) {
            const event: Event<keyof ClientEvents> = await this.importFile(
                filePath
            );
            try {
                eventTableData.push([chalk.whiteBright(event.event), chalk.whiteBright.bgGreenBright("enabled")]);
                this.events.set(event.event, event);
                this.on(event.event, event.run);
            } catch {
                eventTableData.push([chalk.whiteBright(event.event), chalk.whiteBright.bgYellowBright("error")]);
            }

        }
        if (this.config.debug) console.log(table(eventTableData, eventTableConfig));

    }
}