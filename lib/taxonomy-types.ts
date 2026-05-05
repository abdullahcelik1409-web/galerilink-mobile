/**
 * Taksonomi seviyeleri için enum yapısı.
 * Veritabanındaki 'level' sütunu ile birebir eşleşir.
 */
export enum TaxonomyLevel {
  KATEGORI = 'kategori',
  YIL = 'yil',
  MARKA = 'marka',
  SERI = 'seri', // Eski Model
  YAKIT = 'yakit',
  KASA = 'kasa',
  SANZIMAN = 'sanziman',
  MODEL = 'model', // Yeni Model (Şanzımandan sonra)
  MOTOR = 'motor',
  PAKET = 'paket',
}
