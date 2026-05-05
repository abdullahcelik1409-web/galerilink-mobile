import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

import { decode } from 'base64-arraybuffer';

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
    // 1. Dosyayı geçici olarak indir
    const fileName = imageUrl.split('/').pop() || 'temp.jpg';
    const downloadDest = FileSystem.cacheDirectory + fileName;
    
    const { uri: localUri } = await FileSystem.downloadAsync(imageUrl, downloadDest);

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
      console.error('Upload Error:', uploadError.message);
      return null;
    }

    // 5. Public URL al
    const { data: publicData } = supabase.storage
      .from('car_images')
      .getPublicUrl(storagePath);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Image Processing Error:', error);
    return null;
  }
}

/**
 * Çoklu resimler için paralel (veya sıralı) işleyici.
 * Hatalı resimleri pas geçer.
 */
export async function processMultipleImages(imageUrls: string[], carId: string): Promise<string[]> {
  const uploadedUrls: string[] = [];
  
  // Çok fazla eşzamanlı istek atmamak için batching yapılabilir,
  // ancak basitlik adına Promise.all kullanıyoruz (veya for...of ile sıralı).
  // Mobil ağlarda çökme olmaması için sıralı yapmak daha güvenlidir.
  for (const url of imageUrls) {
    const publicUrl = await processAndUploadImage(url, carId);
    if (publicUrl) {
      uploadedUrls.push(publicUrl);
    }
  }

  return uploadedUrls;
}
