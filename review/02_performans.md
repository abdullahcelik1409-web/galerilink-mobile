## Ozet ve Oncelik Sirasi

| Onem | Adet |
| --- | ---: |
| Yuksek | 7 |
| Orta | 9 |
| Dusuk | 3 |

Bu rapor yalnizca performans acisindan hazirlandi. Bulgular kullanicinin en cok hissedecegi yerlerden baslayacak sekilde siralandi: ana ilan akislari, mesajlasma, ilan yonetimi, gorsel isleme, filtre/taksonomi ve navigation/bundle.

## Re-render Sorunlari

### 1. Yuksek - Ana feed item'lari her state degisiminde yeniden render oluyor

- Dosya: `app/(tabs)/index.tsx:138`, `app/(tabs)/index.tsx:181`, `components/ListingCard.tsx:18`
- Sorun: `renderCarItem` her render'da yeniden olusuyor, `FlatList` icinde `renderItem={({ item }) => ...}` inline yazilmis ve `ListingCard` `React.memo` ile sarilmamis. Refresh, load-more, profil fetch veya tema degisiminde gorunur listedeki kartlar tekrar hesaplanir.
- Oneri: Kart component'ini memoize et, `renderItem`, `keyExtractor`, `ListFooterComponent` ve `handleLoadMore` icin stabil callback kullan.

```tsx
const MemoListingCard = React.memo(ListingCard);

const handleOpenListing = useCallback((id: string | number) => {
  router.push(`/listing/${id}`);
}, [router]);

const renderCarItem = useCallback(({ item }: { item: Car }) => (
  <MemoListingCard
    car={item}
    isVerified={isVerified}
    onPress={() => handleOpenListing(item.id)}
  />
), [isVerified, handleOpenListing]);

<FlatList
  data={cars}
  keyExtractor={keyExtractor}
  renderItem={renderCarItem}
  ListFooterComponent={renderFooter}
/>
```

### 2. Yuksek - Firsat listesinde ayni re-render maliyeti tekrar ediyor

- Dosya: `app/(tabs)/opportunities.tsx:184`, `app/(tabs)/opportunities.tsx:232`, `components/ListingCard.tsx:18`
- Sorun: `renderOpportunityItem`, `handleCardPress`, `renderFooter` ve `renderItem` her render'da yeni referans uretiyor. `ListingCard` memoize olmadigi icin firsat havuzunda da liste item'lari gereksiz yeniden render olur.
- Oneri: Feed ile ortak `MemoListingCard`/`ListingList` yapiya gec ve event handler'lari `useCallback` ile sabitle.

```tsx
const renderOpportunityItem = useCallback(({ item }: { item: Opportunity }) => (
  <MemoListingCard
    car={item}
    onPress={() => handleCardPress(item.id)}
    isVerified={isVerified}
  />
), [handleCardPress, isVerified]);
```

### 3. Orta - `removeClippedSubviews={false}` uzun listelerde offscreen view'lari tutuyor

- Dosya: `app/(tabs)/index.tsx:190`, `app/(tabs)/opportunities.tsx:241`, `app/(tabs)/listings.tsx:215`
- Sorun: Uzun ilan listelerinde ekrandan cikan item'lar native view agacinda kalabilir. Ozellikle gorselli kartlarda memory ve scroll FPS etkilenir.
- Oneri: Sorunlu iOS kombinasyonlari test edilerek Android'de aktiflestir, sabit yukseklikli listelerde `getItemLayout` ekle.

```tsx
<FlatList
  removeClippedSubviews={Platform.OS === 'android'}
  initialNumToRender={8}
  maxToRenderPerBatch={4}
  updateCellsBatchingPeriod={50}
/>
```

### 4. Orta - `getItemLayout` eksik, sabit yukseklikli listelerde scroll hesaplari pahali

- Dosya: `app/(tabs)/listings.tsx:207`, `app/sessions.tsx:171`, `components/HierarchicalSelector.tsx:198`
- Sorun: `listings` kartlari 120px, session kartlari ve taxonomy row'lari pratikte sabit yukseklikli. `getItemLayout` olmadiginda RN her item'i olcerek ilerler.
- Oneri: Sabit row yuksekligini tek kaynaga al.

```tsx
const ROW_HEIGHT = 136;

<FlatList
  getItemLayout={(_, index) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  })}
/>
```

### 5. Orta - Taksonomi key fallback'i random oldugu icin item'lar remount olabilir

- Dosya: `components/HierarchicalSelector.tsx:201`
- Sorun: `Math.random().toString()` fallback'i bir item'da `id` yoksa her render'da yeni key uretir. Bu durum row state/animasyonlarini sifirlar ve listeyi bastan mount ettirir.
- Oneri: Stabil fallback kullan; mumkunse API'den id zorunlu gelsin.

```tsx
keyExtractor={(item, index) => String(item.id ?? `${currentLevel.key}-${item.name}-${index}`)}
```

### 6. Orta - Mesaj ekraninda `renderMessage` ve auto-scroll her mesajda layout calistiriyor

- Dosya: `app/messages/[id].tsx:215`, `app/messages/[id].tsx:317`, `app/messages/[id].tsx:318`
- Sorun: `renderMessage` memoize degil. Ayrica `onContentSizeChange` her mesaj/layout degisiminde `scrollToEnd` cagiriyor; uzun sohbetlerde klavye acilirken ve realtime mesaj gelirken jank yapar.
- Oneri: `renderMessage` icin `useCallback`, satir icin memo component ve `inverted` liste tercih et. Auto-scroll sadece kullanici sona yakinsa calissin.

```tsx
const renderMessage = useCallback(({ item }) => (
  <MemoMessageBubble item={item} userId={user?.id} theme={theme} colors={colors} />
), [user?.id, theme, colors]);

<FlatList
  inverted
  data={processedDataReversed}
  renderItem={renderMessage}
  maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
/>
```

### 7. Dusuk - Root navigation theme her render'da yeni obje uretiyor

- Dosya: `app/_layout.tsx:72`
- Sorun: `navigationTheme` obje literal'i her render'da degisiyor. `ThemeProvider` alt agacinda gereksiz hesaplamaya neden olabilir.
- Oneri: `useMemo` ile tema objesini sabitle.

```tsx
const navigationTheme = useMemo(() => ({
  dark: theme === 'dark',
  colors: { primary: Colors[theme].tint, background: Colors[theme].background },
  fonts: NAVIGATION_FONTS,
}), [theme]);
```

### 8. Dusuk - Modal/list row component'leri memoize degil

- Dosya: `components/TaxonomyPicker.tsx:41`, `components/MultiSelectModal.tsx:146`, `components/FilterModal.tsx:568`
- Sorun: Arama input'u her degistiginde gorunen tum row'lar yeni inline stiller ve handler'larla tekrar render oluyor.
- Oneri: Row'lari `React.memo` ile ayir, `renderItem` ve `toggleItem` icin `useCallback` kullan.

```tsx
const MemoOptionRow = React.memo(OptionRow);
const renderItem = useCallback(({ item }) => (
  <MemoOptionRow item={item} selected={selectedSet.has(item)} onToggle={toggleItem} />
), [selectedSet, toggleItem]);
```

## Image & Asset Yonetimi

### 9. Yuksek - Detay galerisi cache'siz `react-native` Image kullaniyor

- Dosya: `app/listing/[id].tsx:19`, `app/listing/[id].tsx:62`
- Sorun: Feed kartlarinda `expo-image` ve `cachePolicy` var, ancak detay galerisinde `react-native` Image kullaniliyor. Buyuk ilan gorselleri detay acilisinda tekrar decode/download edilebilir.
- Oneri: Detay galerisini de `expo-image` ile render et, placeholder/cache/transition ekle.

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: item as string }}
  style={styles.heroImage}
  contentFit="cover"
  cachePolicy="memory-disk"
  transition={150}
/>
```

### 10. Yuksek - Foto seciminde sinirsiz paralel optimizasyon CPU ve memory spike yapabilir

- Dosya: `app/add-listing.tsx:193`, `app/add-listing.tsx:209`
- Sorun: `allowsMultipleSelection: true` secim limiti olmadan aciliyor; sonra tum yeni gorseller `Promise.allSettled` ile ayni anda `ImageManipulator`'a giriyor. Cok foto secerse cihaz isinmasi, UI donmasi ve OOM riski olusur.
- Oneri: Secim limiti ve kucuk concurrency kuyruyu kullan.

```tsx
const MAX_IMAGES = 10;
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],
  allowsMultipleSelection: true,
  selectionLimit: MAX_IMAGES,
  quality: 0.8,
});

for (const img of newImages) {
  await optimizeOneImage(img);
}
```

### 11. Orta - Foto onizlemeleri optimize URI yerine ham URI ile render ediliyor

- Dosya: `app/add-listing.tsx:491`
- Sorun: Optimizasyon tamamlandiktan sonra bile preview `img.uri` ile render ediliyor. Kamera galerisi kaynaklari cok buyukse form ekraninda decode maliyeti yuksek kalir.
- Oneri: `optimizedUri` hazirsa onu kullan ve `expo-image` cache kullan.

```tsx
<Image
  source={{ uri: img.optimizedUri ?? img.uri }}
  style={styles.imagePreview}
  contentFit="cover"
  cachePolicy="memory-disk"
/>
```

### 12. Orta - Feed kartlari tam boy gorsel URL'sini thumbnail olarak kullaniyor

- Dosya: `components/ListingCard.tsx:47`, `components/OpportunityCard.tsx:45`, `app/(tabs)/listings.tsx:119`
- Sorun: Kartta 120-220px alana tam cozunurluklu ilan gorseli indiriliyor olabilir. Cache var ama ilk scroll ve data kullanimi agirlasir.
- Oneri: Upload sirasinda `thumb_` varyanti uret veya Supabase image transformation/CDN parametresi kullan; listelerde thumbnail URL alanini sec.

```tsx
const imageUrl = car.thumbnail_url ?? car.images?.[0];

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  cachePolicy="memory-disk"
/>
```

## Bundle & Load Suresi

### 13. Orta - Detay ekrani carousel paketini statik yukluyor

- Dosya: `app/listing/[id].tsx:30`
- Sorun: `react-native-reanimated-carousel` detay ekrani acilisinda statik import ediliyor. Metro/native bundlingde ekran kodu ayrisma sinirli oldugu icin agir UI paketi ilk bundle maliyetine katkida bulunabilir.
- Oneri: Galeri component'ini ayri dosyaya bol, sadece gorsel varsa render et; mumkunse daha hafif `FlatList horizontal pagingEnabled` ile basla.

```tsx
<FlatList
  horizontal
  pagingEnabled
  data={car.images}
  renderItem={renderHeroImage}
  keyExtractor={(uri) => uri}
/>
```

### 14. Dusuk - Splash var ama route bazli skeleton kapsami tutarsiz

- Dosya: `app/_layout.tsx:26`, `app/(tabs)/index.tsx:23`, `app/(tabs)/opportunities.tsx:22`, `app/(tabs)/listings.tsx:168`
- Sorun: App font yuklenene kadar splash kullaniliyor ve ana/firsat listesinde skeleton var. `listings`, `sessions`, `listing/[id]` gibi ekranlar spinner ile blokluyor; algisal performans feed kadar iyi degil.
- Oneri: Veri yuklenirken layout'u koruyan skeleton component'leri kullan.

```tsx
return isLoading ? <ListingDetailSkeleton /> : <ListingDetailContent car={car} />;
```

## Navigation Performansi

### 15. Yuksek - WebView tab'i ziyaret edildikten sonra bellekte kalir

- Dosya: `app/(tabs)/scraper.tsx:352`, `app/(tabs)/_layout.tsx:98`
- Sorun: Tab screen'ler ziyaret edildikten sonra genellikle mounted kalir. `scraper` tab'indaki `WebView` arka planda DOM, JS runtime ve sayfa cache'i tutabilir; diger tablara gecince bellek baskisi yaratir.
- Oneri: Scraper tab'i icin blur'da unmount/freeze stratejisi uygula.

```tsx
<Tabs.Screen
  name="scraper"
  options={{
    title: 'Ilan Cek',
    unmountOnBlur: true,
    freezeOnBlur: true,
  }}
/>
```

### 16. Orta - Tum tab ekranlari mounted kaldigi icin feed state'leri ve listeler bellekte birikiyor

- Dosya: `app/(tabs)/_layout.tsx:52`, `app/(tabs)/index.tsx:44`, `app/(tabs)/opportunities.tsx:43`, `app/(tabs)/listings.tsx:19`
- Sorun: Ana sayfa, firsatlar, ilanlarim ve scraper sirayla acildiginda her ekran kendi listelerini state'te tutar. Bu hizli geri donus icin iyi, fakat gorselli listelerde memory yukselir.
- Oneri: Hafif ekranlarda `freezeOnBlur`, agir ekranlarda `unmountOnBlur`; veya sadece liste verisini cache katmaninda tutup component state'ini temizle.

```tsx
<Tabs screenOptions={{ freezeOnBlur: true }}>
  <Tabs.Screen name="scraper" options={{ unmountOnBlur: true }} />
</Tabs>
```

## API & Veri Yonetimi

### 17. Yuksek - `Ilanlarim` ekraninda sayfalama yok ve `select('*')` kullaniliyor

- Dosya: `app/(tabs)/listings.tsx:29`, `app/(tabs)/listings.tsx:35`, `app/(tabs)/listings.tsx:207`
- Sorun: Kullanici cok ilan eklediginde tum satirlar ve tum kolonlar tek seferde cekilir. Sonra `displayedCars = cars.filter(...)` ile client tarafinda tekrar filtrelenir.
- Oneri: Gereken kolonlari sec, `range` ile sayfala ve `onEndReached` ekle.

```tsx
const PAGE_SIZE = 20;

const { data, error } = await supabase
  .from(table)
  .select('id,status,brand,model,year,km,price_b2b,images,created_at')
  .eq('seller_id', user.id)
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
```

### 18. Yuksek - `Ilanlarim` mount aninda iki kez fetch edebilir

- Dosya: `app/(tabs)/listings.tsx:48`, `app/(tabs)/listings.tsx:52`
- Sorun: Hem `useEffect` hem `useFocusEffect` ayni `fetchMyCars` fonksiyonunu cagiriyor. Ilk mount/focus sirasinda ayni veri iki kez istenebilir.
- Oneri: Tek mekanizma kullan; tab'a her donuste yenilemek isteniyorsa sadece `useFocusEffect` yeterli.

```tsx
useFocusEffect(
  useCallback(() => {
    fetchMyCars({ reset: true });
  }, [fetchMyCars])
);
```

### 19. Yuksek - Mesaj listesi tum mesaj gecmisini tek seferde cekiyor

- Dosya: `hooks/use-messages.ts:35`, `app/messages/[id].tsx:310`
- Sorun: `.select('*').eq(...).order(...)` ile sohbetin tum mesajlari geliyor. Eski sohbetlerde ilk acilis yavaslar ve `processedData` tum listeyi tekrar sort/map eder.
- Oneri: Son N mesaji cek, yukari scroll'da eski mesajlari sayfala.

```tsx
const PAGE_SIZE = 40;

const { data } = await supabase
  .from('messages')
  .select('id,conversation_id,sender_id,content,created_at,is_read')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: false })
  .range(0, PAGE_SIZE - 1);
```

### 20. Yuksek - Konusma listesi her conversation icin tum mesajlari nested cekiyor

- Dosya: `hooks/use-chat-list.ts:21`, `hooks/use-chat-list.ts:28`, `app/(tabs)/messages.tsx:15`
- Sorun: `messages (...)` nested select ile her konusmanin mesajlari geliyor, sonra her row icinde sort ve unread count hesaplaniyor. Konusma sayisi arttikca mesajlar ekraninin acilisi agirlasir.
- Oneri: DB view/RPC ile `last_message` ve `unread_count` don; mobile sadece summary ceksin.

```sql
-- Ornek view fikri
select
  c.id,
  c.updated_at,
  lm.content as last_message,
  lm.created_at as last_message_at,
  unread.count as unread_count
from conversations c;
```

```tsx
const { data } = await supabase
  .from('conversation_summaries')
  .select('id,updated_at,last_message,last_message_at,unread_count,car,buyer,seller')
  .order('updated_at', { ascending: false })
  .range(0, 29);
```

### 21. Orta - Ana feed ve firsatlar profil bilgisini her focus'ta tekrar cekiyor

- Dosya: `app/(tabs)/index.tsx:52`, `app/(tabs)/index.tsx:113`, `app/(tabs)/opportunities.tsx:51`, `app/(tabs)/opportunities.tsx:152`
- Sorun: `fetchCurrentUserProfile` her screen focus/refresh'te cagriliyor. Bu veri auth profile icinde zaten bulunabilecek, seyrek degisen bir gatekeeping bilgisi.
- Oneri: `AuthProvider` profile cache'ini kullan veya profile sorgusunu TTL ile cache'le.

```tsx
const { profile } = useAuth();
const isVerified = profile?.status === 'approved' || profile?.hesap_durumu === 'onaylandi';
```

### 22. Orta - Filtre dropdown'lari her acilista taksonomi sorgusu atiyor

- Dosya: `components/FilterModal.tsx:483`, `components/FilterModal.tsx:490`
- Sorun: Marka/seri/model dropdown acildikca ayni listeler tekrar Supabase'den cekiliyor. Kullanici filtreleri denerken gecikme hissedilir.
- Oneri: Parent id/name bazli in-memory cache veya React Query/SWR benzeri cache katmani kullan.

```tsx
const taxonomyCache = new Map<string, TaxonomyItem[]>();

async function getCachedTaxonomy(key: string, loader: () => Promise<TaxonomyItem[]>) {
  if (taxonomyCache.has(key)) return taxonomyCache.get(key)!;
  const data = await loader();
  taxonomyCache.set(key, data);
  return data;
}
```

### 23. Orta - Taksonomi resolver seri/model/motor icin ard arda cok sorgu yapiyor

- Dosya: `lib/taxonomy-resolver.ts:196`, `lib/taxonomy-resolver.ts:203`, `lib/taxonomy-resolver.ts:205`, `lib/taxonomy-resolver.ts:207`, `lib/taxonomy-resolver.ts:212`
- Sorun: `fetchModeller` marka -> seri -> yakit -> kasa -> sanziman -> model zincirini client'ta sirali sorgularla cozuyor. Mobil agda bu bir dropdown acilisini birden fazla round-trip'e boler.
- Oneri: Supabase RPC veya view ile bu zinciri database tarafinda tek cagriya indir.

```ts
const { data, error } = await supabase.rpc('get_models_for_brand_series', {
  p_brand: markaName,
  p_series: seriName,
});
```

### 24. Orta - Arama input'larinda debounce yok

- Dosya: `components/FilterModal.tsx:510`, `components/TaxonomyPicker.tsx:91`, `components/MultiSelectModal.tsx:54`, `app/add-listing.tsx:975`
- Sorun: Her klavye vurusunda buyuk array uzerinden filtreleme ve liste render'i tetikleniyor. Lokal filtreleme oldugu icin network yok, ama marka/model/sehir listelerinde UI thread etkilenebilir.
- Oneri: `useDeferredValue` veya 150ms debounce kullan.

```tsx
const deferredSearch = useDeferredValue(search);
const filteredItems = useMemo(() => {
  const q = deferredSearch.trim().toLocaleLowerCase('tr-TR');
  return q ? items.filter(item => normalize(item).includes(q)) : items;
}, [items, deferredSearch]);
```

### 25. Orta - Feedlerde duplicate page load guard atomik degil

- Dosya: `app/(tabs)/index.tsx:131`, `app/(tabs)/opportunities.tsx:169`
- Sorun: `onEndReached` hizli tetiklenirse `isMoreLoading` state'i guncellenmeden ikinci cagri baslayabilir. Bu duplicate API istegi ve ayni item'larin eklenmesiyle sonuclanabilir.
- Oneri: Ref tabanli request lock kullan.

```tsx
const loadingMoreRef = useRef(false);

const handleLoadMore = useCallback(async () => {
  if (loadingMoreRef.current || !hasMore || isLoading) return;
  loadingMoreRef.current = true;
  try {
    await fetchPublishedCars(page + 1, true);
  } finally {
    loadingMoreRef.current = false;
  }
}, [hasMore, isLoading, page, fetchPublishedCars]);
```
