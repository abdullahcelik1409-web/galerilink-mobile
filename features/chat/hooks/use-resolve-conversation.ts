import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { chatRepository } from '../api/chat-repository';
import { isValidUuid } from '@/lib/security';

export function useResolveConversation(params: {
  id: string;
  userId?: string;
  receiverId?: string;
  carId?: string;
}) {
  const router = useRouter();
  const [conversation, setConversation] = useState<any>(null);
  const [resolvedConversationId, setResolvedConversationId] = useState<string | undefined>(
    params.id !== 'new' ? params.id : undefined
  );
  const [resolving, setResolving] = useState(params.id === 'new');

  const fetchConversationDetails = useCallback(async (convId: string) => {
    if (!convId || !params.userId) return null;
    const data = await chatRepository.getConversation(convId);
    setConversation(data);
    return data;
  }, [params.userId]);

  useEffect(() => {
    if (!params.userId) return;
    if (
      (params.id !== 'new' && !isValidUuid(params.id)) ||
      (params.id === 'new' && !isValidUuid(params.receiverId)) ||
      (params.carId && !isValidUuid(params.carId))
    ) {
      router.replace('/(tabs)/messages' as any);
      return;
    }

    if (params.id !== 'new') {
      void fetchConversationDetails(params.id);
      return;
    }

    if (!params.receiverId) return;

    void (async () => {
      setResolving(true);
      try {
        const existing = await chatRepository.findConversation({
          userId: params.userId!,
          receiverId: params.receiverId!,
          carId: params.carId,
        });
        if (existing) {
          setResolvedConversationId(existing.id);
          await fetchConversationDetails(existing.id);
        }
      } catch {
        // Keep the route open; sending can still create the conversation.
      } finally {
        setResolving(false);
      }
    })();
  }, [fetchConversationDetails, params.carId, params.id, params.receiverId, params.userId, router]);

  return {
    conversation,
    setConversation,
    resolvedConversationId,
    setResolvedConversationId,
    resolving,
    fetchConversationDetails,
  };
}
