type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry<unknown>>();

export const taxonomyCache = {
  async get<T>(key: string, loader: () => Promise<T>, ttlMs = DEFAULT_TTL_MS): Promise<T> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }

    const data = await loader();
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  },

  invalidate(keyPrefix?: string) {
    if (!keyPrefix) {
      cache.clear();
      return;
    }
    Array.from(cache.keys())
      .filter(key => key.startsWith(keyPrefix))
      .forEach(key => cache.delete(key));
  },
};
