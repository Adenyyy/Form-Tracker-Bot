import utils from "../../../utils/utils.js";
import { Command } from "../../../structures/Command.js";
import { buildMissingPage } from "../../../services/missingPage.js";

export default new Command({
    name: "missing",
    description: "List the members who haven't filled out the form (doesn't ping them).",
    category: "tracker",
    adminOnly: true,
    run: async ({ interaction }) => {
        await interaction.deferReply({ flags: utils.replyFlags() });
        await interaction.followUp(await buildMissingPage(interaction.guild, 0));
    }
});
