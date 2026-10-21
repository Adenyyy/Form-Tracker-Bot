import { sendErrorMessage } from "./logger.js";
import { client } from "../index.js";
import embed from "./embed.js";
import { GuildConfig } from "../services/database.js";
import sheets from "../services/sheets.js";
import { SetupError } from "../services/tracker.js";

import { load } from 'js-yaml';
import { GuildMember, MessageFlags, PermissionFlagsBits, RepliableInteraction } from 'discord.js';
import fs from 'fs';

const utils = {

  async loadYaml(filePath: string) {
    try {
      return load(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      sendErrorMessage(`Error while trying to load yaml file: ${filePath}`, e);
    }
  },

  // Reply flags based on 'messages.ephemeral' in settings.yml
  replyFlags(): MessageFlags.Ephemeral | undefined {
    return client.config.messages.ephemeral ? MessageFlags.Ephemeral : undefined;
  },

  // Manage Server, or the role set with /setup admin-role
  isAdmin(member: GuildMember, config: GuildConfig): boolean {
    if (!member) return false;
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    return Boolean(config.admin_role_id && member.roles.cache.has(config.admin_role_id));
  },

  // Shows a command error to the user, whether or not the interaction was already replied to
  async replyError(interaction: RepliableInteraction, e: any) {
    const message = e instanceof SetupError ? e.message : e?.code || e?.response ? sheets.describeError(e) : "Something went wrong running that command.";
    const payload = { embeds: [embed.error(message)], flags: MessageFlags.Ephemeral as const };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  },

  progressBar(done: number, total: number, width = 16): string {
    const ratio = total ? done / total : 0;
    const filled = Math.round(ratio * width);
    return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${Math.round(ratio * 100)}%`;
  },

  // Splits lines into chunks that each fit in one Discord message or embed field
  chunkLines(lines: string[], maxLength: number): string[] {
    const chunks: string[] = [];
    let current = "";
    for (const line of lines) {
      if (current && current.length + line.length + 1 > maxLength) { chunks.push(current); current = ""; }
      current += (current ? "\n" : "") + line;
    }
    if (current) chunks.push(current);
    return chunks;
  }

};

export default utils;
