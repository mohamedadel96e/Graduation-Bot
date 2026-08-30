export interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    shouldRetry?: (error: any) => boolean;
}

const defaultRetryOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    shouldRetry: (error: any) => {
        // Retry on 429 (Rate Limit), 503 (Service Unavailable), and network errors
        if (error?.status === 429 || error?.status === 503) {
            return true;
        }
        const code = error?.code;
        return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND';
    },
};

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const config = { ...defaultRetryOptions, ...options };
    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            attempt++;
            if (attempt > config.maxRetries || !config.shouldRetry(error)) {
                throw error;
            }

            const delay = config.baseDelay * Math.pow(2, attempt - 1);
            // Add jitter (±25%)
            const jitter = delay * 0.25 * (Math.random() * 2 - 1);
            const sleepTime = Math.max(0, delay + jitter);

            console.warn(`[Retry] Operation failed (Attempt ${attempt}/${config.maxRetries}). Retrying in ${Math.round(sleepTime)}ms...`, (error as any)?.message || error);
            await new Promise((resolve) => setTimeout(resolve, sleepTime));
        }
    }
}
