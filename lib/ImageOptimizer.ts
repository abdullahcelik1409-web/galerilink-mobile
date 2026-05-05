import * as ImageManipulator from 'expo-image-manipulator';

export interface OptimizationResult {
  uri: string;
  width: number;
  height: number;
  isOptimized: boolean;
  error?: string;
}

/**
 * React Native / Expo implementation of client-side WebP compression.
 * Uses native expo-image-manipulator for high performance.
 */
export async function optimizeImage(
  uri: string,
  maxWidthOrHeight: number = 1200,
  quality: number = 0.75
): Promise<OptimizationResult> {
  try {
    // 1. Get image info to check if we need resizing
    const actions: ImageManipulator.Action[] = [];
    
    // 2. Add resize action if image is too large
    // (Note: ImageManipulator handles aspect ratio automatically if only one dimension is provided)
    actions.push({
      resize: {
        width: maxWidthOrHeight,
      },
    });

    // 3. Compress and convert to WebP
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.WEBP,
      }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      isOptimized: true,
    };
  } catch (error) {
    console.error('[ImageOptimizer] Optimization failed:', error);
    
    return {
      uri,
      width: 0,
      height: 0,
      isOptimized: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
