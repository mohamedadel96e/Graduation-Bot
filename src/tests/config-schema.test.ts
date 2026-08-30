import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import { parseEnv } from '../config/schema';

describe('Config Schema', () => {
    let exitMock: ReturnType<typeof mock.fn>;
    let errorMock: ReturnType<typeof mock.fn>;

    beforeEach(() => {
        exitMock = mock.fn(() => {
            throw new Error('process.exit called');
        });
        mock.method(process, 'exit', exitMock);

        errorMock = mock.fn();
        mock.method(console, 'error', errorMock);
    });

    afterEach(() => {
        mock.restoreAll();
    });

    it('Valid full env -> all required vars provided -> returns a Config object with correct values', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
        };
        const config = parseEnv(env);
        assert.equal(config.DISCORD_TOKEN, 'token-123');
        assert.equal(config.DISCORD_CLIENT_ID, 'client-123');
        assert.equal(config.DISCORD_GUILD_ID, 'guild-123');
        assert.equal(exitMock.mock.callCount(), 0);
    });

    it('Missing DISCORD_TOKEN -> omit DISCORD_TOKEN -> process.exit(1) is called', () => {
        const env = {
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
        };
        assert.throws(() => parseEnv(env), /process.exit called/);
        assert.equal(exitMock.mock.calls[0].arguments[0], 1);
        assert.equal(exitMock.mock.callCount(), 1);
    });

    it('Missing DISCORD_CLIENT_ID -> omit it -> process.exit(1) is called', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_GUILD_ID: 'guild-123',
        };
        assert.throws(() => parseEnv(env), /process.exit called/);
        assert.equal(exitMock.mock.calls[0].arguments[0], 1);
        assert.equal(exitMock.mock.callCount(), 1);
    });

    it('Missing DISCORD_GUILD_ID -> omit it -> process.exit(1) is called', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_CLIENT_ID: 'client-123',
        };
        assert.throws(() => parseEnv(env), /process.exit called/);
        assert.equal(exitMock.mock.calls[0].arguments[0], 1);
        assert.equal(exitMock.mock.callCount(), 1);
    });

    it('Empty string for required var -> DISCORD_TOKEN set to "" -> process.exit(1)', () => {
        const env = {
            DISCORD_TOKEN: '',
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
        };
        assert.throws(() => parseEnv(env), /process.exit called/);
        assert.equal(exitMock.mock.calls[0].arguments[0], 1);
        assert.equal(exitMock.mock.callCount(), 1);
    });

    it('Multiple missing required vars -> omit all 3 -> process.exit(1) is called, and console.error receives the formatted table', () => {
        const env = {};
        assert.throws(() => parseEnv(env), /process.exit called/);
        assert.equal(exitMock.mock.calls[0].arguments[0], 1);
        assert.equal(exitMock.mock.callCount(), 1);
        assert.equal(errorMock.mock.callCount(), 1);
        const errorOutput = errorMock.mock.calls[0].arguments[0] as string;
        assert.match(errorOutput, /DISCORD_TOKEN/);
        assert.match(errorOutput, /DISCORD_CLIENT_ID/);
        assert.match(errorOutput, /DISCORD_GUILD_ID/);
    });

    it('Optional vars default to empty string -> only provide the 3 required vars -> all optional channel/role IDs default to ""', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
        };
        const config = parseEnv(env);
        assert.equal(config.LOG_CHANNEL_ID, '');
        assert.equal(config.ERROR_CHANNEL_ID, '');
        assert.equal(config.DIGEST_CHANNEL_ID, '');
        assert.equal(config.DISCUSSION_CHANNEL_ID, '');
        assert.equal(config.VOTING_RESULTS_CHANNEL_ID, '');
        assert.equal(config.STANDUP_CHANNEL_ID, '');
        assert.equal(config.LEAD_ROLE_ID, '');
        assert.equal(config.ADMIN_ROLE_ID, '');
        assert.equal(config.GOOGLE_SERVICE_ACCOUNT_EMAIL, '');
        assert.equal(config.GOOGLE_PRIVATE_KEY, '');
        assert.equal(config.GOOGLE_SHEET_ID, '');
    });

    it('GOOGLE_PRIVATE_KEY newline transform -> provide key with literal \\n -> output has real \\n characters', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
            GOOGLE_PRIVATE_KEY: 'line1\\nline2\\nline3',
        };
        const config = parseEnv(env);
        assert.equal(config.GOOGLE_PRIVATE_KEY, 'line1\nline2\nline3');
    });

    it('Extra env vars are ignored -> provide required + some unknown vars -> succeeds, extra keys ignored', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
            SOME_UNKNOWN_VAR: 'hello',
        };
        const config = parseEnv(env);
        assert.equal(config.DISCORD_TOKEN, 'token-123');
        assert.equal('SOME_UNKNOWN_VAR' in config, false);
    });

    it('All optional vars provided -> provide every single var with valid values -> all present in returned Config', () => {
        const env = {
            DISCORD_TOKEN: 'token-123',
            DISCORD_CLIENT_ID: 'client-123',
            DISCORD_GUILD_ID: 'guild-123',
            GOOGLE_SERVICE_ACCOUNT_EMAIL: 'test@example.com',
            GOOGLE_PRIVATE_KEY: 'private_key_here',
            GOOGLE_SHEET_ID: 'sheet_id_here',
            LOG_CHANNEL_ID: 'log_channel',
            ERROR_CHANNEL_ID: 'error_channel',
            DIGEST_CHANNEL_ID: 'digest_channel',
            DISCUSSION_CHANNEL_ID: 'discussion_channel',
            VOTING_RESULTS_CHANNEL_ID: 'voting_channel',
            STANDUP_CHANNEL_ID: 'standup_channel',
            LEAD_ROLE_ID: 'lead_role',
            ADMIN_ROLE_ID: 'admin_role',
        };
        const config = parseEnv(env);
        assert.equal(config.GOOGLE_SERVICE_ACCOUNT_EMAIL, 'test@example.com');
        assert.equal(config.GOOGLE_PRIVATE_KEY, 'private_key_here');
        assert.equal(config.GOOGLE_SHEET_ID, 'sheet_id_here');
        assert.equal(config.LOG_CHANNEL_ID, 'log_channel');
        assert.equal(config.ERROR_CHANNEL_ID, 'error_channel');
        assert.equal(config.DIGEST_CHANNEL_ID, 'digest_channel');
        assert.equal(config.DISCUSSION_CHANNEL_ID, 'discussion_channel');
        assert.equal(config.VOTING_RESULTS_CHANNEL_ID, 'voting_channel');
        assert.equal(config.STANDUP_CHANNEL_ID, 'standup_channel');
        assert.equal(config.LEAD_ROLE_ID, 'lead_role');
        assert.equal(config.ADMIN_ROLE_ID, 'admin_role');
    });
});
