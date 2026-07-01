# Graduation-Bot

GradBot is a Discord bot for managing a graduation project team. The first working slice supports idea collection, idea listing, voting, archiving, and audit logging to Google Sheets.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```env
   DISCORD_TOKEN=
   DISCORD_CLIENT_ID=
   DISCORD_GUILD_ID=
   GOOGLE_SERVICE_ACCOUNT_EMAIL=
   GOOGLE_PRIVATE_KEY=
   GOOGLE_SHEET_ID=
   LEAD_ROLE_ID=
   ADMIN_ROLE_ID=
   ```

3. In Google Sheets, create tabs named `Ideas`, `Votes`, and `Logs`. GradBot writes the header row automatically when a tab is empty.

4. Start the bot:

   ```bash
   npm start
   ```

## Commands

- `/idea add title description difficulty tech_stack`
- `/idea list status`
- `/idea view id`
- `/idea vote id vote`
- `/idea archive id`

## Testing

```bash
npm run typecheck
npm run build
npm test
```
