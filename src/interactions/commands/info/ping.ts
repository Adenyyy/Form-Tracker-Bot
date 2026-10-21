import utils from "../../../utils/utils.js";
import { Command } from "../../../structures/Command.js";
import embed from "../../../utils/embed.js";

export default new Command({
    name: "ping",
    description: "Check the bot\\'s latency and Discord API latency.",
    category: "info",
    disabled: false,
    run: async ({ interaction, client }) => {
        await interaction.deferReply({ flags: utils.replyFlags() });

        const botLatency: number = Date.now() - interaction.createdTimestamp;
        const apiLatency: number = Math.round(client.ws.ping);
        await interaction.followUp({ embeds: [embed.info(`Bot Latency: \`${botLatency}ms\`\nAPI Latency is \`${apiLatency}ms\``)] });
    }
});
