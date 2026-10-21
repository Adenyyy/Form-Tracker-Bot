import { MessageFlags } from "discord.js";
import { Button } from "../../structures/Button.js";
import embed from "../../utils/embed.js";
import utils from "../../utils/utils.js";
import database from "../../services/database.js";
import { buildMissingPage } from "../../services/missingPage.js";

// customId: missing/<page>
export default new Button({
    name: "missing",
    run: async ({ interaction, values }) => {
        if (!utils.isAdmin(interaction.member, database.getConfig(interaction.guildId))) {
            return interaction.reply({ embeds: [embed.error("Only server admins can page through this list.")], flags: MessageFlags.Ephemeral });
        }
        await interaction.deferUpdate();
        await interaction.editReply(await buildMissingPage(interaction.guild, Number(values?.[0] ?? 0)));
    }
});
