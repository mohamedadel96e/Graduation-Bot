import { createGradBot } from './bot';

async function main() {
    const bot = createGradBot();
    await bot.start();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
