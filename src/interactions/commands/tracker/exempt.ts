import { ApplicationCommandOptionType } from "discord.js";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import utils from "../../../utils/utils.js";
import database from "../../../services/database.js";
import tracker from "../../../services/tracker.js";
import { normalize } from "../../../services/matching.js";

export default new Command({
    name: "exempt",
    description: "Leave members out of the counts and reminders (e.g. people on leave).",
    category: "tracker",
    adminOnly: true,
    options: [
        {
            name: "add", description: "Exempt a member.", type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "member", description: "Name or match value from the members sheet", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }]
        },
        {
            name: "remove", description: "Stop exempting a member.", type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "member", description: "The exempt member", type: ApplicationCommandOptionType.String, required: true, autocomplete: true }]
        },
        { name: "list", description: "List exempt members.", type: ApplicationCommandOptionType.Subcommand }
    ],
    autocomplete: async ({ interaction, args }) => {
        const query = interaction.options.getFocused().toLowerCase();
        let choices: { name: string; value: string }[];
        if (args.getSubcommand() === "remove") {
            choices = database.getExemptions(interaction.guildId).map(exemption => ({ name: exemption.label ?? exemption.match_key, value: exemption.match_key }));
        } else {
            const status = await tracker.getStatus(interaction.guildId).catch(() => null);
            choices = (status?.members ?? []).map(member => ({ name: `${member.name} (${member.matchValue})`, value: member.key }));
        }
        await interaction.respond(choices
            .filter(choice => choice.name.toLowerCase().includes(query))
            .slice(0, 25)
            .map(choice => ({ name: choice.name.slice(0, 100), value: choice.value.slice(0, 100) })));
    },
    run: async ({ interaction, args }) => {
        const guildId = interaction.guildId;
        const subcommand = args.getSubcommand();

        if (subcommand === "list") {
            const exemptions = database.getExemptions(guildId);
            const lines = exemptions.map(exemption => `• ${exemption.label ?? exemption.match_key}`);
            return interaction.reply({ embeds: [embed.info(lines.length ? utils.chunkLines(lines, 4000)[0] : "Nobody is exempt.")], flags: utils.replyFlags() });
        }

        const key = normalize(args.getString("member", true));
        if (subcommand === "remove") {
            const removed = database.removeExemption(guildId, key);
            tracker.clearCache(guildId);
            return interaction.reply({ embeds: [removed ? embed.success("Exemption removed.") : embed.error("That member isn't exempt.")], flags: utils.replyFlags() });
        }

        const status = await tracker.getStatus(guildId);
        const member = [...status.members, ...status.exempt].find(entry => entry.key === key || normalize(entry.name) === key);
        if (!member) return interaction.reply({ embeds: [embed.error("No member matches that. Pick one from the list.")], flags: utils.replyFlags() });
        database.addExemption(guildId, member.key, `${member.name} (${member.matchValue})`);
        tracker.clearCache(guildId);
        return interaction.reply({ embeds: [embed.success(`**${member.name}** is now exempt.`)], flags: utils.replyFlags() });
    }
});
