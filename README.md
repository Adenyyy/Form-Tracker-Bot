# Form Tracker Bot

A Discord bot that tracks who has filled out a Google Form. It compares the form's responses sheet against your members sheet and tells you who hasn't submitted yet. It can also remind those people on a schedule, like "every 2 days at 12pm".

It works for any club, team or society. Each Discord server sets up its own sheets with `/setup`, and one bot can serve many servers.

Built on [Typescript-Discord-Bot-Template](https://github.com/Adenyyy/Typescript-Discord-Bot-Template) (discord.js v14).

## How it works

```
Google Form ──► Responses sheet ─┐
                                 ├──► bot matches on Email / Student ID / any column ──► /status, /missing, reminders
Members sheet (name, email, discord) ─┘
```

- The bot reads both sheets through the Google Sheets API using a **service account**. This is a Google "robot account" with its own email address. To give the bot access, you share a sheet with that email, just like sharing with a person. Your sheets stay private.
- You choose which columns to match on (for example `Email` in the members sheet ↔ `Email Address` in the responses sheet). Matching ignores case and spaces.
- The Discord column can hold a **user ID** (most reliable) or a **username**.

## Commands

| Command | Who | What it does |
| --- | --- | --- |
| `/status` | Everyone | Submitted vs total, a progress bar, the deadline and the next reminder |
| `/check [user]` | Everyone (others: admins) | Whether you (or someone else) has submitted |
| `/missing` | Admins | Paged list of who hasn't submitted (no pings) |
| `/unmatched` | Admins | Responses that match no member (typos) and duplicate member rows |
| `/export [who]` | Admins | CSV of not submitted / submitted / everyone |
| `/sync` | Admins | Re-read the sheets now instead of waiting for the cache |
| `/remind [channel] [mode] [message]` | Admins | Ping everyone who hasn't submitted, right now |
| `/reminder set\|view\|pause\|resume\|delete` | Admins | Schedule reminders, e.g. every 2 days at 12pm |
| `/exempt add\|remove\|list` | Admins | Leave people out of counts and reminders |
| `/setup sheets\|columns\|form\|deadline\|timezone\|admin-role\|view` | Admins | Connect the sheets and configure the bot |
| `/channels add\|remove\|list\|clear` | Admins | Limit which channels members can use commands in |

"Admins" means members with **Manage Server**, or the role set with `/setup admin-role`.

Reminders show an **"I've submitted"** button. It re-checks only the person who clicks it. Reminders pause on their own once everyone has submitted or the deadline passes. If the bot was offline when a reminder was due, it skips that run instead of pinging at an odd hour.

## Using the bot in your server

If someone already hosts the bot for you, you only need this part.

1. **Link the form to a sheet.** In Google Forms, go to **Responses → Link to Sheets**.
2. **Make sure the form asks for the match value**, such as email or student ID. Turning on "Collect email addresses" works too.
3. **Members sheet:** the first row must be headers, for example `Name | Email | Discord`. One row per member.
4. Run `/setup view` in Discord to get the bot's service account email. **Share both sheets with that email as Viewer.**
5. Run `/setup sheets members:<link> responses:<link>`. Open the right tab before copying a link so the link points at that tab.
6. The bot guesses the columns. Fix them with `/setup columns` if needed (the options autocomplete from your headers).
7. Optional:
   - `/setup timezone`, `/setup deadline`, `/setup form` (the link shown in reminders)
   - `/reminder set channel:#general every_days:2 time:12pm`
8. Run `/status`.

### Limiting commands to specific channels

Discord doesn't let bots register commands per channel, so there are two options:

- **In the bot:** `/channels add #form-tracker`. Members can then only use commands there. Admins can use them anywhere, and `/setup` and `/channels` always work.
- **In Discord itself:** Server Settings → Integrations → *this bot* → pick a command → add channel overrides. This hides the commands in other channels entirely.

## Hosting the bot yourself

### Requirements

- Node.js 22.13 or newer (uses the built-in `node:sqlite`)
- A Discord bot token from the [Developer Portal](https://discord.com/developers/applications)
- A Google Cloud service account (free, steps below)

### 1. Discord bot

1. Create an application at the [Developer Portal](https://discord.com/developers/applications) and add a bot. Copy the token.
2. Invite it with the `bot` and `applications.commands` scopes and the permissions **Send Messages**, **Embed Links** and **Attach Files**.

No privileged intents are needed. Usernames in the members sheet are looked up with Discord's member search.

### 2. Google service account

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (or pick one).
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **IAM & Admin → Service Accounts → Create service account.** Give it any name. It needs no roles.
4. Open the service account → **Keys → Add key → Create new key → JSON**. This downloads the key file.
5. Save it as `service-account.json` in the project root (it's in `.gitignore`). **Never commit this file.**

The `client_email` in that file is the address every server shares its sheets with. `/setup view` shows it.

### 3. Configure and run

```bash
npm install
cp src/config/settings.example.yml src/config/settings.yml
```

Edit `src/config/settings.yml`:

- `bot_settings.token`: your bot token
- `bot_settings.global_commands`: `true` for a public bot. Use `false` and list your test server under `guilds` while developing.
- `google.credentials_file`: path to the service account key
- `tracker.cache_seconds`: how long sheet data is reused (default 120)
- `tracker.database_file`: where each server's setup is stored (default `./data/tracker.db`)

```bash
npm run start:dev   # watch mode
npm start           # build and run
npm test            # matching and scheduling tests
```

## Project layout

```
src/
  services/
    sheets.ts       Google Sheets access (service account)
    matching.ts     pure matching logic (tested)
    tracker.ts      per-server status cache and Discord user lookup
    schedule.ts     pure reminder time maths (tested)
    reminders.ts    sending reminders and the once-a-minute scheduler
    database.ts     SQLite storage for setup, reminders and exemptions
  interactions/
    commands/       admin/, tracker/, reminders/, info/
    buttons/        "I've submitted" and /missing paging
  events/           ready (starts the scheduler), interactionCreate (admin/channel checks)
```

## License

MIT
