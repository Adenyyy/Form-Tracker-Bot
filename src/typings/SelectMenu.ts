import { AnySelectMenuInteraction, ChannelSelectMenuInteraction, GuildMember, MentionableSelectMenuInteraction, PermissionResolvable, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserSelectMenuInteraction } from "discord.js";
import { ExtendedClient } from "../structures/Client.js";

/**
 * {
 *  name: "selectMenuName",
 *  run: async({ interaction }) => {
 *
 * }
 * }
 */

interface AnySelectMenuRunOptions {
    client: ExtendedClient;
    interaction: AnySelectMenuInteraction;
}

type AnySelectMenuRunFunction = (options: AnySelectMenuRunOptions) => any;

export type AnySelectMenuType = {
    name: string;
    disabled?: boolean;
    userPermissions?: PermissionResolvable[];
    run: AnySelectMenuRunFunction;
};