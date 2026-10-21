import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import reminders from "../../../services/reminders.js";

export default new Command({
    name: "remind",
    description: "Ping everyone who hasn't filled out the form, right now.",
    category: "reminders",
    adminOnly: true,
    options: [
        { name: "channel", description: "Where to ping (default: this channel)", type: ApplicationCommandOptionType.Channel, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread], required: false },
        { name: "mode", description: "Ping in the channel or DM each person", type: ApplicationCommandOptionType.String, required: false, choices: [{ name: "Ping in channel", value: "channel" }, { name: "DM each person", value: "dm" }] },
        { name: "message", description: "Custom reminder text", type: ApplicationCommandOptionType.String, required: false, maxLength: 1000 }
    ],
    run: async ({ interaction, args }) => {
        await interaction.deferReply({ flags: ["Ephemeral"] });
        const channelId = args.getChannel("channel")?.id ?? interaction.channelId;
        const mode = (args.getString("mode") ?? "channel") as "channel" | "dm";

        const result = await reminders.send(interaction.guild, channelId, mode, args.getString("message"));
        if (!result.missing) return interaction.followUp({ embeds: [embed.success("🎉 Everyone has already submitted. Nobody to remind!")] });

        const notes = [
            `Reminded **${result.pinged}** of **${result.missing}** people who haven't submitted.`,
            result.notOnDiscord.length ? `\n**Couldn't find on Discord:** ${result.notOnDiscord.join(", ")}` : "",
            result.dmFailed.length ? `\n**DMs closed:** ${result.dmFailed.join(", ")}` : ""
        ].join("");
        await interaction.followUp({ embeds: [embed.success(notes.slice(0, 4000))] });
    }
});
