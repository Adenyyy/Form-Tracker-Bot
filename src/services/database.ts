import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { client } from "../index.js";

export interface GuildConfig {
    guild_id: string;
    members_sheet_id: string | null;
    members_tab: string | null;
    responses_sheet_id: string | null;
    responses_tab: string | null;
    member_name_col: string | null;
    member_match_col: string | null;
    member_discord_col: string | null;
    response_match_col: string | null;
    form_url: string | null;
    deadline: number | null; // epoch ms
    timezone: string;
    admin_role_id: string | null;
    allowed_channels: string[];
}

export interface Reminder {
    guild_id: string;
    channel_id: string;
    mode: "channel" | "dm";
    interval_days: number;
    time: string; // HH:mm in the guild's timezone
    next_run: number; // epoch ms
    message: string | null;
    enabled: boolean;
}

let db: DatabaseSync;

function open(): DatabaseSync {
    if (db) return db;
    const file = path.resolve(process.cwd(), client.config.tracker?.database_file ?? "./data/tracker.db");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    db = new DatabaseSync(file);
    db.exec(`
        CREATE TABLE IF NOT EXISTS guild_config (
            guild_id TEXT PRIMARY KEY,
            members_sheet_id TEXT, members_tab TEXT,
            responses_sheet_id TEXT, responses_tab TEXT,
            member_name_col TEXT, member_match_col TEXT, member_discord_col TEXT,
            response_match_col TEXT,
            form_url TEXT,
            deadline INTEGER,
            timezone TEXT NOT NULL DEFAULT 'UTC',
            admin_role_id TEXT,
            allowed_channels TEXT NOT NULL DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS reminders (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            mode TEXT NOT NULL DEFAULT 'channel',
            interval_days INTEGER NOT NULL,
            time TEXT NOT NULL,
            next_run INTEGER NOT NULL,
            message TEXT,
            enabled INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS exemptions (
            guild_id TEXT NOT NULL,
            match_key TEXT NOT NULL,
            label TEXT,
            PRIMARY KEY (guild_id, match_key)
        );
    `);
    return db;
}

const database = {

    getConfig(guildId: string): GuildConfig {
        const row: any = open().prepare("SELECT * FROM guild_config WHERE guild_id = ?").get(guildId);
        if (!row) return {
            guild_id: guildId, members_sheet_id: null, members_tab: null, responses_sheet_id: null, responses_tab: null,
            member_name_col: null, member_match_col: null, member_discord_col: null, response_match_col: null, form_url: null,
            deadline: null, timezone: "UTC", admin_role_id: null, allowed_channels: []
        };
        return { ...row, allowed_channels: JSON.parse(row.allowed_channels) };
    },

    // Merges the given fields into the guild's config
    updateConfig(guildId: string, changes: Partial<Omit<GuildConfig, "guild_id">>) {
        const config = { ...database.getConfig(guildId), ...changes };
        open().prepare(`
            INSERT OR REPLACE INTO guild_config (guild_id, members_sheet_id, members_tab, responses_sheet_id, responses_tab,
                member_name_col, member_match_col, member_discord_col, response_match_col, form_url, deadline, timezone, admin_role_id, allowed_channels)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(guildId, config.members_sheet_id, config.members_tab, config.responses_sheet_id, config.responses_tab,
            config.member_name_col, config.member_match_col, config.member_discord_col, config.response_match_col, config.form_url,
            config.deadline, config.timezone, config.admin_role_id, JSON.stringify(config.allowed_channels));
        return config;
    },

    getReminder(guildId: string): Reminder | null {
        const row: any = open().prepare("SELECT * FROM reminders WHERE guild_id = ?").get(guildId);
        return row ? { ...row, enabled: Boolean(row.enabled) } : null;
    },

    getDueReminders(now: number): Reminder[] {
        const rows: any[] = open().prepare("SELECT * FROM reminders WHERE enabled = 1 AND next_run <= ?").all(now);
        return rows.map(row => ({ ...row, enabled: true }));
    },

    saveReminder(reminder: Reminder) {
        open().prepare(`
            INSERT OR REPLACE INTO reminders (guild_id, channel_id, mode, interval_days, time, next_run, message, enabled)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(reminder.guild_id, reminder.channel_id, reminder.mode, reminder.interval_days, reminder.time,
            reminder.next_run, reminder.message, reminder.enabled ? 1 : 0);
    },

    deleteReminder(guildId: string) {
        open().prepare("DELETE FROM reminders WHERE guild_id = ?").run(guildId);
    },

    getExemptions(guildId: string): { match_key: string; label: string | null }[] {
        return open().prepare("SELECT match_key, label FROM exemptions WHERE guild_id = ?").all(guildId) as any[];
    },

    addExemption(guildId: string, matchKey: string, label: string) {
        open().prepare("INSERT OR REPLACE INTO exemptions (guild_id, match_key, label) VALUES (?, ?, ?)").run(guildId, matchKey, label);
    },

    removeExemption(guildId: string, matchKey: string): boolean {
        return open().prepare("DELETE FROM exemptions WHERE guild_id = ? AND match_key = ?").run(guildId, matchKey).changes > 0;
    }

};

export default database;
