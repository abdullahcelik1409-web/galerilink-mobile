import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const MESSAGES_PAGE_SIZE = 40;

export function useMessages(conversationId: string | undefined, otherPartyId: string | undefined) {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !conversationId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Check block status
      if (otherPartyId) {
        const { data: blockData } = await supabase
          .from('blocks')
          .select('id')
          .or(`and(blocker_id.eq.${otherPartyId},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${otherPartyId})`);
        
        if (blockData && blockData.length > 0) {
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
      }

      // 2. Fetch messages
      const { data, error } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_id,content,created_at,is_read')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(0, MESSAGES_PAGE_SIZE - 1);

      if (!error && data) {
        const orderedMessages = [...data].reverse();
        setMessages(orderedMessages);
        setHasMore(data.length === MESSAGES_PAGE_SIZE);
        
        // 3. Mark unread messages from other user as read
        const unreadIds = orderedMessages
          .filter((m: any) => !m.is_read && m.sender_id !== user.id)
          .map((m: any) => m.id);
          
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds);
        }
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  }, [user, conversationId, otherPartyId]);

  const loadOlderMessages = useCallback(async () => {
    if (!user || !conversationId || loadingOlder || !hasMore || messages.length === 0) return;
    const oldestMessage = messages[0];
    if (!oldestMessage?.created_at) return;

    setLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id,conversation_id,sender_id,content,created_at,is_read')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .range(0, MESSAGES_PAGE_SIZE - 1);

      if (error) throw error;
      const olderMessages = [...(data || [])].reverse();
      setMessages(prev => {
        const existingIds = new Set(prev.map((message: any) => message.id));
        const uniqueOlder = olderMessages.filter((message: any) => !existingIds.has(message.id));
        return [...uniqueOlder, ...prev];
      });
      setHasMore((data || []).length === MESSAGES_PAGE_SIZE);
    } catch (e) {
      console.error('Error loading older messages:', e);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasMore, loadingOlder, messages, user]);

  useEffect(() => {
    fetchMessages();

    if (!user || !conversationId) return;

    // Realtime subscription
    const channel = supabase.channel(`chat_mobile_${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload: any) => {
        // Deduplicate: skip if message already exists (from optimistic insert)
        setMessages(prev => {
          const exists = prev.some((m: any) => m.id === payload.new.id);
          if (exists) {
            // Replace optimistic version with server version
            return prev.map((m: any) => m.id === payload.new.id ? payload.new : m);
          }
          return [...prev, payload.new];
        });
        
        // Auto mark read if we are the recipient
        if (payload.new.sender_id !== user.id) {
           void (async () => {
             const { error } = await supabase
               .from('messages')
               .update({ is_read: true })
               .eq('id', payload.new.id);
             if (error) console.error('Error marking realtime message as read:', error);
           })().catch((error: unknown) => console.error('Error marking realtime message as read:', error));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload: any) => {
        setMessages(prev => prev.map((m: any) => m.id === payload.new.id ? payload.new : m));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending || isBlocked || !user || !conversationId) return false;

    // Optimistic UI: add message to list immediately
    const optimisticId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    setSending(true);
    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      }).select().single();

      if (!error && data) {
        // Replace optimistic message with real one from DB
        setMessages(prev => prev.map((m: any) => m.id === optimisticId ? data : m));
        // Update conversation updated_at
        await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        return true;
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter((m: any) => m.id !== optimisticId));
        console.error('Error sending message:', error);
        return false;
      }
    } catch (e) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter((m: any) => m.id !== optimisticId));
      console.error('Error sending message:', e);
      return false;
    } finally {
      setSending(false);
    }
  };

  return { messages, loading, loadingOlder, hasMore, sending, isBlocked, sendMessage, loadOlderMessages, refetch: fetchMessages };
}
