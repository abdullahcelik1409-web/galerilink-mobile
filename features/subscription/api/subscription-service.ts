import { supabase } from '@/lib/supabase';

export type SubscriptionLimitInfo = {
  isLimitReached: boolean;
  maxListings: number;
  currentCount: number;
  status: string;
  isLoading: boolean;
  canAdd: boolean;
  message?: string;
};

export const PLAN_LIMITS: Record<string, number> = {
  trial: 5,
  lite: 10,
  pro: 30,
  enterprise: Infinity,
};

export const subscriptionService = {
  async getLimitInfo(userId: string, isTrialExpired: boolean): Promise<Omit<SubscriptionLimitInfo, 'isLoading'>> {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const status = profile?.subscription_status || 'trial';
    const maxListings = PLAN_LIMITS[status] ?? PLAN_LIMITS.trial;

    const [publishedCountResult, draftCountResult] = await Promise.all([
      supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId)
        .eq('is_active', true),
      supabase
        .from('cars_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', userId),
    ]);

    if (publishedCountResult.error) throw publishedCountResult.error;
    if (draftCountResult.error) throw draftCountResult.error;

    const currentCount = (publishedCountResult.count || 0) + (draftCountResult.count || 0);
    const isLimitReached = isTrialExpired || currentCount >= maxListings;

    return {
      isLimitReached,
      maxListings,
      currentCount,
      status,
      canAdd: !isTrialExpired && currentCount < maxListings,
      message: isTrialExpired ? 'Trial süreniz dolmuştur. Lütfen planınızı yükseltin.' : undefined,
    };
  },
};
