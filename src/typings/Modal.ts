import { GuildMember, PermissionResolvable, ModalSubmitInteraction, } from "discord.js";
import { ExtendedClient } from "../structures/Client.js";

/**
 * {
 *  name: "commandname",
 *  run: async({ interaction }) => {
 *
 * }
 * }
 */

export interface ModalSubmitExtendedInteraction extends ModalSubmitInteraction {
    member: GuildMember;
}

interface ModalSubmitRunOptions {
    client: ExtendedClient;
    interaction: ModalSubmitExtendedInteraction;
}

type ModalSubmitRunFunction = (options: ModalSubmitRunOptions) => any;

export type ModalSubmitType = {
    name: string;
    disabled?: boolean;
    userPermissions?: PermissionResolvable[];
    run: ModalSubmitRunFunction;
};
