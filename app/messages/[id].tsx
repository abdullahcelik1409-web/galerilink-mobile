import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useMessages } from '@/hooks/use-messages';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRouteParam } from '@/lib/security';
import { chatRepository } from '@/features/chat/api/chat-repository';
import { useResolveConversation } from '@/features/chat/hooks/use-resolve-conversation';

export default function ChatRoomScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    receiverId?: string | string[];
    galleryName?: string | string[];
    carId?: string | string[];
  }>();
  const id = getRouteParam(params.id) ?? '';
  const receiverId = getRouteParam(params.receiverId);
  const galleryName = getRouteParam(params.galleryName);
  const carId = getRouteParam(params.carId);
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const insets = useSafeAreaInsets();

  const [inputMessage, setInputMessage] = useState('');
  const {
    conversation,
    resolvedConversationId,
    setResolvedConversationId,
    resolving,
    fetchConversationDetails,
  } = useResolveConversation({ id, userId: user?.id, receiverId, carId });
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const isBuyer = conversation?.buyer_id === user?.id;
  const otherParty = isBuyer ? conversation?.seller : conversation?.buyer;
  const otherPartyId = otherParty?.id || receiverId;
  const headerTitle = galleryName || otherParty?.galeri_adi || 'Sohbet';

  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    sending,
    isBlocked,
    sendMessage: hookSendMessage,
    loadOlderMessages,
  } = useMessages(resolvedConversationId, otherPartyId);
  const flatListRef = useRef<FlatList>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


  // ─── SEND MESSAGE ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputMessage.trim() || !user) return;

    if (resolvedConversationId) {
      shouldAutoScrollRef.current = true;
      const success = await hookSendMessage(inputMessage);
      if (success) {
        setInputMessage('');
      }
      return;
    }

    if (!receiverId) return;

    const messageContent = inputMessage.trim();
    setInputMessage(''); 

    try {
      const newConv = await chatRepository.createConversation({
        buyerId: user.id,
        sellerId: receiverId,
        carId: carId || null,
      });

      await chatRepository.createMessage({
        conversationId: newConv.id,
        senderId: user.id,
        content: messageContent,
      });
      await chatRepository.touchConversation(newConv.id);

      setResolvedConversationId(newConv.id);
      shouldAutoScrollRef.current = true;
      fetchConversationDetails(newConv.id);
    } catch (e) {
      console.error('Error creating conversation:', e);
      setInputMessage(messageContent); 
    }
  };

  // ─── STICKY DATE HEADERS ──────────────────────────────────────────
  const { processedData, stickyIndices } = useMemo(() => {
    if (!messages || messages.length === 0) return { processedData: [], stickyIndices: [] };
    
    const sorted = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const result: any[] = [];
    const indices: number[] = [];
    let lastDate = '';

    sorted.forEach((msg) => {
      const d = new Date(msg.created_at);
      const dateStr = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      
      let displayDate = dateStr;
      if (dateStr === todayStr) displayDate = 'Bugün';
      else if (dateStr === yesterdayStr) displayDate = 'Dün';
      
      if (displayDate !== lastDate) {
        indices.push(result.length);
        result.push({ isHeader: true, id: `header-${displayDate}`, title: displayDate });
        lastDate = displayDate;
      }
      result.push(msg);
    });
    
    return { processedData: result, stickyIndices: indices };
  }, [messages]);

  const renderMessage = useCallback(({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <View style={styles.dateHeaderContainer}>
          <Text style={[styles.dateHeaderText, { backgroundColor: theme === 'dark' ? '#18181B' : '#F1F5F9', color: colors.textSecondary }]}>
            {item.title}
          </Text>
        </View>
      );
    }

    const isMe = item.sender_id === user?.id;
    const bubbleBg = isMe 
      ? (theme === 'dark' ? '#1E3A8A' : colors.tint) // Koyu modda parlamayan Lacivert, açık modda Tint
      : (theme === 'dark' ? '#18181B' : '#F4F4F5');
    
    const textColor = isMe 
      ? '#FFFFFF' 
      : colors.text;

    const metaColor = isMe
      ? 'rgba(255,255,255,0.6)'
      : colors.textMuted;
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        <View style={[
          styles.messageBubble, 
          isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
          { backgroundColor: bubbleBg }
        ]}>
          <Text style={[styles.messageText, { color: textColor }]}>
            {item.content}
          </Text>
          
          <View style={styles.messageMetaContainer}>
            <Text style={[styles.timeTextBubble, { color: metaColor }]}>
              {new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && (
              <Ionicons 
                name="checkmark-done" 
                size={14} 
                color={item.is_read ? '#60A5FA' : 'rgba(255,255,255,0.4)'} 
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [colors, theme, user?.id]);

  const handleMessagesScroll = useCallback(({ nativeEvent }: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    shouldAutoScrollRef.current = distanceFromBottom < 80;

    if (contentOffset.y <= 24 && hasMore && !loadingOlder) {
      loadOlderMessages();
    }
  }, [hasMore, loadOlderMessages, loadingOlder]);

  const handleContentSizeChange = useCallback(() => {
    if (shouldAutoScrollRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  const isInitialLoading = resolving || (loading && !!resolvedConversationId);

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen 
        options={{
          headerTitle: headerTitle,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackTitle: '',
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          headerShadowVisible: false,
        }} 
      />

      {conversation?.car && (
        <TouchableOpacity 
          style={[styles.carInfoBanner, { backgroundColor: theme === 'dark' ? '#18181B' : '#F8FAFC', borderBottomColor: colors.surfaceBorder }]}
          onPress={() => router.push(`/listing/${conversation.car.id}`)}
        >
          <View style={[styles.carIconBox, { backgroundColor: colors.tint + '15' }]}>
            <Ionicons name="car" size={18} color={colors.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.carBannerText, { color: colors.text }]} numberOfLines={1}>
              {conversation.car.title || `${conversation.car.brand} ${conversation.car.model}`}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>İlan Detayına Git</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.surfaceBorder} />
        </TouchableOpacity>
      )}

      {isInitialLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={processedData}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          keyboardShouldPersistTaps="handled"
          onScroll={handleMessagesScroll}
          scrollEventThrottle={80}
          onContentSizeChange={handleContentSizeChange}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          initialNumToRender={16}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          ListHeaderComponent={
            loadingOlder ? (
              <ActivityIndicator size="small" color={colors.tint} style={styles.olderLoader} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme === 'dark' ? '#18181B' : '#F1F5F9' }]}>
                <Ionicons name="chatbubble-ellipses" size={40} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Yeni Sohbet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {galleryName ? `${galleryName} ile sohbete başlayın` : 'Henüz mesaj yok. Şimdi göndermeye başlayın!'}
              </Text>
            </View>
          }
        />
      )}

      {/* ─── FLOATING INPUT BAR ─── */}
      <View style={[
        styles.floatingInputWrapper, 
        { 
          paddingBottom: Platform.OS === 'android' && keyboardHeight > 0
            ? keyboardHeight + 16
            : Math.max(insets.bottom, 16),
        }
      ]}>
        {isBlocked ? (
          <View style={[styles.blockedBanner, { backgroundColor: theme === 'dark' ? '#18181B' : '#FEF2F2' }]}>
            <Ionicons name="shield-half" size={18} color={colors.error} />
            <Text style={[styles.blockedText, { color: colors.error }]}>Bu sohbet engellendi.</Text>
          </View>
        ) : (
          <View style={[
            styles.floatingInputBox, 
            { 
              backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF',
              borderColor: colors.surfaceBorder,
              borderWidth: theme === 'dark' ? 1 : 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 8,
            }
          ]}>
            <TouchableOpacity style={[styles.attachButton, { backgroundColor: theme === 'dark' ? '#27272A' : '#F8FAFC' }]}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>

            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Mesaj yazın..."
              placeholderTextColor={colors.textSecondary + '80'}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
              maxLength={500}
              editable={!sending}
            />
            
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                { 
                  backgroundColor: inputMessage.trim().length > 0 ? colors.text : colors.surfaceBorder,
                  opacity: sending ? 0.6 : 1
                }
              ]}
              onPress={handleSend}
              disabled={sending || inputMessage.trim().length === 0}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={colors.background} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    gap: 12,
  },
  carIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carBannerText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  olderLoader: {
    marginBottom: 12,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  messageWrapper: {
    maxWidth: '85%',
    marginBottom: 4,
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    position: 'relative',
    minWidth: 100,
  },
  messageBubbleMe: {
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  messageMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 8,
    right: 14,
  },
  timeTextBubble: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.7,
  },
  floatingInputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  floatingInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '500',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 10,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

