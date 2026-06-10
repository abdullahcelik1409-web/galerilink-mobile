import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  SubscriptionLimitInfo,
  subscriptionService,
} from '@/features/subscription/api/subscription-service';

export function useSubscriptionLimit(): SubscriptionLimitInfo & { refreshLimit: () => Promise<void> } {
  const { user, isTrialExpired } = useAuth();
  const [info, setInfo] = useState<SubscriptionLimitInfo>({
    isLimitReached: false,
    maxListings: 10,
    currentCount: 0,
    status: 'trial',
    isLoading: true,
    canAdd: true,
  });

  const checkLimit = useCallback(async () => {
    if (!user) {
      setInfo(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const limitInfo = await subscriptionService.getLimitInfo(user.id, isTrialExpired);
      setInfo({
        ...limitInfo,
        isLoading: false,
      });
    } catch {
      setInfo(prev => ({ ...prev, isLoading: false }));
    }
  }, [user, isTrialExpired]);

  useEffect(() => {
    void checkLimit();
  }, [checkLimit]);

  return { ...info, refreshLimit: checkLimit };
}
