import utils from "../../../utils/utils.js";
import { Command } from "../../../structures/Command.js";
import { CommandType } from "../../../typings/Command.js";
import { EmbedBuilder } from "discord.js";

export default new Command({
    name: "help",
    description: "Get a list of available commands.",
    category: "info",
    run: async ({ interaction, client }) => {
        await interaction.deferReply({ flags: utils.replyFlags() });
        const commandCategories = new Map<string, CommandType[]>();

        // Categorize the commands
        client.commands.forEach((command) => {
            const category = command.category || 'Uncategorized';
            const categoryCommands = commandCategories.get(category) || [];
            categoryCommands.push(command);
            commandCategories.set(category, categoryCommands);
        });

        // Generate the help message
        const embed = new EmbedBuilder()
            .setTitle('Command List')
            .setDescription('Here is a list of the available commands.')
            .setColor(client.config.messages.colors.default);

        commandCategories.forEach((commands, category) => {
            const commandList = commands.map((command) => `**\`/${command.name}:\`** ${command.description}`).join('\n');
            embed.addFields({ name: `__${category.toUpperCase()}__`, value: `${commandList}` });
        });

        await interaction.followUp({ embeds: [embed] });
    }
});