import { AnySelectMenuInteraction, CommandInteractionOptionResolver, Events } from "discord.js";
import { client } from "../index.js";
import { Event } from "../structures/Event.js";
import { AutoCompleteExtendedInteraction, ExtendedInteraction } from "../typings/Command.js";
import { sendErrorMessage, sendInfoMessage } from "../utils/logger.js";
import embed from '../utils/embed.js';
import utils from "../utils/utils.js";
import { UserExtendedInteraction } from "../typings/UserCommand.js";
import { MessageExtendedInteraction } from "../typings/MessageCommand.js";
import { ButtonExtendedInteraction } from "../typings/Button.js";
import { ModalSubmitExtendedInteraction } from "../typings/Modal.js";

export default new Event(Events.InteractionCreate, async (interaction) => {

    // Chat Input Commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return interaction.reply({ embeds: [embed.error("You have used a command that does not exist.")], flags: utils.replyFlags() });

        try {
            await command.run({
                args: interaction.options as CommandInteractionOptionResolver,
                client,
                interaction: interaction as ExtendedInteraction
            });
            sendInfoMessage(`( Chat Input ) - @${interaction.user.username} ran the command: ${command.name}`);
        } catch (e) {
            sendErrorMessage(`Error while trying to run command: ${command.name}`, e);
        }
    }

    // User Context Menu Commands
    if (interaction.isUserContextMenuCommand()) {
        const command = client.userCommands.get(interaction.commandName);
        if (!command) return interaction.reply({ embeds: [embed.error("You have used a command that does not exist.")], flags: utils.replyFlags() });

        try {
            await command.run({
                client,
                interaction: interaction as UserExtendedInteraction
            });
            sendInfoMessage(`( User ) - @${interaction.user.username} ran the command: ${command.name}`);
        } catch (e) {
            sendErrorMessage(`Error while trying to run command: ${command.name}`, e);
        }
    }

    // Message Context Menu Commands
    if (interaction.isMessageContextMenuCommand()) {
        const command = client.messageCommands.get(interaction.commandName);
        if (!command)
            return interaction.reply({ embeds: [embed.error("You have used a command that does not exist.")], flags: utils.replyFlags() });

        try {
            await command.run({
                client,
                interaction: interaction as MessageExtendedInteraction
            });
            sendInfoMessage(`( Message ) - @${interaction.user.username} ran the command: ${command.name}`);
        } catch (e) {
            sendErrorMessage(`Error while trying to run command: ${command.name}`, e);
        }
    }

    // Select Menus
    if (interaction.isAnySelectMenu()) {

        const selectMenu = client.selectMenus.get(interaction.customId);
        if (!selectMenu)
            return interaction.reply({ embeds: [embed.error("You have used a select menu that does not exist.")], flags: utils.replyFlags() });

        try {
            await selectMenu.run({
                client,
                interaction: interaction as AnySelectMenuInteraction
            });
            sendInfoMessage(`@${interaction.user.username} used the select menu: ${selectMenu.name}`);
        } catch (e) {
            sendErrorMessage(`Error while trying to run select menu: ${selectMenu.name}`, e);
        }
    }


    // Button Click - customId format is "name" or "name/value1/value2"
    if (interaction.isButton()) {
        const [name, ...values] = interaction.customId.split("/");
        const button = client.buttons.get(name);
        if (!button)
            return interaction.reply({ embeds: [embed.error("You have clicked a button that does not exist.")], flags: utils.replyFlags() });

        try {
            await button.run({
                client,
                interaction: interaction as ButtonExtendedInteraction,
                values,
            });
            sendInfoMessage(`@${interaction.user.username} clicked the button: ${button.name}${values.length ? ` [Values: ${values.join(", ")}]` : ""}`);
        } catch (e) {
            sendErrorMessage(`Error while trying to run button: ${button.name}`, e);
        }
    }

    // Modal Submits
    if (interaction.isModalSubmit()) {
        const modal = client.modals.get(interaction.customId);
        if (!modal)
            return interaction.reply({ embeds: [embed.error("You have used a modal that does not exist.")], flags: utils.replyFlags() });

        try {
            await modal.run({
                client,
                interaction: interaction as ModalSubmitExtendedInteraction
            });
            sendInfoMessage(`@${interaction.user.username} submitted the modal: ${modal.name}`);
        } catch (e) {
            sendErrorMessage(`Error while trying to submit the modal: ${modal.name}`, e);
        }
    }

    // Auto Completion
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command?.autocomplete) {
            sendErrorMessage(`No autocomplete handler matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.autocomplete({
                args: interaction.options as CommandInteractionOptionResolver,
                client,
                interaction: interaction as AutoCompleteExtendedInteraction
            });
        } catch (e) {
            sendErrorMessage(`Error while trying to autocomplete command: ${command.name}`, e);
        }
    }
});
