import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import { DateTime } from "luxon";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import database, { Reminder } from "../../../services/database.js";
import reminders from "../../../services/reminders.js";

function describe(reminder: Reminder, timezone: string): string {
    return [
        `**Status:** ${reminder.enabled ? "Active" : "Paused"}`,
        `**Schedule:** every ${reminder.interval_days === 1 ? "day" : `${reminder.interval_days} days`} at \`${reminder.time}\` (\`${timezone}\`)`,
        `**Next:** ${reminder.enabled ? `<t:${Math.floor(reminder.next_run / 1000)}:F> (<t:${Math.floor(reminder.next_run / 1000)}:R>)` : "-"}`,
        `**Where:** ${reminder.mode === "dm" ? `DMs (summary in <#${reminder.channel_id}>)` : `<#${reminder.channel_id}>`}`,
        `**Message:** ${reminder.message ?? "*default*"}`
    ].join("\n");
}

export default new Command({
    name: "reminder",
    description: "Schedule automatic reminders for people who haven't filled out the form.",
    category: "reminders",
    adminOnly: true,
    options: [
        {
            name: "set", description: "Create or replace the reminder schedule.", type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: "channel", description: "Channel to ping in (or post the DM summary in)", type: ApplicationCommandOptionType.Channel, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread], required: true },
                { name: "every_days", description: "Days between reminders (1 = daily, 2 = every other day)", type: ApplicationCommandOptionType.Integer, minValue: 1, maxValue: 60, required: true },
                { name: "time", description: "Time of day, e.g. 12:00, 18:30 or 12pm (uses /setup timezone)", type: ApplicationCommandOptionType.String, required: true },
                { name: "start_date", description: "First reminder date, YYYY-MM-DD (default: the next time that comes up)", type: ApplicationCommandOptionType.String, required: false },
                { name: "mode", description: "Ping in the channel or DM each person", type: ApplicationCommandOptionType.String, required: false, choices: [{ name: "Ping in channel", value: "channel" }, { name: "DM each person", value: "dm" }] },
                { name: "message", description: "Custom reminder text", type: ApplicationCommandOptionType.String, required: false, maxLength: 1000 }
            ]
        },
        { name: "view", description: "Show the reminder schedule.", type: ApplicationCommandOptionType.Subcommand },
        { name: "pause", description: "Pause scheduled reminders.", type: ApplicationCommandOptionType.Subcommand },
        { name: "resume", description: "Resume scheduled reminders.", type: ApplicationCommandOptionType.Subcommand },
        { name: "delete", description: "Delete the reminder schedule.", type: ApplicationCommandOptionType.Subcommand }
    ],
    run: async ({ interaction, args }) => {
        const guildId = interaction.guildId;
        const { timezone, deadline } = database.getConfig(guildId);
        const subcommand = args.getSubcommand();
        const existing = database.getReminder(guildId);
        const reply = (message: ReturnType<typeof embed.info>) => interaction.reply({ embeds: [message], flags: ["Ephemeral"] });

        if (subcommand === "set") {
            const time = reminders.parseTime(args.getString("time", true));
            if (!time) return reply(embed.error("Use a time like `12:00`, `18:30` or `12pm`."));

            const startInput = args.getString("start_date");
            const now = DateTime.now().setZone(timezone);
            const start = startInput ? DateTime.fromFormat(startInput, "yyyy-MM-dd", { zone: timezone }) : now;
            if (!start.isValid) return reply(embed.error("Use `YYYY-MM-DD` for the start date."));

            const reminder: Reminder = {
                guild_id: guildId,
                channel_id: args.getChannel("channel", true).id,
                mode: (args.getString("mode") ?? "channel") as "channel" | "dm",
                interval_days: args.getInteger("every_days", true),
                time,
                // Without a start date the first reminder is the next time 'time' comes round, not a full interval away
                next_run: reminders.nextRun(start, time, startInput ? args.getInteger("every_days", true) : 1, now).toMillis(),
                message: args.getString("message"),
                enabled: true
            };
            database.saveReminder(reminder);
            const warning = deadline && reminder.next_run > deadline ? "\n\n⚠️ The first reminder is after the deadline, so it won't be sent." : "";
            return reply(embed.success(`Reminder scheduled.\n\n${describe(reminder, timezone)}${warning}`));
        }

        if (!existing) return reply(embed.error("There's no reminder yet. Create one with `/reminder set`."));

        if (subcommand === "view") return reply(embed.info(describe(existing, timezone)));

        if (subcommand === "pause") {
            database.saveReminder({ ...existing, enabled: false });
            return reply(embed.success("Reminders paused."));
        }

        if (subcommand === "resume") {
            // Skip any runs that were missed while paused
            const from = DateTime.fromMillis(existing.next_run, { zone: timezone });
            const resumed = { ...existing, enabled: true, next_run: reminders.nextRun(from, existing.time, existing.interval_days).toMillis() };
            database.saveReminder(resumed);
            const warning = deadline && Date.now() > deadline ? "\n\n⚠️ The deadline has passed, so reminders will pause again. Change it with `/setup deadline`." : "";
            return reply(embed.success(`Reminders resumed.\n\n${describe(resumed, timezone)}${warning}`));
        }

        if (subcommand === "delete") {
            database.deleteReminder(guildId);
            return reply(embed.success("Reminder schedule deleted."));
        }
    }
});
