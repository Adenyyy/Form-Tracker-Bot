import { GuildMember, PermissionResolvable, ButtonInteraction, } from "discord.js";
import { ExtendedClient } from "../structures/Client.js";

/**
 * {
 *  name: "commandname",
 *  run: async({ interaction }) => {
 *
 * }
 * }
 */

export interface ButtonExtendedInteraction extends ButtonInteraction {
    member: GuildMember;
}

interface ButtonRunOptions {
    client: ExtendedClient;
    interaction: ButtonExtendedInteraction;
    values?: Array<string>;
}

type ButtonRunFunction = (options: ButtonRunOptions) => any;

export type ButtonType = {
    name: string;
    disabled?: boolean;
    userPermissions?: PermissionResolvable[];
    run: ButtonRunFunction;
};
