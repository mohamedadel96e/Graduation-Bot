import { decideCommand } from './decide';
import { ideaCommand } from './idea';
import { taskCommand } from './task';
import type { BotCommand } from './types';

export function createCommands(): BotCommand[] {
    return [ideaCommand, decideCommand, taskCommand];
}
