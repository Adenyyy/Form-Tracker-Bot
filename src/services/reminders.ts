import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild, SendableChannels } from "discord.js";
import { DateTime } from "luxon";
import { client } from "../index.js";
import { nextRun, parseTime } from "./schedule.js";
import database, { Reminder } from "./database.js";
import tracker from "./tracker.js";
import embed from "../utils/embed.js";
import utils from "../utils/utils.js";
import { sendErrorMessage, sendInfoMessage } from "../utils/logger.js";

export interface ReminderResult {
    missing: number;
    pinged: number;
    notOnDiscord: string[]; // names with no Discord value we could resolve
    dmFailed: string[];
}

const CHECK_INTERVAL_MS = 60 * 1000;
const MISSED_RUN_GRACE_MS = 60 * 60 * 1000;

const reminders = {

    parseTime,
    nextRun,

    // Keeps the next run's date but moves it onto the guild's current timezone and time
    reschedule(guildId: string) {
        const reminder = database.getReminder(guildId);
        if (!reminder) return;
        const { timezone } = database.getConfig(guildId);
        const from = DateTime.fromMillis(reminder.next_run, { zone: timezone });
        reminder.next_run = reminders.nextRun(from, reminder.time, reminder.interval_days).toMillis();
        database.saveReminder(reminder);
    },

    async send(guild: Guild, channelId: string, mode: "channel" | "dm", customMessage: string | null): Promise<ReminderResult> {
        const config = database.getConfig(guild.id);
        const status = await tracker.getStatus(guild.id, true);
        const result: ReminderResult = { missing: status.missing.length, pinged: 0, notOnDiscord: [], dmFailed: [] };
        if (!status.missing.length) return result;

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (mode === "channel" && !channel?.isSendable()) throw new Error(`I can't send messages in <#${channelId}>.`);

        const resolved = await tracker.resolveMembers(guild, status.missing);
        const userIds = resolved.filter(entry => entry.userId).map(entry => entry.userId);
        result.notOnDiscord = resolved.filter(entry => !entry.userId).map(entry => entry.member.name);

        const lines = [
            customMessage ?? "You haven't filled out the form yet. Please take a minute to do it!",
            config.form_url ? `\n**[Open the form](${config.form_url})**` : "",
            config.deadline ? `\n**Deadline:** <t:${Math.floor(config.deadline / 1000)}:F> (<t:${Math.floor(config.deadline / 1000)}:R>)` : "",
            `\n**Progress:** ${status.submitted.length}/${status.members.length} submitted\n${utils.progressBar(status.submitted.length, status.members.length)}`
        ];
        const reminderEmbed = embed.create({ title: "📋 Form reminder", description: lines.join(""), timestamp: true });
        const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`submitted/${guild.id}`).setLabel("I've submitted").setStyle(ButtonStyle.Success)
        );

        if (mode === "channel") {
            const sendable = channel as SendableChannels;
            const chunks = utils.chunkLines(userIds.map(id => `<@${id}>`), 1900);
            await sendable.send({ content: chunks[0] ?? "", embeds: [reminderEmbed], components: [buttons], allowedMentions: { users: userIds } });
            for (const chunk of chunks.slice(1)) {
                await sendable.send({ content: chunk, allowedMentions: { users: chunk.match(/\d{17,20}/g) ?? [] } });
            }
            result.pinged = userIds.length;
        } else {
            reminderEmbed.setFooter({ text: guild.name, iconURL: guild.iconURL() ?? undefined });
            for (const entry of resolved.filter(entry => entry.userId)) {
                try {
                    const user = await client.users.fetch(entry.userId);
                    await user.send({ embeds: [reminderEmbed], components: [buttons] });
                    result.pinged++;
                } catch {
                    result.dmFailed.push(entry.member.name);
                }
                await new Promise(resolve => setTimeout(resolve, 1000)); // stay well under DM rate limits
            }
            if (channel?.isSendable()) {
                const notes = [
                    `📋 Sent reminder DMs to **${result.pinged}** of **${result.missing}** people who haven't submitted.`,
                    result.dmFailed.length ? `**DMs closed:** ${result.dmFailed.join(", ")}` : "",
                    result.notOnDiscord.length ? `**Not found on Discord:** ${result.notOnDiscord.join(", ")}` : ""
                ].filter(Boolean);
                await channel.send({ embeds: [embed.info(utils.chunkLines(notes, 4000)[0])] });
            }
        }
        return result;
    },

    async runDue() {
        const now = Date.now();
        for (const reminder of database.getDueReminders(now)) {
            const scheduledFor = reminder.next_run;
            const config = database.getConfig(reminder.guild_id);
            // Move next_run forward before sending so a crash mid-send can't cause a double ping
            const from = DateTime.fromMillis(reminder.next_run, { zone: config.timezone });
            reminder.next_run = reminders.nextRun(from, reminder.time, reminder.interval_days).toMillis();
            database.saveReminder(reminder);

            // Skip runs missed while the bot was offline instead of pinging people at odd hours
            if (now - scheduledFor > MISSED_RUN_GRACE_MS) continue;
            const guild = client.guilds.cache.get(reminder.guild_id);
            if (!guild) continue;
            const channel = await guild.channels.fetch(reminder.channel_id).catch(() => null);

            try {
                if (config.deadline && now > config.deadline) {
                    reminders.disable(reminder);
                    if (channel?.isSendable()) await channel.send({ embeds: [embed.warning("The form deadline has passed, so scheduled reminders are now paused. Use `/reminder resume` to restart them.")] });
                    continue;
                }
                const result = await reminders.send(guild, reminder.channel_id, reminder.mode, reminder.message);
                if (result.missing === 0) {
                    reminders.disable(reminder);
                    if (channel?.isSendable()) await channel.send({ embeds: [embed.success("🎉 Everyone has submitted the form! Scheduled reminders are now paused.")] });
                }
                sendInfoMessage(`Sent scheduled reminder in ${guild.name}: ${result.pinged}/${result.missing} pinged`);
            } catch (e) {
                sendErrorMessage(`Scheduled reminder failed in ${guild.name}`, e);
                if (channel?.isSendable()) await channel.send({ embeds: [embed.error(`The scheduled reminder failed: ${e?.message ?? e}`)] }).catch(() => { });
            }
        }
    },

    disable(reminder: Reminder) {
        database.saveReminder({ ...reminder, enabled: false });
    },

    startScheduler() {
        setInterval(() => reminders.runDue().catch(e => sendErrorMessage("Reminder scheduler error", e)), CHECK_INTERVAL_MS);
        reminders.runDue().catch(e => sendErrorMessage("Reminder scheduler error", e));
    }

};

export default reminders;
