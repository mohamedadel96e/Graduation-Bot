import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Events, Collection } from 'discord.js';
import { setupInteractionCreateEvent } from '../../events/interactionCreate';
import type { BotCommand, CommandContext } from '../../commands/types';
import type { DiscordLogger } from '../../services/logger';

describe('interactionCreate Event', () => {
    it('Registers InteractionCreate event -> calling setupInteractionCreateEvent registers a listener on the client\'s `on` method for `Events.InteractionCreate`', () => {
        const client = {
            on: mock.fn(),
        } as any;
        const commandMap = new Collection<string, BotCommand>();
        const context = {} as CommandContext;
        const logger = {} as DiscordLogger;

        setupInteractionCreateEvent(client, commandMap, context, logger);

        assert.equal(client.on.mock.callCount(), 1);
        const [eventName, listener] = client.on.mock.calls[0].arguments;
        
        assert.equal(eventName, Events.InteractionCreate);
        assert.equal(typeof listener, 'function');
    });
});
