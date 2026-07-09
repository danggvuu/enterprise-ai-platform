export class RetryEngine {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;

  constructor(maxRetries: number = 3, baseDelayMs: number = 200) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        if (attempt >= this.maxRetries) {
          throw error;
        }

        // Check if error is non-retryable (e.g., 400 Bad Request, Authentication failed)
        // If it's a 4xx error (except 429), we shouldn't retry.
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 100;
        const delay = (this.baseDelayMs * Math.pow(2, attempt - 1)) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Retry Engine failed unconditionally'); // Should never hit this line
  }
}
