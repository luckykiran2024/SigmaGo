import Redis, { RedisOptions } from 'ioredis';

let redisInstance: Redis | null = null;

/**
 * Returns connection options for Redis based on environment.
 * In production, REDIS_URL or KV_URL is strictly required.
 */
export function getRedisConfig(): { url?: string; options: RedisOptions } {
  const isProduction = process.env.NODE_ENV === 'production';
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_URL;

  if (redisUrl) {
    return {
      url: redisUrl,
      options: {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      },
    };
  }

  if (isProduction) {
    throw new Error(
      'REDIS_URL environment variable is required in production. Refusing silent fallback to localhost.'
    );
  }

  // Development-only fallback
  return {
    options: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      },
    },
  };
}

/**
 * Gets or initializes a singleton ioredis client.
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    const { url, options } = getRedisConfig();
    if (url) {
      redisInstance = new Redis(url, options);
    } else {
      redisInstance = new Redis(options);
    }

    redisInstance.on('error', (err) => {
      // Avoid crashing web server on background redis glitch
      console.warn('[Redis] Connection warning/error:', err.message);
    });
  }
  return redisInstance;
}

/**
 * Attempts to acquire a distributed Redis lock with automatic TTL expiration.
 * Safe for scheduled task overlap prevention.
 */
export async function acquireDistributedLock(
  lockKey: string,
  ttlSeconds: number = 60
): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  try {
    const redis = getRedisClient();
    const token = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await redis.set(lockKey, token, 'EX', ttlSeconds, 'NX');

    if (result === 'OK') {
      return {
        acquired: true,
        release: async () => {
          try {
            // Lua script to safely release only if token matches
            const script = `
              if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
              else
                return 0
              end
            `;
            await redis.eval(script, 1, lockKey, token);
          } catch (err: any) {
            console.warn(`[Redis Lock] Failed to release ${lockKey}:`, err.message);
          }
        },
      };
    }
    return { acquired: false, release: async () => {} };
  } catch (err: any) {
    console.warn(`[Redis Lock] Error checking lock ${lockKey}:`, err.message);
    return { acquired: false, release: async () => {} };
  }
}
