import {
    AutocompleteInteraction,
    ChatInputApplicationCommandData,
    ChatInputCommandInteraction,
    CommandInteraction,
    CommandInteractionOptionResolver,
    GuildMember,
    PermissionResolvable
} from "discord.js";
import { ExtendedClient } from "../structures/Client.js";

/**
 * {
 *  name: "commandname",
 * description: "any description",
 * run: async({ interaction }) => {
 *
 * }
 * }
 */
export interface ExtendedInteraction extends ChatInputCommandInteraction {
    member: GuildMember;
}

export interface AutoCompleteExtendedInteraction extends AutocompleteInteraction {
    member: GuildMember;
}

interface RunOptions {
    client: ExtendedClient;
    interaction: ExtendedInteraction;
    args: CommandInteractionOptionResolver;
}

type RunFunction = (options: RunOptions) => any;

interface AutoCompleteOptions {
    client: ExtendedClient;
    interaction: AutoCompleteExtendedInteraction;
    args: CommandInteractionOptionResolver;
}

type AutoCompleteFunction = (options: AutoCompleteOptions) => any;


export type CommandType = {
    category?: string;
    guilds?: string[];
    disabled?: boolean;
    userPermissions?: PermissionResolvable[];
    run: RunFunction;
    autocomplete?: AutoCompleteFunction;
} & ChatInputApplicationCommandData;
