const SUPABASE_PUBLIC_STORAGE_SEGMENT = '/storage/v1/object/public/';
const SUPABASE_RENDER_STORAGE_SEGMENT = '/storage/v1/render/image/public/';

export function getOptimizedImageUrl(
  imageUrl: string | null | undefined,
  options: { width: number; height?: number; quality?: number } = { width: 480 }
) {
  if (!imageUrl) return imageUrl;

  try {
    const url = new URL(imageUrl);
    if (!url.pathname.includes(SUPABASE_PUBLIC_STORAGE_SEGMENT)) {
      return imageUrl;
    }

    url.pathname = url.pathname.replace(
      SUPABASE_PUBLIC_STORAGE_SEGMENT,
      SUPABASE_RENDER_STORAGE_SEGMENT
    );
    url.searchParams.set('width', String(options.width));
    if (options.height) url.searchParams.set('height', String(options.height));
    url.searchParams.set('resize', 'cover');
    url.searchParams.set('quality', String(options.quality ?? 75));
    return url.toString();
  } catch {
    return imageUrl;
  }
}
