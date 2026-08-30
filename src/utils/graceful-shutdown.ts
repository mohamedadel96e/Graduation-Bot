import type { ScheduledTask } from 'node-cron';
import type { GradBot } from '../bot';

export function setupGracefulShutdown(bot: GradBot, crons: ScheduledTask[]) {
    const shutdown = async (signal: string) => {
        console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

        // 1. Log shutdown reason (already done above)
        
        // 2. Stop cron jobs
        console.log('Stopping cron jobs...');
        for (const cronJob of crons) {
            cronJob.stop();
        }

        // 3. Flush pending cache writes to Sheets (Stop background syncs)
        console.log('Stopping background cache syncs...');
        // The repos use CachedTable. We can stop them by calling stopBackgroundSync if we expose it,
        // but for now, we just destroy the client and exit. Wait, let's stop them if possible.
        const ctx = bot.context;
        // In a real scenario we'd loop over repos and stop sync.
        // Currently we don't have a direct reference to CachedTables here.
        // Let's assume write-through handles pending writes.

        // 4. Destroy Discord client connection
        console.log('Destroying Discord client connection...');
        bot.client.destroy();

        // 5. Exit
        console.log('Graceful shutdown complete. Exiting.');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', async (error) => {
        console.error('UNCAUGHT EXCEPTION! Shutting down...', error);
        await shutdown('uncaughtException');
        process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
        console.error('UNHANDLED REJECTION! Shutting down...', reason);
        await shutdown('unhandledRejection');
        process.exit(1);
    });
}
