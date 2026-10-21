import { MessageContextMenuCommandInteraction, GuildMember, MessageApplicationCommandData, PermissionResolvable } from "discord.js";
import { ExtendedClient } from "../structures/Client.js";

/**
 * {
 *  name: "commandname",
 * run: async({ interaction }) => {
 *
 * }
 * }
 */
export interface MessageExtendedInteraction extends MessageContextMenuCommandInteraction {
    member: GuildMember;
}

interface RunOptions {
    client: ExtendedClient;
    interaction: MessageExtendedInteraction;
}

type RunFunction = (options: RunOptions) => any;

export type MessageCommandType = {
    guilds?: string[];
    disabled?: boolean;
    userPermissions?: PermissionResolvable[];
    run: RunFunction;
} & MessageApplicationCommandData;
