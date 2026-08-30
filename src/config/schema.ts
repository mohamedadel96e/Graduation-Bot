import { z } from 'zod';

/**
 * Zod schema for all environment variables.
 *
 * Required variables fail-fast at startup with a human-readable table of
 * every missing/invalid var. Optional channel and role IDs default to ''.
 *
 * GOOGLE_* variables are only required when DATABASE_ADAPTER is 'sheets'.
 * That conditional validation is handled in `parseEnv()`.
 */
const envSchema = z.object({
    // ─── Discord (required) ─────────────────────────────────────────────
    DISCORD_TOKEN: z
        .string({ message: 'Discord bot token is required' })
        .min(1, 'Discord bot token is required'),
    DISCORD_CLIENT_ID: z
        .string({ message: 'Discord client/application ID is required' })
        .min(1, 'Discord client/application ID is required'),
    DISCORD_GUILD_ID: z
        .string({ message: 'Discord guild (server) ID is required' })
        .min(1, 'Discord guild (server) ID is required'),

    // ─── Google Sheets (conditionally required) ─────────────────────────
    GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default(''),
    GOOGLE_PRIVATE_KEY: z
        .string()
        .default('')
        .transform((k) => k.replace(/\\n/g, '\n')),
    GOOGLE_SHEET_ID: z.string().default(''),

    // ─── Discord channels (optional) ────────────────────────────────────
    LOG_CHANNEL_ID: z.string().default(''),
    ERROR_CHANNEL_ID: z.string().default(''),
    DIGEST_CHANNEL_ID: z.string().default(''),
    DISCUSSION_CHANNEL_ID: z.string().default(''),
    VOTING_RESULTS_CHANNEL_ID: z.string().default(''),
    STANDUP_CHANNEL_ID: z.string().default(''),

    // ─── Discord roles (optional) ───────────────────────────────────────
    LEAD_ROLE_ID: z.string().default(''),
    ADMIN_ROLE_ID: z.string().default(''),
});

export type Config = z.infer<typeof envSchema>;

/**
 * Format Zod issues into a human-readable table printed to stderr before
 * the process exits.
 */
function formatErrors(issues: z.ZodIssue[]): string {
    const lines = [
        '',
        '┌──────────────────────────────────────────────────────────────┐',
        '│             Environment Validation Failed                   │',
        '├─────────────────────────────┬────────────────────────────────┤',
        '│ Variable                    │ Error                          │',
        '├─────────────────────────────┼────────────────────────────────┤',
    ];

    for (const issue of issues) {
        const name = issue.path.join('.').padEnd(27);
        const msg = issue.message.slice(0, 30).padEnd(30);
        lines.push(`│ ${name} │ ${msg} │`);
    }

    lines.push(
        '└─────────────────────────────┴────────────────────────────────┘',
        '',
    );
    return lines.join('\n');
}

/**
 * Parse and validate `process.env` against the schema.
 *
 * On failure: prints a table of all missing/invalid vars, then exits with
 * code 1.
 */
export function parseEnv(env: Record<string, string | undefined> = process.env): Config {
    const result = envSchema.safeParse(env);

    if (!result.success) {
        console.error(formatErrors(result.error.issues));
        process.exit(1);
    }

    return result.data;
}
