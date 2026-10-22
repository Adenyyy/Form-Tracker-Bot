import { ApplicationCommandOptionType } from "discord.js";
import { DateTime, IANAZone } from "luxon";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import database from "../../../services/database.js";
import sheets from "../../../services/sheets.js";
import tracker from "../../../services/tracker.js";
import reminders from "../../../services/reminders.js";

// Header guesses used right after /setup sheets so most servers don't need /setup columns
const GUESSES = {
    member_name_col: /^(full\s*)?name$|name/i,
    member_match_col: /e-?mail|student\s*(id|number|no)/i,
    member_discord_col: /discord/i,
    response_match_col: /e-?mail|student\s*(id|number|no)/i,
};

const headerCache = new Map<string, { members: string[]; responses: string[]; at: number }>();

async function getHeaders(guildId: string) {
    const cached = headerCache.get(guildId);
    if (cached && Date.now() - cached.at < 60_000) return cached;
    const config = database.getConfig(guildId);
    const [members, responses] = await Promise.all([
        config.members_sheet_id ? sheets.readHeaders(config.members_sheet_id, config.members_tab) : [],
        config.responses_sheet_id ? sheets.readHeaders(config.responses_sheet_id, config.responses_tab) : []
    ]);
    const headers = { members, responses, at: Date.now() };
    headerCache.set(guildId, headers);
    return headers;
}

function guess(headers: string[], pattern: RegExp, preferred?: string): string | null {
    if (preferred && headers.includes(preferred)) return preferred;
    return headers.find(header => pattern.test(header)) ?? null;
}

// The response match column should be the same kind as the member one (email with email, ID with ID)
function guessResponseColumn(headers: string[], memberColumn: string | null): string | null {
    const kind = memberColumn && /e-?mail/i.test(memberColumn) ? /e-?mail/i : memberColumn ? /id|number|no/i : GUESSES.response_match_col;
    return guess(headers, kind, memberColumn ?? undefined);
}

function describeConfig(guildId: string): string {
    const config = database.getConfig(guildId);
    const link = (id: string | null, tab: string | null) => id ? `[sheet](https://docs.google.com/spreadsheets/d/${id}) → \`${tab}\`` : "*not set*";
    const column = (value: string | null) => value ? `\`${value}\`` : "*not set*";
    return [
        `**Members:** ${link(config.members_sheet_id, config.members_tab)}`,
        `**Responses:** ${link(config.responses_sheet_id, config.responses_tab)}`,
        `**Match:** member ${column(config.member_match_col)} ↔ response ${column(config.response_match_col)}`,
        `**Name column:** ${column(config.member_name_col)}`,
        `**Discord column:** ${column(config.member_discord_col)}`,
        `**Form link:** ${config.form_url ?? "*not set*"}`,
        `**Deadline:** ${config.deadline ? `<t:${Math.floor(config.deadline / 1000)}:F>` : "*none*"}`,
        `**Timezone:** \`${config.timezone}\``,
        `**Admin role:** ${config.admin_role_id ? `<@&${config.admin_role_id}>` : "*Manage Server only*"}`,
        `**Command channels:** ${config.allowed_channels.length ? config.allowed_channels.map(id => `<#${id}>`).join(", ") : "*any*"}`
    ].join("\n");
}

const columnOption = (name: string, description: string, required = true) => ({
    name, description, required, type: ApplicationCommandOptionType.String as const, autocomplete: true
});

export default new Command({
    name: "setup",
    description: "Connect the bot to your Google Sheets and configure it.",
    category: "admin",
    adminOnly: true,
    anyChannel: true,
    options: [
        {
            name: "sheets",
            description: "Link the members sheet and the form responses sheet.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: "members", description: "Link to the members sheet (open the right tab first so the link has its gid)", type: ApplicationCommandOptionType.String, required: true },
                { name: "responses", description: "Link to the form's responses sheet", type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: "columns",
            description: "Pick which columns to compare and which hold names and Discord users.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                columnOption("member_match", "Members sheet column to match on (e.g. Email or Student ID)"),
                columnOption("response_match", "Responses sheet column holding the same value"),
                columnOption("member_name", "Members sheet column with the person's name"),
                columnOption("member_discord", "Members sheet column with a Discord user ID or username", false)
            ]
        },
        {
            name: "deadline",
            description: "Set the form deadline. Leave the date empty to clear it.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: "date", description: "YYYY-MM-DD", type: ApplicationCommandOptionType.String, required: false },
                { name: "time", description: "HH:mm, 24-hour (default 23:59)", type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: "timezone",
            description: "Timezone used for the deadline and reminder times.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "zone", description: "IANA timezone, e.g. Asia/Singapore or America/New_York", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }]
        },
        {
            name: "form",
            description: "Set the form link shown in reminders. Leave empty to clear it.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "link", description: "The Google Form link people should fill in", type: ApplicationCommandOptionType.String, required: false }]
        },
        {
            name: "admin-role",
            description: "Let a role use admin commands. Leave empty to only allow Manage Server.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "role", description: "The role", type: ApplicationCommandOptionType.Role, required: false }]
        },
        {
            name: "view",
            description: "Show the current setup and the email to share sheets with.",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    autocomplete: async ({ interaction }) => {
        const focused = interaction.options.getFocused(true);
        const query = focused.value.toLowerCase();
        let choices: string[] = [];
        if (focused.name === "zone") {
            choices = Intl.supportedValuesOf("timeZone");
        } else {
            const headers = await getHeaders(interaction.guildId).catch(() => ({ members: [], responses: [] }));
            choices = focused.name === "response_match" ? headers.responses : headers.members;
        }
        await interaction.respond(choices.filter(choice => choice.toLowerCase().includes(query)).slice(0, 25).map(choice => ({ name: choice.slice(0, 100), value: choice.slice(0, 100) })));
    },
    run: async ({ interaction, args }) => {
        const guildId = interaction.guildId;
        const subcommand = args.getSubcommand();

        if (subcommand === "view") {
            const email = sheets.serviceAccountEmail();
            return interaction.reply({
                embeds: [embed.create({
                    title: "Form tracker setup",
                    description: `${describeConfig(guildId)}\n\n**Share your sheets (Viewer) with:**\n\`${email ?? "credentials file missing - ask the bot owner"}\``
                })],
                flags: ["Ephemeral"]
            });
        }

        if (subcommand === "sheets") {
            await interaction.deferReply({ flags: ["Ephemeral"] });
            const members = sheets.parseUrl(args.getString("members", true));
            const responses = sheets.parseUrl(args.getString("responses", true));
            if (!members || !responses) return interaction.followUp({ embeds: [embed.error("Those don't look like Google Sheets links.")] });

            // Open each sheet separately so the error says which one the bot can't read
            const [membersResult, responsesResult] = await Promise.allSettled([sheets.resolveTab(members.id, members.gid), sheets.resolveTab(responses.id, responses.gid)]);
            const failures = [
                membersResult.status === "rejected" ? `**Members sheet:** ${sheets.describeError(membersResult.reason)}` : null,
                responsesResult.status === "rejected" ? `**Responses sheet:** ${sheets.describeError(responsesResult.reason)}` : null
            ].filter(Boolean);
            if (failures.length || membersResult.status === "rejected" || responsesResult.status === "rejected") {
                return interaction.followUp({ embeds: [embed.error(failures.join("\n\n"))] });
            }
            const [membersTab, responsesTab] = [membersResult.value, responsesResult.value];
            const [memberHeaders, responseHeaders] = await Promise.all([sheets.readHeaders(members.id, membersTab.title), sheets.readHeaders(responses.id, responsesTab.title)]);
            if (!memberHeaders.length || !responseHeaders.length) return interaction.followUp({ embeds: [embed.error("One of the sheets has an empty first row. The first row must hold the column headers.")] });

            const previous = database.getConfig(guildId);
            const memberMatch = guess(memberHeaders, GUESSES.member_match_col, previous.member_match_col);
            database.updateConfig(guildId, {
                members_sheet_id: members.id, members_tab: membersTab.title,
                responses_sheet_id: responses.id, responses_tab: responsesTab.title,
                member_name_col: guess(memberHeaders, GUESSES.member_name_col, previous.member_name_col),
                member_match_col: memberMatch,
                member_discord_col: guess(memberHeaders, GUESSES.member_discord_col, previous.member_discord_col),
                response_match_col: guessResponseColumn(responseHeaders, previous.response_match_col ?? memberMatch)
            });
            headerCache.delete(guildId);
            tracker.clearCache(guildId);

            const ready = !tracker.missingSetup(database.getConfig(guildId)).length;
            return interaction.followUp({
                embeds: [embed.create({
                    title: "Sheets linked",
                    description: [
                        `**Members:** ${membersTab.spreadsheetTitle} → \`${membersTab.title}\``,
                        `**Responses:** ${responsesTab.spreadsheetTitle} → \`${responsesTab.title}\``,
                        "",
                        describeConfig(guildId),
                        "",
                        ready ? "I guessed the columns above. Fix any with `/setup columns`, then try `/status`." : "I couldn't guess every column. Pick them with `/setup columns`."
                    ].join("\n")
                })]
            });
        }

        if (subcommand === "columns") {
            await interaction.deferReply({ flags: ["Ephemeral"] });
            const config = database.getConfig(guildId);
            if (!config.members_sheet_id) return interaction.followUp({ embeds: [embed.error("Link the sheets first with `/setup sheets`.")] });

            headerCache.delete(guildId);
            const headers = await getHeaders(guildId);
            const memberColumns = { member_match_col: args.getString("member_match", true), member_name_col: args.getString("member_name", true), member_discord_col: args.getString("member_discord") };
            const responseColumn = args.getString("response_match", true);
            const unknown = [
                ...Object.values(memberColumns).filter(column => column && !headers.members.includes(column)).map(column => `\`${column}\` isn't in the members sheet`),
                ...(headers.responses.includes(responseColumn) ? [] : [`\`${responseColumn}\` isn't in the responses sheet`])
            ];
            if (unknown.length) return interaction.followUp({ embeds: [embed.error(unknown.join("\n"))] });

            database.updateConfig(guildId, { ...memberColumns, response_match_col: responseColumn });
            tracker.clearCache(guildId);
            return interaction.followUp({ embeds: [embed.success(`Columns saved.\n\n${describeConfig(guildId)}`)] });
        }

        if (subcommand === "deadline") {
            const date = args.getString("date");
            if (!date) {
                database.updateConfig(guildId, { deadline: null });
                return interaction.reply({ embeds: [embed.success("Deadline cleared.")], flags: ["Ephemeral"] });
            }
            const config = database.getConfig(guildId);
            const deadline = DateTime.fromFormat(`${date} ${args.getString("time") ?? "23:59"}`, "yyyy-MM-dd HH:mm", { zone: config.timezone });
            if (!deadline.isValid) return interaction.reply({ embeds: [embed.error("Use `YYYY-MM-DD` for the date and `HH:mm` for the time.")], flags: ["Ephemeral"] });
            database.updateConfig(guildId, { deadline: deadline.toMillis() });
            return interaction.reply({ embeds: [embed.success(`Deadline set to <t:${Math.floor(deadline.toSeconds())}:F> (\`${config.timezone}\`). Reminders stop after it.`)], flags: ["Ephemeral"] });
        }

        if (subcommand === "timezone") {
            const zone = args.getString("zone", true);
            if (!IANAZone.isValidZone(zone)) return interaction.reply({ embeds: [embed.error(`\`${zone}\` isn't a valid timezone. Pick one from the list.`)], flags: ["Ephemeral"] });
            database.updateConfig(guildId, { timezone: zone });
            reminders.reschedule(guildId);
            return interaction.reply({ embeds: [embed.success(`Timezone set to \`${zone}\`. Reminder times now use it. An existing deadline keeps its exact moment.`)], flags: ["Ephemeral"] });
        }

        if (subcommand === "form") {
            const link = args.getString("link")?.trim() || null;
            if (link && !/^https?:\/\//.test(link)) return interaction.reply({ embeds: [embed.error("The form link should start with `https://`.")], flags: ["Ephemeral"] });
            database.updateConfig(guildId, { form_url: link });
            return interaction.reply({ embeds: [embed.success(link ? `Reminders will link to ${link}` : "Form link cleared.")], flags: ["Ephemeral"] });
        }

        if (subcommand === "admin-role") {
            const role = args.getRole("role");
            database.updateConfig(guildId, { admin_role_id: role?.id ?? null });
            return interaction.reply({ embeds: [embed.success(role ? `${role} can now use admin commands.` : "Only members with Manage Server can use admin commands now.")], flags: ["Ephemeral"] });
        }
    }
});

