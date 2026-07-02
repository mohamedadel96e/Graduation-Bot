import { createServer } from 'node:http';
import { createGradBot } from './bot';

async function main() {
    const bot = createGradBot();
    await bot.start();

    // Create a simple HTTP server to satisfy Render's port binding requirement
    // and provide an endpoint for cron-job.org to ping.
    const port = process.env.PORT || 3000;
    createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('GradBot is online!\n');
    }).listen(port, () => {
        console.log(`HTTP server listening on port ${port} for Keep-Alive pings.`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
