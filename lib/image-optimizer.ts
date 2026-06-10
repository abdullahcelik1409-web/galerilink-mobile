import * as ImageManipulator from 'expo-image-manipulator';

export interface OptimizationResult {
  uri: string;
  width: number;
  height: number;
  isOptimized: boolean;
  error?: string;
}

export async function optimizeImage(
  uri: string,
  maxWidthOrHeight: number = 1200,
  quality: number = 0.75
): Promise<OptimizationResult> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidthOrHeight } }],
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
    console.warn('[image-optimizer] Optimization failed.');

    return {
      uri,
      width: 0,
      height: 0,
      isOptimized: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
