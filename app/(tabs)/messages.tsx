import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useChatList } from '@/hooks/use-chat-list';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Premium B2B Conversation Item with React.memo
const ConversationItem = memo(({ item, user, theme, colors, router }: any) => {
  const isBuyer = item.buyer_id === user?.id;
  const otherParty = isBuyer ? item.seller : item.buyer;
  
  const lastMessage = item.last_message ?? item.messages?.[0];
  const unreadCount = item.unread_count ?? 0;

  const galleryName = otherParty?.galeri_adi || 'Bilinmeyen Kullanıcı';
  const initial = galleryName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity 
      style={[styles.conversationItem, { backgroundColor: colors.background }]}
      onPress={() => router.push(`/messages/${item.id}` as any)}
      activeOpacity={0.6}
    >
      <View style={styles.itemContainer}>
        {/* Left: Premium Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#18181B' : '#F4F4F5', borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
          <Text style={[styles.avatarText, { color: colors.text }]}>{initial}</Text>
          {unreadCount > 0 && <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />}
        </View>

        {/* Right: Content */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {galleryName}
            </Text>
            {lastMessage && (
              <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
                {new Date(lastMessage.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          
          {item.car && (
            <View style={styles.carRefRow}>
              <View style={[styles.carBadge, { backgroundColor: theme === 'dark' ? '#27272A' : '#F1F5F9' }]}>
                <Ionicons name="car-outline" size={10} color={colors.tint} />
                <Text style={[styles.carRefText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.car.brand} {item.car.model}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.messageRow}>
            {lastMessage ? (
              <View style={styles.lastMessageContainer}>
                {lastMessage.sender_id === user?.id && (
                  <Ionicons 
                    name="checkmark-done" 
                    size={14} 
                    color={lastMessage.is_read ? '#3B82F6' : colors.tabIconDefault} 
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text 
                  style={[
                    styles.lastMessageText, 
                    { 
                      color: unreadCount > 0 ? colors.text : colors.textSecondary, 
                      fontWeight: unreadCount > 0 ? '600' : '400' 
                    }
                  ]}
                  numberOfLines={1}
                >
                  {lastMessage.content}
                </Text>
              </View>
            ) : (
              <Text style={[styles.noMessageText, { color: colors.tabIconDefault }]}>Henüz mesaj yok</Text>
            )}
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={16} color={colors.surfaceBorder} />
      </View>
    </TouchableOpacity>
  );
});

export default function MessagesScreen() {
  const { conversations, loading } = useChatList();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const router = useRouter();

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ConversationItem 
      item={item} 
      user={user} 
      theme={theme} 
      colors={colors} 
      router={router} 
    />
  ), [user, theme, colors, router]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: theme === 'dark' ? '#18181B' : '#F8FAFC' }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.tint} style={{ opacity: 0.8 }} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Mesaj Kutusu Boş</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Henüz bir mesajlaşmanız bulunmuyor.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#000', // This should match background but simplified for now
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
  },
  carRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  carBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  carRefText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  lastMessageText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  noMessageText: {
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.5,
  },
});
