import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

export type UploadCarImageOptions = {
  uri: string;
  ownerPath?: string;
  contentType?: string;
  extension?: string;
  cacheControl?: string;
};

const getFileName = (extension: string) => (
  `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`
);

export const imageUploadService = {
  async uploadCarImage({
    uri,
    ownerPath = 'cars',
    contentType = 'image/webp',
    extension = 'webp',
    cacheControl = '3600',
  }: UploadCarImageOptions) {
    if (!uri) throw new Error('Geçerli bir görsel yolu bulunamadı.');

    const filePath = `${ownerPath.replace(/\/$/, '')}/${getFileName(extension)}`;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage.from('car_images').upload(filePath, arrayBuffer, {
      contentType,
      cacheControl,
      upsert: false,
    });

    if (error) throw error;

    const { data } = supabase.storage.from('car_images').getPublicUrl(filePath);
    if (!data?.publicUrl || data.publicUrl.includes('file://')) {
      throw new Error('Görsel yüklendi ancak geçerli bir bağlantı alınamadı.');
    }

    return data.publicUrl;
  },

  async removeCarImages(imageUrls: string[]) {
    const filePaths = imageUrls
      .map((url) => {
        const match = url.match(/car_images\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter((path): path is string => Boolean(path));

    if (filePaths.length === 0) return;
    await supabase.storage.from('car_images').remove(filePaths);
  },
};
