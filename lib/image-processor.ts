import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';
import { isAllowedScrapedImageUrl } from './security';

import { decode } from 'base64-arraybuffer';

const IMAGE_DOWNLOAD_TIMEOUT_MS = 15000;

async function downloadImageWithTimeout(imageUrl: string, downloadDest: string) {
  const download = FileSystem.createDownloadResumable(imageUrl, downloadDest);
  let timeout: ReturnType<typeof setTimeout> | null = null;

  try {
    const result = await Promise.race([
      download.downloadAsync(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Image download timeout')),
          IMAGE_DOWNLOAD_TIMEOUT_MS
        );
      }),
    ]);

    if (!result?.uri) {
      throw new Error('Image download failed');
    }

    return result.uri;
  } catch (error) {
    try {
      await download.pauseAsync();
    } catch {
      // no-op
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Resmi dış kaynaktan (Sahibinden) indirip, WebP formatında küçülterek
 * cihaz hafızasına kaydeder ve ardından Supabase'e yükler.
 *
 * @param imageUrl İndirilecek orijinal resim URL'si
 * @param carId Hangi ilana ait olduğu (Klasörleme için: {carId}/{random}.webp)
 * @returns {Promise<string | null>} Yüklenen dosyanın public URL'si veya null
 */
export async function processAndUploadImage(imageUrl: string, carId: string): Promise<string | null> {
  try {
    if (!isAllowedScrapedImageUrl(imageUrl)) {
      return null;
    }

    // 1. Dosyayı geçici olarak indir
    const fileName = imageUrl.split('/').pop() || 'temp.jpg';
    const downloadDest = FileSystem.cacheDirectory + fileName;
    
    const localUri = await downloadImageWithTimeout(imageUrl, downloadDest);

    // 2. Resmi Manipüle et (WebP, %80 kalite, opsiyonel boyut küçültme)
    const manipResult = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1200 } }], // Çok büyük resimleri sınırla
      { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
    );

    // 3. Dosyayı Base64 olarak oku
    const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 4. ArrayBuffer'a çevir (React Native fetch/blob sorunlarını çözer)
    const arrayBuffer = decode(base64);

    // 5. Supabase'e yükle
    const fileExt = 'webp';
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `${carId}/${uniqueFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('car_images')
      .upload(storagePath, arrayBuffer, {
        contentType: 'image/webp',
        upsert: false,
      });

    if (uploadError) {
      console.warn('[ImageProcessor] Upload failed.');
      return null;
    }

    // 5. Public URL al
    const { data: publicData } = supabase.storage
      .from('car_images')
      .getPublicUrl(storagePath);

    return publicData.publicUrl;
  } catch {
    console.warn('[ImageProcessor] Image processing failed.');
    return null;
  }
}

/**
 * Çoklu resimler için paralel (veya sıralı) işleyici.
 * Hatalı resimleri pas geçer.
 */
export async function processMultipleImages(imageUrls: string[], carId: string): Promise<string[]> {
  const chunkSize = 10;
  const allResults = [];
  for (let i = 0; i < imageUrls.length; i += chunkSize) {
    const chunk = imageUrls.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(
      chunk.map(url => processAndUploadImage(url, carId))
    );
    allResults.push(...chunkResults);
  }
 
  const successful = allResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
  return successful;
}
