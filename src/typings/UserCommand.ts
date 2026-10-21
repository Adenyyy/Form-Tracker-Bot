import { UserContextMenuCommandInteraction, GuildMember, PermissionResolvable, UserApplicationCommandData } from "discord.js";
import { ExtendedClient } from "../structures/Client.js";

/**
 * {
 *  name: "commandname",
 * run: async({ interaction }) => {
 *
 * }
 * }
 */
export interface UserExtendedInteraction extends UserContextMenuCommandInteraction {
    member: GuildMember;
}

interface RunOptions {
    client: ExtendedClient;
    interaction: UserExtendedInteraction;
}

type RunFunction = (options: RunOptions) => any;

export type UserCommandType = {
    guilds?: string[];
    disabled?: boolean;
    userPermissions?: PermissionResolvable[];
    run: RunFunction;
} & UserApplicationCommandData;
