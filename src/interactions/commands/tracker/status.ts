import { ApplicationCommandOptionType } from "discord.js";
import utils from "../../../utils/utils.js";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import database from "../../../services/database.js";
import tracker from "../../../services/tracker.js";

export default new Command({
    name: "status",
    description: "See how many members have filled out the form.",
    category: "tracker",
    options: [{ name: "refresh", description: "Re-read the sheets instead of using the last sync", type: ApplicationCommandOptionType.Boolean, required: false }],
    run: async ({ interaction, args }) => {
        await interaction.deferReply({ flags: utils.replyFlags() });
        const config = database.getConfig(interaction.guildId);
        const status = await tracker.getStatus(interaction.guildId, args.getBoolean("refresh") ?? false);
        const total = status.members.length;
        const reminder = database.getReminder(interaction.guildId);

        const fields = [
            { name: "✅ Submitted", value: `${status.submitted.length}`, inline: true },
            { name: "⏳ Not yet", value: `${status.missing.length}`, inline: true },
            { name: "👥 Total", value: `${total}`, inline: true }
        ];
        if (status.exempt.length) fields.push({ name: "Exempt", value: `${status.exempt.length}`, inline: true });
        if (status.unmatched.length) fields.push({ name: "Unmatched responses", value: `${status.unmatched.length} (see \`/unmatched\`)`, inline: true });
        if (config.deadline) fields.push({ name: "Deadline", value: `<t:${Math.floor(config.deadline / 1000)}:F> (<t:${Math.floor(config.deadline / 1000)}:R>)`, inline: false });
        if (reminder) fields.push({ name: "Next reminder", value: reminder.enabled ? `<t:${Math.floor(reminder.next_run / 1000)}:F>` : "Paused", inline: false });

        await interaction.followUp({
            embeds: [embed.create({
                title: "📋 Form status",
                description: `${utils.progressBar(status.submitted.length, total)}${config.form_url ? `\n\n**[Open the form](${config.form_url})**` : ""}\n\nLast synced <t:${Math.floor(status.fetchedAt / 1000)}:R>`,
                fields
            })]
        });
    }
});
