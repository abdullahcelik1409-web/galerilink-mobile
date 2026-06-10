import { FilterState } from '@/hooks/use-filters';
import { supabase } from '@/lib/supabase';
import { Car, CarDraft, ListingSourceTable, ListingWithSeller } from '@/types/domain';

const SELLER_SELECT = `
  *,
  profiles:seller_id ( galeri_adi, ad_soyad, company_name, phone, city, district, hesap_durumu )
`;

const applyListingFilters = (baseQuery: any, filters?: FilterState) => {
  let query = baseQuery;
  if (!filters) return query;

  if (filters.minPrice) query = query.gte('price_b2b', parseInt(filters.minPrice, 10));
  if (filters.maxPrice) query = query.lte('price_b2b', parseInt(filters.maxPrice, 10));
  if (filters.minYear) query = query.gte('year', parseInt(filters.minYear, 10));
  if (filters.maxYear) query = query.lte('year', parseInt(filters.maxYear, 10));
  if (filters.minKm) query = query.gte('km', parseInt(filters.minKm, 10));
  if (filters.maxKm) query = query.lte('km', parseInt(filters.maxKm, 10));

  if (filters.selectedCities?.length) {
    query = query.in('location_city', filters.selectedCities);
  } else if (filters.city) {
    query = query.ilike('location_city', `%${filters.city}%`);
  }

  if (filters.selectedDistricts?.length) {
    query = query.in('location_district', filters.selectedDistricts);
  }

  if (filters.selectedMarka) {
    query = query.ilike('brand', `%${filters.selectedMarka.name}%`);
  } else if (filters.brand) {
    query = query.ilike('brand', `%${filters.brand}%`);
  }

  if (filters.selectedSeri) query = query.ilike('series', `%${filters.selectedSeri.name}%`);
  if (filters.selectedModel) {
    query = query.ilike('model', `%${filters.selectedModel.name}%`);
  } else if (filters.model) {
    query = query.ilike('model', `%${filters.model}%`);
  }

  if (filters.selectedMotor) {
    const motorStr = `%${filters.selectedMotor.name}%`;
    query = query.or(`title.ilike.${motorStr},description.ilike.${motorStr}`);
  }

  if (filters.selectedPaket) {
    const paketStr = `%${filters.selectedPaket.name}%`;
    query = query.or(`title.ilike.${paketStr},description.ilike.${paketStr}`);
  }

  if (filters.selectedBodyTypes?.length) {
    const bodyTypeFilters = filters.selectedBodyTypes
      .map(type => `body_type.ilike.%${type.trim()}%`)
      .join(',');
    query = query.or(bodyTypeFilters);
  }

  if (filters.selectedDamageStatus?.length) {
    const hasEvet = filters.selectedDamageStatus.includes('Evet');
    const hasHayir = filters.selectedDamageStatus.includes('Hayır');
    if (hasEvet && !hasHayir) query = query.eq('heavy_damage', 'Evet');
    if (!hasEvet && hasHayir) query = query.eq('heavy_damage', 'Hayır');
  }

  if (filters.search) {
    const searchStr = `%${filters.search}%`;
    query = query.or(`title.ilike.${searchStr},brand.ilike.${searchStr},model.ilike.${searchStr}`);
  }

  return query;
};

export type ListOptions = {
  page: number;
  pageSize: number;
  filters?: FilterState;
};

export const listingRepository = {
  async listPublished({ page, pageSize, filters }: ListOptions) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const baseQuery = supabase
      .from('cars')
      .select(SELLER_SELECT)
      .eq('status', 'published')
      .neq('is_opportunity', true)
      .order('created_at', { ascending: false });

    const { data, error } = await applyListingFilters(baseQuery, filters).range(from, to);
    if (error) throw error;
    return (data || []) as ListingWithSeller[];
  },

  async listOpportunities({ page, pageSize, filters }: ListOptions) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const baseQuery = supabase
      .from('cars')
      .select(SELLER_SELECT)
      .eq('status', 'published')
      .eq('is_opportunity', true)
      .order('created_at', { ascending: false });

    const { data, error } = await applyListingFilters(baseQuery, filters).range(from, to);
    if (error) throw error;
    return (data || []) as ListingWithSeller[];
  },

  async listMine(userId: string, table: ListingSourceTable, page: number, pageSize: number) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select('id,status,brand,model,year,km,price_b2b,images,created_at')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return (data || []) as Array<Partial<Car | CarDraft> & { id: string; status?: string | null; images?: string[] | null }>;
  },

  async getDetail(id: string) {
    const carsResult = await supabase
      .from('cars')
      .select(SELLER_SELECT)
      .eq('id', id)
      .single();

    if (carsResult.data) {
      return { record: carsResult.data as ListingWithSeller, sourceTable: 'cars' as const };
    }

    const draftsResult = await supabase
      .from('cars_drafts')
      .select(SELLER_SELECT)
      .eq('id', id)
      .single();

    if (!draftsResult.data || draftsResult.error) {
      throw carsResult.error || draftsResult.error || new Error('İlan bulunamadı');
    }

    return { record: draftsResult.data, sourceTable: 'cars_drafts' as const };
  },

  async updateExpertise(table: ListingSourceTable, id: string, expertise: Record<string, string>) {
    const { error } = await supabase.from(table).update({ expertise }).eq('id', id);
    if (error) throw error;
  },

  async createPublished(payload: Record<string, unknown>) {
    const { error } = await supabase.from('cars').insert(payload);
    if (error) throw error;
  },

  async publishDraft(params: {
    draftId: string;
    numericPrice: number;
    description: string;
    damageReport?: string;
    images: string[];
    isOpportunity: boolean;
    opportunityReason: string | null;
    opportunityExpiresHours: number;
  }) {
    const { data: draft, error: fetchError } = await supabase
      .from('cars_drafts')
      .select('*')
      .eq('id', params.draftId)
      .single();

    if (fetchError || !draft) throw fetchError || new Error('Taslak bulunamadı');

    const { error: insertError } = await supabase
      .from('cars')
      .insert([{
        seller_id: draft.seller_id,
        brand: draft.brand,
        model: draft.model,
        series: draft.series,
        year: draft.year,
        km: draft.km,
        price_b2b: params.numericPrice,
        title: draft.title,
        description: params.description,
        damage_report: params.damageReport,
        images: params.images,
        expertise: draft.expertise,
        fuel: draft.fuel,
        transmission: draft.transmission,
        body_type: draft.body_type,
        engine: draft.engine,
        status: 'published',
        is_active: true,
        is_opportunity: params.isOpportunity,
        opportunity_reason: params.isOpportunity ? params.opportunityReason : null,
        opportunity_expires_at: params.isOpportunity
          ? new Date(Date.now() + params.opportunityExpiresHours * 60 * 60 * 1000).toISOString()
          : null,
        is_trade_closed: true,
        heavy_damage: draft.heavy_damage || 'Hayır',
      }]);

    if (insertError) throw insertError;

    const { error: deleteError } = await supabase
      .from('cars_drafts')
      .delete()
      .eq('id', params.draftId);

    if (deleteError) throw deleteError;
  },

  async updatePublished(id: string, payload: Record<string, unknown>) {
    const { error } = await supabase.from('cars').update(payload).eq('id', id);
    if (error) throw error;
  },

  async createDraft(payload: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('cars_drafts')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('Taslak oluşturulamadı');
    return data as CarDraft;
  },

  async deleteListing(table: ListingSourceTable, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },
};
