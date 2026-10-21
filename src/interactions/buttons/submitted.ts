import { MessageFlags } from "discord.js";
import { Button } from "../../structures/Button.js";
import embed from "../../utils/embed.js";
import tracker from "../../services/tracker.js";

const REFRESH_AFTER_MS = 15 * 1000;

// customId: submitted/<guildId> - on reminder messages and DMs, re-checks only the person who clicked
export default new Button({
    name: "submitted",
    run: async ({ interaction, values }) => {
        const guildId = values?.[0] ?? interaction.guildId;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Many people click at once after a ping, so re-read the sheets at most every few seconds
        let status = await tracker.getStatus(guildId);
        if (Date.now() - status.fetchedAt > REFRESH_AFTER_MS) status = await tracker.getStatus(guildId, true);

        const member = tracker.findMemberByUser([...status.members, ...status.exempt], interaction.user);
        if (!member) return interaction.followUp({ embeds: [embed.warning("I couldn't find your Discord account in the members sheet. Ask an admin to check your row.")] });
        if (status.exempt.includes(member)) return interaction.followUp({ embeds: [embed.info("You're exempt from this form, no need to fill it out.")] });
        if (status.submitted.includes(member)) return interaction.followUp({ embeds: [embed.success("✅ Got it, your response is recorded. Thanks!")] });
        return interaction.followUp({ embeds: [embed.warning(`I can't see a response for **${member.matchValue}** yet. Make sure you used that exact value in the form. It can take a minute to show up.`)] });
    }
});
