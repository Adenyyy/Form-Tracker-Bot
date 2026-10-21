import { Guild, User } from "discord.js";
import { client } from "../index.js";
import database, { GuildConfig } from "./database.js";
import sheets from "./sheets.js";
import { MatchResult, Member, matchSubmissions } from "./matching.js";

export interface TrackerStatus extends MatchResult {
    fetchedAt: number;
}

const cache = new Map<string, TrackerStatus>();
// guildId -> (sheet discord value -> user ID, or null with the time the lookup failed)
const discordIds = new Map<string, Map<string, string | { failedAt: number }>>();
const FAILED_LOOKUP_RETRY_MS = 30 * 60 * 1000;

function cacheMs(): number {
    return (client.config.tracker?.cache_seconds ?? 120) * 1000;
}

const tracker = {

    // Returns what still needs setting up, or an empty list when the guild is ready
    missingSetup(config: GuildConfig): string[] {
        const missing: string[] = [];
        if (!config.members_sheet_id || !config.responses_sheet_id) missing.push("Link the sheets with `/setup sheets`");
        if (!config.member_match_col || !config.response_match_col || !config.member_name_col) missing.push("Pick the columns with `/setup columns`");
        return missing;
    },

    async getStatus(guildId: string, force = false): Promise<TrackerStatus> {
        const cached = cache.get(guildId);
        if (!force && cached && Date.now() - cached.fetchedAt < cacheMs()) return cached;

        const config = database.getConfig(guildId);
        const setup = tracker.missingSetup(config);
        if (setup.length) throw new SetupError(setup);

        const [members, responses] = await Promise.all([
            sheets.readTable(config.members_sheet_id, config.members_tab),
            sheets.readTable(config.responses_sheet_id, config.responses_tab)
        ]);
        const exemptKeys = new Set(database.getExemptions(guildId).map(exemption => exemption.match_key));
        const result = matchSubmissions(members.rows, responses.rows, {
            memberName: config.member_name_col,
            memberMatch: config.member_match_col,
            memberDiscord: config.member_discord_col,
            responseMatch: config.response_match_col
        }, exemptKeys);

        const status = { ...result, fetchedAt: Date.now() };
        cache.set(guildId, status);
        return status;
    },

    clearCache(guildId: string) {
        cache.delete(guildId);
    },

    // Finds a member row by the Discord user, without any API calls
    findMemberByUser(members: Member[], user: User): Member | undefined {
        const usernames = [user.id, user.username, user.tag].map(value => value.toLowerCase());
        return members.find(member => usernames.includes(member.discord.replace(/^@/, "").trim().toLowerCase()));
    },

    // Resolves the sheet's Discord value (user ID or username) to a user ID
    async resolveDiscordId(guild: Guild, value: string): Promise<string | null> {
        const raw = value.replace(/^@/, "").trim();
        if (!raw) return null;
        if (/^\d{17,20}$/.test(raw)) return raw;
        const mention = raw.match(/^<@!?(\d{17,20})>$/);
        if (mention) return mention[1];

        let guildCache = discordIds.get(guild.id);
        if (!guildCache) discordIds.set(guild.id, guildCache = new Map());
        const cached = guildCache.get(raw.toLowerCase());
        if (typeof cached === "string") return cached;
        if (cached && Date.now() - cached.failedAt < FAILED_LOOKUP_RETRY_MS) return null;

        const username = raw.toLowerCase().replace(/#0$/, "");
        try {
            const results = await guild.members.search({ query: username, limit: 10 });
            const found = results.find(member => member.user.username.toLowerCase() === username || member.user.tag.toLowerCase() === username);
            guildCache.set(raw.toLowerCase(), found ? found.id : { failedAt: Date.now() });
            return found?.id ?? null;
        } catch {
            return null;
        }
    },

    async resolveMembers(guild: Guild, members: Member[]): Promise<{ member: Member; userId: string | null }[]> {
        const resolved: { member: Member; userId: string | null }[] = [];
        for (const member of members) resolved.push({ member, userId: await tracker.resolveDiscordId(guild, member.discord) });
        return resolved;
    }

};

export class SetupError extends Error {
    constructor(public steps: string[]) {
        super(`This server isn't set up yet:\n${steps.map(step => `• ${step}`).join("\n")}`);
    }
}

export default tracker;
