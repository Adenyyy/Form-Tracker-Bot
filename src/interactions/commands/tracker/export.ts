import { ApplicationCommandOptionType, AttachmentBuilder, MessageFlags } from "discord.js";
import { Command } from "../../../structures/Command.js";
import tracker from "../../../services/tracker.js";
import { Member } from "../../../services/matching.js";

function csvCell(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default new Command({
    name: "export",
    description: "Download a CSV of who has or hasn't filled out the form.",
    category: "tracker",
    adminOnly: true,
    options: [{
        name: "who", description: "Which members to include (default: not submitted)", type: ApplicationCommandOptionType.String, required: false,
        choices: [{ name: "Not submitted", value: "missing" }, { name: "Submitted", value: "submitted" }, { name: "Everyone", value: "all" }]
    }],
    run: async ({ interaction, args }) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const who = args.getString("who") ?? "missing";
        const status = await tracker.getStatus(interaction.guildId, true);

        const rows: [Member, string][] = [
            ...(who !== "missing" ? status.submitted.map(member => [member, "submitted"] as [Member, string]) : []),
            ...(who !== "submitted" ? status.missing.map(member => [member, "not submitted"] as [Member, string]) : []),
            ...(who === "all" ? status.exempt.map(member => [member, "exempt"] as [Member, string]) : [])
        ];
        const csv = [["Name", "Match value", "Discord", "Status"], ...rows.map(([member, state]) => [member.name, member.matchValue, member.discord, state])]
            .map(row => row.map(csvCell).join(","))
            .join("\n");

        await interaction.followUp({
            content: `${rows.length} member${rows.length === 1 ? "" : "s"}.`,
            files: [new AttachmentBuilder(Buffer.from(csv, "utf8"), { name: `form-${who}-${new Date().toISOString().slice(0, 10)}.csv` })]
        });
    }
});
