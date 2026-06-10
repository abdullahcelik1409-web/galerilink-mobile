import { supabase } from './supabase';
import { TaxonomyLevel } from './taxonomy-types';
import { taxonomyCache } from '@/features/taxonomy/api/taxonomy-cache';

const getCachedTaxonomy = async (key: string, loader: () => Promise<any[]>) => {
  return taxonomyCache.get(key, loader);
};

/**
 * Türkçe karakter duyarlı normalizasyon fonksiyonu (Deduplication için)
 */
const normalizeForUniqueKey = (text: string) => {
  if (!text) return '';
  return text.trim()
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .replace(/[-\s]/g, '') // YENİ: Tüm boşlukları ve tireleri ACIMASIZCA sil
    .toLowerCase();
};

/**
 * Taksonomi Hiyerarşi Çözümleyici
 */
export const TaxonomyResolver = {
  /**
   * Web projesindeki gibi doğrudan hiyerarşiyi izler.
   * Artık Bridge mantığına ihtiyaç yok çünkü Yıl-Marka ağacı tam dolu.
   */
  async resolveBridge(
    currentLevel: TaxonomyLevel,
    selectedItem: { id: string; name: string },
    categoryId: string
  ): Promise<string> {
    // Doğrudan seçilen ID'yi döndür (Hiyerarşi Tree A üzerinden devam eder)
    return selectedItem.id;
  },

  /**
   * Verilen seviye ve parent_id'ye göre taksonomi verilerini çeker.
   */
  async fetchItems(level: TaxonomyLevel, parentId: string | null = null) {
    
    let query = supabase
      .from('car_taxonomy')
      .select('id, name, slug, parent_id, level, status')
      .eq('level', level)
      .eq('status', 'approved');

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else if (level === TaxonomyLevel.KATEGORI) {
      query = query.is('parent_id', null);
    }

    const { data, error } = await query.order('name', { ascending: level !== TaxonomyLevel.YIL });
    
    if (error) {
      console.error(`[Resolver] Fatal Fetch Error:`, error);
      throw error;
    }

    // [DEDUPLICATION] Arka planda normalize edilmiş anahtarlar ile tekilleştirme
    const uniqueMap = new Map();
    (data || []).forEach(item => {
      const key = normalizeForUniqueKey(item.name);
      // Eğer bu isim (normalize edilmiş haliyle) henüz eklenmediyse ekle
      // Bu sayede listenin orijinal halindeki ilk kayıt (genelde approved olan) korunur
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const finalData = Array.from(uniqueMap.values());
    return finalData;
  },

  /**
   * Derinlemesine hiyerarşik tarama (Deep Fetch) yaparak hedef seviyedeki öğeleri getirir.
   * Opsiyonel olarak isim filtresi (nameFilter) alabilir.
   */
  async fetchDeepItems(targetLevel: TaxonomyLevel, rootIds: string[], nameFilter?: string) {
    const cleanRootIds = (rootIds || []).filter(id => !!id);
    if (cleanRootIds.length === 0) return [];

    let currentParentIds = [...cleanRootIds];
    let allFound: any[] = [];
    const MAX_DEPTH = 5;

    for (let depth = 0; depth < MAX_DEPTH; depth++) {
      if (!currentParentIds || currentParentIds.length === 0) break;

      const CHUNK_SIZE = 500;
      let depthData: any[] = [];

      for (let i = 0; i < currentParentIds.length; i += CHUNK_SIZE) {
        const chunk = currentParentIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from('car_taxonomy')
          .select('id, name, level, parent_id')
          .in('parent_id', chunk)
          .eq('status', 'approved');
        
        if (error) throw error;
        if (data) depthData = [...depthData, ...data];
      }

      if (depthData.length === 0) break;

      const targetItems = depthData.filter(item => {
        const levelMatch = item.level === targetLevel;
        const nameMatch = nameFilter ? item.name.toLowerCase().trim() === nameFilter.toLowerCase().trim() : true;
        return levelMatch && nameMatch;
      });
      
      if (targetItems.length > 0) {
        allFound = [...allFound, ...targetItems];
        break;
      }

      currentParentIds = depthData.map(item => item.id).filter(id => !!id);
    }

    const uniqueMap = new Map();
    allFound.forEach(item => {
      const key = normalizeForUniqueKey(item.name);
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });

    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Bir üst seviyedeki seçimin TÜM izdüşümlerini (ID'lerini) bulur.
   * Örn: 'BMW' ismine sahip tüm Marka düğümlerini Kategori altında bulur.
   */
  async fetchNodeIdsByName(name: string, level: TaxonomyLevel, rootIds: string[]) {
    // Önce bu isim ve seviyedeki TÜM düğümleri bulalım
    const items = await this.fetchDeepItems(level, rootIds, name);
    // Tekilleştirilmemiş hallerini değil, sadece bulduğumuz geçerli ID'leri dönelim
    return items.map(i => i.id).filter(id => !!id); 
  }
};

/**
 * Filtre Sistemi İçin Özel Bypass Çözümleyici
 */
export const TaxonomyFilterResolver = {
  /**
   * Tüm onaylı markaları getirir.
   */
  async fetchMarkalar() {
    return getCachedTaxonomy('filter:markalar', async () => {
    const { data, error } = await supabase
      .from('car_taxonomy')
      .select('id, name')
      .eq('level', TaxonomyLevel.MARKA)
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return this.deduplicate(data || []);
    });
  },

  /**
   * Seçilen Markaya ait Serileri (Eski Model) getirir.
   */
  async fetchSeriler(markaName: string) {
    return getCachedTaxonomy(`filter:seriler:${markaName}`, async () => {
    // 1. Marka İsmine sahip tüm ID'leri bul (Hiyerarşi bağımsız - Filtre için KRİTİK)
    const { data: markaNodes, error: markaErr } = await supabase
      .from('car_taxonomy')
      .select('id')
      .eq('level', TaxonomyLevel.MARKA)
      .eq('name', markaName)
      .eq('status', 'approved');
    
    if (markaErr) throw markaErr;
    const markaIds = (markaNodes || []).map(m => m.id);
    if (markaIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('car_taxonomy')
      .select('id, name')
      .eq('level', TaxonomyLevel.SERI)
      .in('parent_id', markaIds)
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return this.deduplicate(data || []);
    });
  },

  /**
   * [KRİTİK BYPASS] Seri -> Model
   * Aradaki Yakıt, Kasa ve Şanzıman seviyelerini atlayarak Modellere ulaşır.
   */
  async fetchModeller(seriName: string, markaName: string) {
    return getCachedTaxonomy(`filter:modeller:${markaName}:${seriName}`, async () => {
    // 1. Seri ID'lerini bul
    const { data: markaNodes } = await supabase.from('car_taxonomy').select('id').eq('level', TaxonomyLevel.MARKA).eq('name', markaName).eq('status', 'approved');
    const markaIds = (markaNodes || []).map(m => m.id);
    const { data: seriNodes } = await supabase.from('car_taxonomy').select('id').eq('level', TaxonomyLevel.SERI).eq('name', seriName).in('parent_id', markaIds).eq('status', 'approved');
    const seriIds = (seriNodes || []).map(s => s.id);
    if (seriIds.length === 0) return [];

    // 2. BYPASS ZİNCİRİ: Seri -> Yakıt -> Kasa -> Şanzıman
    const { data: y } = await supabase.from('car_taxonomy').select('id').in('parent_id', seriIds).eq('level', TaxonomyLevel.YAKIT).eq('status', 'approved');
    const yakitIds = (y || []).map(i => i.id);
    const { data: k } = await supabase.from('car_taxonomy').select('id').in('parent_id', yakitIds).eq('level', TaxonomyLevel.KASA).eq('status', 'approved');
    const kasaIds = (k || []).map(i => i.id);
    const { data: s } = await supabase.from('car_taxonomy').select('id').in('parent_id', kasaIds).eq('level', TaxonomyLevel.SANZIMAN).eq('status', 'approved');
    const sanzimanIds = (s || []).map(i => i.id);
    if (sanzimanIds.length === 0) return [];

    // 3. Hedef: Model (Gerçek Level: 'model')
    const { data: modeller, error } = await supabase
      .from('car_taxonomy')
      .select('id, name')
      .in('parent_id', sanzimanIds)
      .eq('level', TaxonomyLevel.MODEL)
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return this.deduplicate(modeller || []);
    });
  },

  /**
   * [PHANTOM ID KORUMALI] Model -> Motor
   * İsmi eşleşen tüm Model ID'lerini bulup altındaki Motorları çeker.
   */
  async fetchMotorlar(modelName: string) {
    if (!modelName) return [];
    return getCachedTaxonomy(`filter:motorlar:${modelName}`, async () => {
    
    // 1. İsimle Geniş Tarama: Seviyesi 'model' olan tüm ID'leri bul
    const { data: models } = await supabase.from('car_taxonomy').select('id').eq('level', TaxonomyLevel.MODEL).eq('name', modelName).eq('status', 'approved');
    const modelIds = (models || []).map(m => m.id);
    if (modelIds.length === 0) return [];

    // 2. Motorları Çek (Gerçek Level: 'motor')
    const { data, error } = await supabase
      .from('car_taxonomy')
      .select('id, name')
      .in('parent_id', modelIds)
      .eq('level', TaxonomyLevel.MOTOR)
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return this.deduplicate(data || []);
    });
  },

  /**
   * [PHANTOM ID KORUMALI] Motor -> Paket
   * İsmi eşleşen tüm Motor ID'lerini bulup altındaki Paketleri çeker.
   */
  async fetchPaketler(motorName: string) {
    if (!motorName) return [];
    return getCachedTaxonomy(`filter:paketler:${motorName}`, async () => {

    // 1. İsimle Geniş Tarama: Seviyesi 'motor' olan tüm ID'leri bul
    const { data: motors } = await supabase.from('car_taxonomy').select('id').eq('level', TaxonomyLevel.MOTOR).eq('name', motorName).eq('status', 'approved');
    const motorIds = (motors || []).map(m => m.id);
    if (motorIds.length === 0) return [];

    // 2. Paketleri Çek (Gerçek Level: 'paket')
    const { data, error } = await supabase
      .from('car_taxonomy')
      .select('id, name')
      .in('parent_id', motorIds)
      .eq('level', TaxonomyLevel.PAKET)
      .eq('status', 'approved')
      .order('name');
    
    if (error) throw error;
    return this.deduplicate(data || []);
    });
  },

  /**
   * JS Map ile tekilleştirme (Tire/Boşluk/Türkçe Karakter Duyarlı)
   */
  deduplicate(data: any[]) {
    const uniqueMap = new Map();
    data.forEach(item => {
      const key = normalizeForUniqueKey(item.name);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    return Array.from(uniqueMap.values());
  }
};
