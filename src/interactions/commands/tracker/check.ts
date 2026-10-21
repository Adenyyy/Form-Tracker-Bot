import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import utils from "../../../utils/utils.js";
import database from "../../../services/database.js";
import tracker from "../../../services/tracker.js";

export default new Command({
    name: "check",
    description: "Check whether you (or, for admins, someone else) filled out the form.",
    category: "tracker",
    options: [{ name: "user", description: "Who to check (admins only)", type: ApplicationCommandOptionType.User, required: false }],
    run: async ({ interaction, args }) => {
        const user = args.getUser("user") ?? interaction.user;
        if (user.id !== interaction.user.id && !utils.isAdmin(interaction.member, database.getConfig(interaction.guildId))) {
            return interaction.reply({ embeds: [embed.error("You can only check yourself.")], flags: MessageFlags.Ephemeral });
        }
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const status = await tracker.getStatus(interaction.guildId);
        const member = tracker.findMemberByUser([...status.members, ...status.exempt], user);
        const who = user.id === interaction.user.id ? "You" : `${user}`;
        if (!member) return interaction.followUp({ embeds: [embed.warning(`${who} ${user.id === interaction.user.id ? "aren't" : "isn't"} in the members sheet (matched by Discord ID or username).`)] });
        if (status.exempt.includes(member)) return interaction.followUp({ embeds: [embed.info(`**${member.name}** is exempt from this form.`)] });
        if (status.submitted.includes(member)) return interaction.followUp({ embeds: [embed.success(`✅ **${member.name}** has submitted the form.`)] });
        return interaction.followUp({ embeds: [embed.warning(`⏳ **${member.name}** hasn't submitted yet (looking for \`${member.matchValue}\` in the responses).`)] });
    }
});
