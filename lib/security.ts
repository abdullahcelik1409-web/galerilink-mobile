const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SCRAPED_IMAGES = 10;
const MAX_URL_LENGTH = 2048;
const ALLOWED_SCRAPER_IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|webp)(\?|$)/i;

export function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isAllowedInternalRoute(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  if (url === '/(tabs)' || url === '/(tabs)/messages') return true;

  const messageMatch = url.match(/^\/messages\/([^/?#]+)$/);
  if (messageMatch) return isValidUuid(messageMatch[1]);

  const listingMatch = url.match(/^\/listing\/([^/?#]+)$/);
  if (listingMatch) return isValidUuid(listingMatch[1]);

  return false;
}

export function isAllowedSahibindenHost(hostname: string) {
  return hostname === 'sahibinden.com' || hostname.endsWith('.sahibinden.com');
}

export function isAllowedScrapedImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0 || url.length > MAX_URL_LENGTH) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && isAllowedSahibindenHost(parsed.hostname)
      && ALLOWED_SCRAPER_IMAGE_EXTENSIONS.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function normalizeScrapedImageUrls(imageUrls: unknown) {
  if (!Array.isArray(imageUrls)) return [];
  return Array.from(new Set(imageUrls))
    .filter(isAllowedScrapedImageUrl)
    .slice(0, MAX_SCRAPED_IMAGES);
}
