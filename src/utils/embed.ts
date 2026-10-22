import { EmbedBuilder } from "discord.js";
import { client } from "../index.js";

const embed = {
    info: (message: string) => {
        return new EmbedBuilder()
            .setColor(client.config.messages.colors.default)
            .setDescription(message);
    },
    success: (message: string) => {
        return new EmbedBuilder()
            .setColor(client.config.messages.colors.success)
            .setDescription(message);
    },
    warning: (message: string) => {
        return new EmbedBuilder()
            .setColor(client.config.messages.colors.warning)
            .setDescription(message);
    },
    error: (message: string) => {
        return new EmbedBuilder()
            .setColor(client.config.messages.colors.error)
            .setDescription(message);
    },
    create: function (
        options: {
            color?: string;
            title?: string;
            description?: string;
            fields?: { name: string; value: string; inline?: boolean; }[];
            timestamp?: boolean;
            footerText?: string;
            footerIcon?: string;
        }
    ): EmbedBuilder {
        const {
            color = client.config.messages.colors.default,
            title = '',
            description = '',
            fields = [],
            timestamp = false,
            footerText = '',
            footerIcon = ''
        } = options;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description);

        if (fields.length) embed.addFields(fields);

        if (timestamp) embed.setTimestamp();

        // discord.js rejects an empty iconURL, so only pass it when set
        if (footerText || footerIcon) embed.setFooter({ text: footerText || "​", iconURL: footerIcon || undefined });

        return embed;
    }
};

export default embed;

