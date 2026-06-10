import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';

const CONVERSATION_PAGE_SIZE = 30;
const RECENT_MESSAGE_LOOKUP_LIMIT = 180;

export function useChatList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          buyer_id,
          seller_id,
          car_id,
          updated_at,
          car:cars ( id, title, brand, model, year, images ),
          buyer:profiles!buyer_id ( id, galeri_adi, ad_soyad ),
          seller:profiles!seller_id ( id, galeri_adi, ad_soyad )
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false })
        .range(0, CONVERSATION_PAGE_SIZE - 1);

      if (error) throw error;

      const conversationIds = (data || []).map((conversation: any) => conversation.id);
      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const [messagesResult, unreadResult] = await Promise.all([
        supabase
          .from('messages')
          .select('id,conversation_id,content,created_at,is_read,sender_id')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })
          .range(0, RECENT_MESSAGE_LOOKUP_LIMIT - 1),
        supabase
          .from('messages')
          .select('id,conversation_id')
          .in('conversation_id', conversationIds)
          .neq('sender_id', user.id)
          .eq('is_read', false),
      ]);

      if (messagesResult.error) throw messagesResult.error;
      if (unreadResult.error) throw unreadResult.error;

      const lastMessageByConversation = new Map<string, any>();
      (messagesResult.data || []).forEach((message: any) => {
        if (!lastMessageByConversation.has(message.conversation_id)) {
          lastMessageByConversation.set(message.conversation_id, message);
        }
      });

      const unreadCountByConversation = new Map<string, number>();
      (unreadResult.data || []).forEach((message: any) => {
        unreadCountByConversation.set(
          message.conversation_id,
          (unreadCountByConversation.get(message.conversation_id) || 0) + 1
        );
      });

      setConversations((data || []).map((conversation: any) => {
        const lastMessage = lastMessageByConversation.get(conversation.id);
        return {
          ...conversation,
          last_message: lastMessage ?? null,
          unread_count: unreadCountByConversation.get(conversation.id) || 0,
          messages: lastMessage ? [lastMessage] : [],
        };
      }));
    } catch (e) {
      console.error('Error fetching conversations:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    if (!user) return;

    const scheduleFetch = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        fetchConversations();
      }, 300);
    };

    // Realtime subscription for conversation updates
    try {
      const uniqueSuffix = Math.random().toString(36).slice(2, 8);
      const channelName = `conversations_list_mobile_${user.id}_${uniqueSuffix}`;
      const channel = supabase.channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
          scheduleFetch();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          scheduleFetch();
        });

      channel.subscribe();

      return () => {
        try {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          supabase.removeChannel(channel);
        } catch (remErr) {
          console.error('[useChatList] removeChannel error', remErr);
        }
      };
    } catch (e) {
      console.error('[useChatList] realtime setup failed', e);
    }
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}
