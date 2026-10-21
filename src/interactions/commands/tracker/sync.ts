import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import utils from "../../../utils/utils.js";
import tracker from "../../../services/tracker.js";

export default new Command({
    name: "sync",
    description: "Re-read both sheets right now instead of waiting for the cache to expire.",
    category: "tracker",
    adminOnly: true,
    run: async ({ interaction }) => {
        await interaction.deferReply({ flags: utils.replyFlags() });
        const status = await tracker.getStatus(interaction.guildId, true);
        await interaction.followUp({ embeds: [embed.success(`Synced. **${status.submitted.length}/${status.members.length}** submitted, **${status.missing.length}** to go.`)] });
    }
});
