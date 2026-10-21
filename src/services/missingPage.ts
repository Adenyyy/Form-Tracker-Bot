import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Guild } from "discord.js";
import tracker from "./tracker.js";
import embed from "../utils/embed.js";

const PAGE_SIZE = 20;

// Builds one page of the /missing list, shared by the command and its page buttons
export async function buildMissingPage(guild: Guild, page: number) {
    const status = await tracker.getStatus(guild.id);
    const pages = Math.max(1, Math.ceil(status.missing.length / PAGE_SIZE));
    const current = Math.min(Math.max(page, 0), pages - 1);
    const slice = status.missing.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    const resolved = await tracker.resolveMembers(guild, slice);

    const lines = resolved.map(({ member, userId }, i) =>
        `\`${current * PAGE_SIZE + i + 1}.\` **${member.name}** ${userId ? `<@${userId}>` : member.discord ? `(${member.discord} - not found)` : "(no Discord)"}`
    );
    const missingEmbed = embed.create({
        title: `⏳ Not submitted yet (${status.missing.length}/${status.members.length})`,
        description: lines.length ? lines.join("\n") : "🎉 Everyone has submitted!",
        footerText: `Page ${current + 1}/${pages}`
    });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`missing/${current - 1}`).setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(current === 0),
        new ButtonBuilder().setCustomId(`missing/${current + 1}`).setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(current >= pages - 1)
    );
    return { embeds: [missingEmbed], components: pages > 1 ? [row] : [], allowedMentions: { users: [] as string[] } };
}
