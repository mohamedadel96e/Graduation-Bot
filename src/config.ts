import { config } from 'dotenv';
import { parseEnv, type Config } from './config/schema';

config();

export const ENV: Config = parseEnv();
