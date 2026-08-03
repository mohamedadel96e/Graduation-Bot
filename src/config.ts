import { config } from 'dotenv';
config();

export const ENV = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || '',
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || '',
    
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    // Replace literal '\n' with actual newlines in case it's passed via some stringified env variable
    GOOGLE_PRIVATE_KEY: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '',
    
    LOG_CHANNEL_ID: process.env.LOG_CHANNEL_ID || '',
    ERROR_CHANNEL_ID: process.env.ERROR_CHANNEL_ID || '',
    DIGEST_CHANNEL_ID: process.env.DIGEST_CHANNEL_ID || '',
    DISCUSSION_CHANNEL_ID: process.env.DISCUSSION_CHANNEL_ID || '',
    VOTING_RESULTS_CHANNEL_ID: process.env.VOTING_RESULTS_CHANNEL_ID || '',
    STANDUP_CHANNEL_ID: process.env.STANDUP_CHANNEL_ID || '',
    
    LEAD_ROLE_ID: process.env.LEAD_ROLE_ID || '',
    ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID || '',
};
