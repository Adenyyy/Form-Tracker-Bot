import { ApplicationCommandDataResolvable } from "discord.js";

export interface RegisterCommandsOptions {
    guildName?: string;
    guildId?: string;
    commands: ApplicationCommandDataResolvable[];
}
