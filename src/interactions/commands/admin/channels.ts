import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";
import database from "../../../services/database.js";

export default new Command({
    name: "channels",
    description: "Limit which channels members can use the bot's commands in (admins can use them anywhere).",
    category: "admin",
    adminOnly: true,
    anyChannel: true,
    options: [
        {
            name: "add", description: "Allow commands in a channel.", type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "channel", description: "The channel", type: ApplicationCommandOptionType.Channel, channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread], required: true }]
        },
        {
            name: "remove", description: "Stop allowing commands in a channel.", type: ApplicationCommandOptionType.Subcommand,
            options: [{ name: "channel", description: "The channel", type: ApplicationCommandOptionType.Channel, required: true }]
        },
        { name: "list", description: "Show the allowed channels.", type: ApplicationCommandOptionType.Subcommand },
        { name: "clear", description: "Allow commands in every channel again.", type: ApplicationCommandOptionType.Subcommand }
    ],
    run: async ({ interaction, args }) => {
        const guildId = interaction.guildId;
        const config = database.getConfig(guildId);
        const subcommand = args.getSubcommand();
        let allowed = config.allowed_channels;

        if (subcommand === "add") allowed = [...new Set([...allowed, args.getChannel("channel", true).id])];
        if (subcommand === "remove") allowed = allowed.filter(id => id !== args.getChannel("channel", true).id);
        if (subcommand === "clear") allowed = [];
        if (subcommand !== "list") database.updateConfig(guildId, { allowed_channels: allowed });

        await interaction.reply({
            embeds: [embed.info(allowed.length ? `Members can use commands in: ${allowed.map(id => `<#${id}>`).join(", ")}` : "Members can use commands in any channel.")],
            flags: ["Ephemeral"]
        });
    }
});
