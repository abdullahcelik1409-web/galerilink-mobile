import { supabase } from '@/lib/supabase';

const CONVERSATION_SELECT = `
  *,
  car:cars ( id, title, brand, model ),
  buyer:profiles!buyer_id ( id, galeri_adi ),
  seller:profiles!seller_id ( id, galeri_adi )
`;

export const chatRepository = {
  async findConversation(params: {
    userId: string;
    receiverId: string;
    carId?: string;
  }) {
    let query = supabase
      .from('conversations')
      .select('id')
      .or(
        `and(buyer_id.eq.${params.userId},seller_id.eq.${params.receiverId}),and(buyer_id.eq.${params.receiverId},seller_id.eq.${params.userId})`
      );

    if (params.carId) query = query.eq('car_id', params.carId);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getConversation(convId: string) {
    const { data, error } = await supabase
      .from('conversations')
      .select(CONVERSATION_SELECT)
      .eq('id', convId)
      .single();
    if (error) throw error;
    return data;
  },

  async createConversation(params: {
    buyerId: string;
    sellerId: string;
    carId?: string | null;
  }) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        buyer_id: params.buyerId,
        seller_id: params.sellerId,
        car_id: params.carId || null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  },

  async createMessage(params: {
    conversationId: string;
    senderId: string;
    content: string;
  }) {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content,
      })
      .select()
      .single();
    if (error) throw error;
  },

  async touchConversation(conversationId: string) {
    const { error } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (error) throw error;
  },
};
