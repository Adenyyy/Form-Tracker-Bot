import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import utils from "../../../utils/utils.js";
import tracker from "../../../services/tracker.js";

export default new Command({
    name: "unmatched",
    description: "Show form responses that don't match any member (typos, non-members) and duplicate member rows.",
    category: "tracker",
    adminOnly: true,
    run: async ({ interaction }) => {
        await interaction.deferReply({ flags: utils.replyFlags() });
        const status = await tracker.getStatus(interaction.guildId);

        if (!status.unmatched.length && !status.duplicateKeys.length) {
            return interaction.followUp({ embeds: [embed.success("Every response matches a member, and there are no duplicate member rows.")] });
        }
        const fields = [];
        if (status.unmatched.length) {
            const chunks = utils.chunkLines(status.unmatched.map(value => `\`${value}\``), 1000);
            fields.push({ name: `Responses with no matching member (${status.unmatched.length})`, value: chunks[0] + (chunks.length > 1 ? "\n…" : "") });
        }
        if (status.duplicateKeys.length) {
            const chunks = utils.chunkLines(status.duplicateKeys.map(value => `\`${value}\``), 1000);
            fields.push({ name: `Duplicate member rows (only the first is used) (${status.duplicateKeys.length})`, value: chunks[0] + (chunks.length > 1 ? "\n…" : "") });
        }
        await interaction.followUp({
            embeds: [embed.create({
                title: "🔍 Unmatched entries",
                description: "Usually a typo in the form or the members sheet. Matching ignores case and spaces.",
                fields
            })]
        });
    }
});
