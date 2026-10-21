# Typescript Discord Bot Template

A TypeScript starter for [discord.js](https://discord.js.org) v14 bots. It auto-loads slash commands, context menu commands, buttons, select menus, modals and events from folders, so adding a feature means adding a file.

## Requirements

- Node.js 22 or newer
- A Discord application and bot token from the [Developer Portal](https://discord.com/developers/applications)

## Setup

```bash
npm install
cp src/config/settings.example.yml src/config/settings.yml
```

Edit `src/config/settings.yml`:

- `bot_settings.token`: your bot token. **Never commit this file** (it is already in `.gitignore`).
- `bot_settings.guilds`: the servers to register commands in (name + guild ID).
- `bot_settings.register_commands`: set to `true` to register commands on startup.
- `bot_settings.global_commands`: `false` registers commands only to your `guilds` (development), `true` registers them globally (production). See [Command registration](#command-registration).

Then run:

```bash
npm run start:dev   # watch mode with tsx
npm start           # build to ./build and run
```

## Project layout

```
src/
  config/              settings.example.yml (copy to settings.yml)
  events/              one file per client event (clientReady, interactionCreate, ...)
  interactions/
    commands/          slash commands, subfolders are optional
    contextMenuCommands/
      user/            user context menu commands
      message/         message context menu commands
    buttons/           buttons, matched by customId
    selectMenus/       select menus, matched by customId
    modals/            modal submits, matched by customId
  structures/          Client and the classes each interaction file exports
  typings/             types for each interaction kind
  utils/               embeds, logger, error handling, helpers
```

## Adding a slash command

Create a file anywhere under `src/interactions/commands/`:

```ts
import { Command } from "../../structures/Command.js";
import utils from "../../utils/utils.js";

export default new Command({
    name: "hello",
    description: "Say hello.",
    category: "misc",
    run: async ({ interaction }) => {
        await interaction.reply({ content: `Hello ${interaction.user.username}!`, flags: utils.replyFlags() });
    }
});
```

Optional fields: `disabled`, `guilds` (limit to guild names from `settings.yml`) and `autocomplete`.

## Command registration

On startup (when `register_commands` is `true`), commands are routed like this:

| Command | `global_commands: false` | `global_commands: true` |
| --- | --- | --- |
| No `guilds` option | Every guild in `settings.yml` | Global |
| `guilds: ["dev"]` | Only those guilds | Only those guilds |

- Each target's command list is **overwritten**, so removed or disabled commands get deleted from Discord on the next registration.
- Guild lists are always re-sent, even when empty. So when you switch to global mode, the copies registered in your dev guild are cleared and don't show up twice.
- In guild mode the global list is left alone, so developing with the same bot doesn't wipe your production commands. If you use one bot for both, you'll see duplicates in your dev guild. A separate dev bot avoids this.
- Turn `register_commands` back off after registering. Commands stay registered in Discord, and Discord limits how many commands you can create per day.

## Buttons with values

A button's `customId` can carry values separated by `/`. For example, `example/123/abc` runs the `example` button with `values = ["123", "abc"]`.

## Intents

The client only requests the `Guilds` intent, which is all slash commands need. If your bot needs more, such as `GuildMessages` or `MessageContent`, add them in `src/structures/Client.ts`. Privileged intents must also be enabled in the Developer Portal.

## Author

Made by Aden. Connect with me on [LinkedIn](https://www.linkedin.com/in/adenyap).

## License

[MIT](LICENSE)
