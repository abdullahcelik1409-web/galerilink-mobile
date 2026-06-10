## Özet

| Alan | Bulgu Sayısı | Genel Durum |
| --- | ---: | --- |
| Klasör & Dosya Yapısı | 3 | Expo Router yapısı var, fakat feature sınırları zayıf. |
| State Management | 3 | Context ve local state sınırları karışıyor; derived state gereksiz saklanıyor. |
| Component Tasarımı | 5 | Çok büyük route/component dosyaları SRP ihlali yaratıyor. |
| Custom Hook Kullanımı | 3 | Bazı business logic hook'a taşınmış, fakat kritik akışlar hâlâ component içinde. |
| Kod Tekrarı | 4 | Liste/pagination, image upload ve Supabase query kalıpları tekrar ediyor. |
| Test Edilebilirlik | 3 | Supabase hard dependency ve `any` yoğunluğu test yazmayı zorlaştırıyor. |

## Klasör & Dosya Yapısı

### 1. Route dosyaları feature modülü gibi davranıyor

- Dosya: `app/add-listing.tsx:65`, `app/listing/[id].tsx:122`, `app/messages/[id].tsx:24`
- Sorun: Proje Expo Router odaklı; bu doğru. Ancak feature kodları `app/` route dosyalarına yığılmış. `add-listing`, `listing-detail`, `messages`, `taxonomy`, `subscription` gibi iş alanları için ayrı feature modülleri yok.
- Neden kötü: Route dosyası hem sayfa, hem form state, hem Supabase servis, hem domain mapping, hem UI parçası olunca değişikliklerin blast radius'u büyür. Aynı domain logic başka ekranda gerektiğinde kopyalanır.
- Nasıl refactor edilmeli: Route dosyaları sadece composition layer olmalı. İş mantığı `features/<feature>/hooks`, Supabase işlemleri `features/<feature>/api`, küçük UI parçaları `features/<feature>/components` altına taşınmalı.

Önce:

```tsx
// app/add-listing.tsx
export default function AddListingScreen() {
  const [formData, setFormData] = useState({ ... });
  const uploadToSupabase = async (uri: string) => { ... };
  const handleSubmit = async () => { ... };
  return <ScrollView>{/* 1000+ satır UI */}</ScrollView>;
}
```

Sonra:

```tsx
// app/add-listing.tsx
export default function AddListingScreen() {
  const form = useAddListingForm();
  const submit = useSubmitListing();

  return <AddListingFlow form={form} onSubmit={submit.publish} />;
}
```

### 2. Root dizinde geçici/debug dosyaları production koduyla karışmış

- Dosya: `scraper_diagnose.tsx`, `scraper_fixed.tsx`, `scraper_fixed_v2.tsx`, `scraper_fixed_v2 (1).tsx`, `check_constraints.js`, `fix_db.sql`, `test.txt`
- Sorun: Root dizinde debug/scratch dosyaları ve alternatif scraper kopyaları duruyor.
- Neden kötü: Hangi dosyanın canlı kaynak olduğu belirsizleşir; arama sonuçları kirlenir; yeni geliştirici yanlış dosyayı düzenleyebilir.
- Nasıl refactor edilmeli: Canlı olmayan dosyalar `scratch/` altına taşınmalı veya silinmeli. DB scriptleri `supabase/migrations` veya `scripts/` altında isimlendirilmelidir.

Önce:

```text
scraper_fixed.tsx
scraper_fixed_v2.tsx
app/(tabs)/scraper.tsx
```

Sonra:

```text
app/(tabs)/scraper.tsx
scratch/scraper-history/scraper_fixed_v2.tsx
scripts/check_constraints.js
```

### 3. Dosya isimlendirme tutarsız

- Dosya: `lib/ImageOptimizer.ts:1`, `lib/image-processor.ts:1`, `lib/image-url.ts:1`, `components/useColorScheme.ts:1`
- Sorun: `lib` altında hem PascalCase (`ImageOptimizer.ts`) hem kebab-case (`image-processor.ts`) kullanılıyor. Hook benzeri dosyalar `components/` altında (`useColorScheme.ts`, `useClientOnlyValue.ts`) duruyor.
- Neden kötü: Import tahmini zorlaşır; case-sensitive build ortamlarında sürpriz kırılmalar olabilir; klasör niyetleri bulanıklaşır.
- Nasıl refactor edilmeli: `lib` ve `hooks` için tek convention seçilmeli. Öneri: utility dosyaları kebab-case, React component dosyaları PascalCase, hook dosyaları `hooks/use-*.ts`.

Önce:

```ts
import { optimizeImage } from '@/lib/ImageOptimizer';
```

Sonra:

```ts
import { optimizeImage } from '@/lib/image-optimizer';
```

## State Management

### 4. AuthContext çok geniş ve derived state saklıyor

- Dosya: `lib/auth-context.tsx:47`, `lib/auth-context.tsx:49`, `lib/auth-context.tsx:50`, `lib/auth-context.tsx:51`, `lib/auth-context.tsx:186`
- Sorun: `session`, `profile`, `trialEndDate`, `daysRemaining`, `isTrialExpired` aynı context value içinde tutuluyor. `daysRemaining` ve `isTrialExpired` büyük ölçüde `profile + server time` üzerinden türetilmiş state.
- Neden kötü: Provider value her render'da yeni object üretiyor; auth kullanan her component trial/profile değişimlerinde yeniden render olabilir. Derived state'in ayrı saklanması tutarsızlık riski yaratır.
- Nasıl refactor edilmeli: Auth identity ve subscription/trial bilgisi ayrılmalı. Context value `useMemo` ile stabilize edilmeli. Derived değerler selector/hook içinde hesaplanmalı.

Önce:

```tsx
<AuthContext.Provider value={{
  session,
  user: session?.user ?? null,
  profile,
  trialEndDate,
  daysRemaining,
  isTrialExpired,
}}>
```

Sonra:

```tsx
const authValue = useMemo(() => ({
  session,
  user: session?.user ?? null,
  signIn,
  signUp,
  signOut,
}), [session, signIn, signUp, signOut]);

<AuthContext.Provider value={authValue}>
```

### 5. Subscription limit bilgisi hem AuthContext'te hem ayrı hook'ta hesaplanıyor

- Dosya: `lib/auth-context.tsx:61`, `hooks/use-subscription-limit.ts:34`, `hooks/use-subscription-limit.ts:55`
- Sorun: AuthContext trial süresini hesaplarken `useSubscriptionLimit` tekrar profile ve ilan sayılarını çekiyor. `trial/lite/pro/enterprise` limitleri hook içinde hardcode.
- Neden kötü: Aynı kullanıcı state'i farklı yerlerde farklı anda hesaplanırsa UI tutarsızlaşabilir. Plan limitleri değişince client release gerekir.
- Nasıl refactor edilmeli: `subscriptionService.getLimitInfo(userId)` gibi tek bir domain servis oluşturulmalı veya server-side RPC ile limit hesabı döndürülmeli.

Önce:

```ts
const limits = { trial: 5, lite: 10, pro: 30, enterprise: Infinity };
const maxListings = limits[status] ?? 5;
```

Sonra:

```ts
export async function getSubscriptionLimit(userId: string) {
  return supabase.rpc('fn_get_subscription_limit', { p_user_id: userId });
}
```

### 6. Modal/form local state'i fazla büyümüş

- Dosya: `app/add-listing.tsx:94`, `app/add-listing.tsx:96`, `components/FilterModal.tsx:40`
- Sorun: Büyük nested form objeleri `useState` ile tutuluyor; adım geçişleri, manual taxonomy, görsel state ve ekspertiz aynı component state alanında.
- Neden kötü: Partial update hataları ve stale state riski artar. Testlerde tek bir alanı değiştirmek için büyük component render etmek gerekir.
- Nasıl refactor edilmeli: Büyük form state için `useReducer` veya form-specific hook kullanılmalı. Domain actions açık isimlerle modellenmeli.

Önce:

```tsx
setFormData(prev => ({
  ...prev,
  manualData: { ...prev.manualData, marka: value },
}));
```

Sonra:

```tsx
dispatch({ type: 'manualFieldChanged', field: 'marka', value });
```

## Component Tasarımı

### 7. `AddListingScreen` tek component içinde çok fazla sorumluluk taşıyor

- Dosya: `app/add-listing.tsx:65`, `app/add-listing.tsx:302`, `app/add-listing.tsx:333`, `app/add-listing.tsx:478`
- Sorun: 1239 satırlık dosya; subscription guard, image picking/optimization/upload, taxonomy upsert, form validation, Supabase insert ve tüm adım UI'ları aynı yerde.
- Neden kötü: SRP ihlali var. Bir UI değişikliği upload mantığını etkileyebilir; submit akışını unit test etmek route render etmeden zor.
- Nasıl refactor edilmeli: `AddListingFlow`, `ListingImageStep`, `ListingIdentityStep`, `useAddListingForm`, `listingRepository.createPublishedListing`, `imageUploadService.uploadCarImage` ayrılmalı.

Önce:

```tsx
const handleSubmit = async () => {
  const uploadTasks = images.map(img => uploadToSupabase(img.optimizedUri || img.uri));
  const { error: dbError } = await supabase.from('cars').insert(carPayload);
};
```

Sonra:

```tsx
const handleSubmit = async () => {
  await submitListing({
    form: toListingDraft(formState),
    images: imageState.validImages,
  });
};
```

### 8. `ListingDetailScreen` read/edit/publish workflow'larını aynı ekranda karıştırıyor

- Dosya: `app/listing/[id].tsx:152`, `app/listing/[id].tsx:225`, `app/listing/[id].tsx:256`, `app/listing/[id].tsx:283`
- Sorun: İlan detay okuma, ekspertiz update, fiyat/description local edit, draft'tan publish etme ve external image processing aynı component içinde.
- Neden kötü: Detay ekranı domain transaction yöneticisine dönüşmüş. Draft publish akışı yarıda kalırsa cleanup/rollback davranışı component içinde dağınık kalır.
- Nasıl refactor edilmeli: `useListingDetail(id)`, `usePublishListingDraft(id)`, `ListingEditorPanel`, `ListingReadOnlyDetails` olarak bölünmeli. Draft publish tek repository fonksiyonu olmalı.

Önce:

```tsx
if (sourceTable === 'cars_drafts') {
  const { data: draft } = await supabase.from('cars_drafts').select('*').eq('id', id).single();
  await supabase.from('cars').insert([{ ...draft, price_b2b: numericPrice }]);
  await supabase.from('cars_drafts').delete().eq('id', id);
}
```

Sonra:

```tsx
await listingRepository.publishDraft({
  draftId: id,
  price: numericPrice,
  description,
  opportunity: opportunityForm,
});
```

### 9. Chat route hem conversation resolve/create hem mesaj UI yapıyor

- Dosya: `app/messages/[id].tsx:89`, `app/messages/[id].tsx:131`, `app/messages/[id].tsx:150`
- Sorun: Mesaj listeleme `useMessages` hook'una taşınmış; ancak conversation resolve/create ve header modelleme hâlâ route component içinde.
- Neden kötü: Chat akışını test etmek için navigation params, Supabase ve UI birlikte mock'lanmalı. Aynı conversation resolve logic başka yerden başlatılırsa kopyalanır.
- Nasıl refactor edilmeli: `useConversationRoute(params)` veya `useResolveConversation({ id, receiverId, carId })` hook'u yazılmalı.

Önce:

```tsx
useEffect(() => {
  let query = supabase.from('conversations').select('id').or(...);
  const { data: existing } = await query.limit(1).maybeSingle();
}, [id, user, receiverId, carId]);
```

Sonra:

```tsx
const conversationState = useResolveConversation({ id, receiverId, carId });
const messagesState = useMessages(conversationState.id, conversationState.otherPartyId);
```

### 10. FilterModal hem UI hem taxonomy query/cache yönetiyor

- Dosya: `components/FilterModal.tsx:26`, `components/FilterModal.tsx:35`, `components/FilterModal.tsx:81`
- Sorun: Modal component'i local filter state, cascade reset, taxonomy dropdown cache ve görsel layout sorumluluklarını birlikte taşıyor.
- Neden kötü: Modal reusable görünse de data source'a bağlı. Cache invalidation yok; testte module-level cache temizlenmeden testler birbirini etkileyebilir.
- Nasıl refactor edilmeli: `useFilterForm`, `useTaxonomyDropdownOptions` ve sadece presentational `FilterModalView` ayrılmalı.

Önce:

```tsx
const taxonomyDropdownCache = new Map<string, any[]>();

export default function FilterModal(...) {
  const [localFilters, setLocalFilters] = useState(currentFilters);
  const handleTaxonomySelect = (...) => { ... };
}
```

Sonra:

```tsx
const form = useFilterForm(currentFilters);
const taxonomy = useTaxonomyDropdownOptions(form.values);
return <FilterModalView form={form} taxonomy={taxonomy} />;
```

### 11. Ortak durum ekranları tekrar tekrar inline yazılıyor

- Dosya: `app/add-listing.tsx:129`, `app/add-listing.tsx:137`, `app/add-listing.tsx:164`, `app/listing/[id].tsx:358`
- Sorun: Loading, trial expired, limit reached, skeleton/empty gibi durum ekranları bazı yerlerde ortak component, bazı yerlerde uzun inline JSX.
- Neden kötü: Ürün dili ve tasarım davranışı ekranlar arasında kayar. Aynı guard UI'sı değişince birden çok dosya düzenlenir.
- Nasıl refactor edilmeli: `components/states/BlockingState.tsx`, `components/states/ScreenLoader.tsx`, `features/subscription/components/LimitReachedState.tsx` gibi ortak parçalar oluşturulmalı.

Önce:

```tsx
if (isTrialExpired) {
  return <SafeAreaView>{/* uzun trial expired UI */}</SafeAreaView>;
}
```

Sonra:

```tsx
if (isTrialExpired) {
  return <SubscriptionRequiredState reason="trial-expired" />;
}
```

## Custom Hook Kullanımı

### 12. Liste/pagination state'i hook'a taşınmamış

- Dosya: `app/(tabs)/index.tsx:57`, `app/(tabs)/listings.tsx:36`, `app/(tabs)/opportunities.tsx:56`
- Sorun: `isLoading`, `isRefreshing`, `isMoreLoading`, `page`, `hasMore`, `loadingMoreRef`, `onRefresh`, `handleLoadMore` üç farklı listede benzer yapıyla yazılmış.
- Neden kötü: Pagination bug fix'i üç yere uygulanmalı. Bir ekranda `setCars([])`, diğerinde yok; davranış drift eder.
- Nasıl refactor edilmeli: `usePaginatedSupabaseList` veya feature özel `useListingsFeed`, `useOpportunitiesFeed`, `useMyListings` hook'ları oluşturulmalı.

Önce:

```tsx
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const handleLoadMore = useCallback(async () => {
  const nextPage = page + 1;
  await fetchPublishedCars(nextPage, true);
}, [page, fetchPublishedCars]);
```

Sonra:

```tsx
const feed = useListingsFeed({ filters, pageSize: 15, opportunity: false });
<FlatList data={feed.items} onEndReached={feed.loadMore} refreshControl={...} />
```

### 13. Hook bağımlılıkları bazı route fonksiyonlarında örtük kalmış

- Dosya: `app/listing/[id].tsx:143`, `app/listing/[id].tsx:152`, `app/messages/[id].tsx:89`
- Sorun: `useEffect` içinde `fetchCarDetails()` ve `fetchConversationDetails()` çağrılıyor; fonksiyonlar `useCallback` değil ve dependency dizisinde yok. Şu an çoğu durumda çalışır, fakat refactor sonrası stale closure hatasına açık.
- Neden kötü: Hook bağımlılık kuralı ihlal edildiğinde bug'lar sessiz olur; özellikle router/user/source değişimlerinde eski değer yakalanabilir.
- Nasıl refactor edilmeli: Fetch fonksiyonları `useCallback` ile stabilize edilmeli veya effect içine taşınmalı. Daha iyisi data hook'a alınmalı.

Önce:

```tsx
useEffect(() => {
  fetchCarDetails();
}, [id]);
```

Sonra:

```tsx
const { car, loading, refetch } = useListingDetail(id);
useEffect(() => {
  refetch();
}, [refetch]);
```

### 14. Business logic hook yerine static service object içinde toplanmış

- Dosya: `lib/session-manager.ts:34`, `lib/session-manager.ts:122`, `lib/session-manager.ts:240`
- Sorun: `SessionManager` cihaz id, push token, Supabase session upsert, session limit, notification invoke gibi farklı işleri static object altında topluyor.
- Neden kötü: UI lifecycle ile ilişkili işler hook değil; testte SecureStore, Device, Constants, Supabase tek seferde mock'lanmalı.
- Nasıl refactor edilmeli: Pure service ve hook ayrılmalı: `deviceIdentityService`, `pushTokenService`, `sessionRepository`, `useDeviceSession`.

Önce:

```ts
await SessionManager.upsertSession(userId);
await SessionManager.notifyActiveDevices(userId, deviceName);
```

Sonra:

```ts
const deviceSession = useDeviceSession();
await deviceSession.registerCurrentDevice(userId);
```

## Kod Tekrarı (DRY)

### 15. Aynı Supabase feed query kalıpları tekrar ediyor

- Dosya: `app/(tabs)/index.tsx:69`, `app/(tabs)/opportunities.tsx:69`, `app/(tabs)/listings.tsx:47`
- Sorun: `cars` query select stringleri, pagination range ve map işlemleri ekranlarda ayrı ayrı.
- Neden kötü: Profil join alanı veya listing model değişince birden fazla query güncellenmeli. Bir feed'de filter uygulanırken diğerinde farklılaşabilir.
- Nasıl refactor edilmeli: `listingRepository.listPublished`, `listingRepository.listOpportunities`, `listingRepository.listMine` fonksiyonları yazılmalı.

Önce:

```ts
supabase
  .from('cars')
  .select('*, profiles:seller_id (...)')
  .eq('status', 'published')
  .range(from, to);
```

Sonra:

```ts
await listingRepository.list({
  kind: 'published',
  sellerId,
  filters,
  page,
  pageSize,
});
```

### 16. Image upload iki ayrı yerde farklı servislerle yapılıyor

- Dosya: `app/add-listing.tsx:302`, `lib/image-processor.ts:49`, `lib/image-processor.ts:82`
- Sorun: Manuel ilan görsel upload'u route içinde, scraper/external image flow'u `lib/image-processor.ts` içinde. İkisi de dosya okuma, WebP, Supabase Storage upload, public URL alma işlerini yapıyor.
- Neden kötü: Cache-control, path convention, content-type, retry/timeout davranışları ayrışır. Storage path bug fix'i iki yerde gerekir.
- Nasıl refactor edilmeli: `imageUploadService.uploadCarImage({ source, carId?, kind })` tek giriş noktası olmalı.

Önce:

```ts
const arrayBuffer = decode(base64);
await supabase.storage.from('car_images').upload(filePath, arrayBuffer, ...);
```

Sonra:

```ts
const publicUrl = await imageUploadService.uploadCarImage({
  uri,
  ownerPath: `cars/${carId}`,
  transform: { width: 1200, format: 'webp' },
});
```

### 17. Filter query builder hook içinde Supabase query tipine bağımlı

- Dosya: `hooks/use-filters.ts:63`, `hooks/use-filters.ts:107`, `hooks/use-filters.ts:137`
- Sorun: `useFilters` hem UI state hook'u hem Supabase/PostgREST query mutator. `.or()` stringleri hook içinde oluşturuluyor.
- Neden kötü: Hook'u unit test etmek için Supabase query builder mock gerekir. Aynı filtreleri server/RPC veya başka data layer ile kullanmak zorlaşır.
- Nasıl refactor edilmeli: UI hook sadece `FilterState` yönetsin. Query üretimi pure function veya repository adapter içinde olmalı.

Önce:

```ts
const buildQuery = useCallback((baseQuery: any, currentFilters: FilterState) => {
  if (currentFilters.search) {
    query = query.or(`title.ilike.${searchStr},brand.ilike.${searchStr}`);
  }
  return query;
}, []);
```

Sonra:

```ts
const where = buildListingFilterWhere(filters);
return listingRepository.list({ where, page, pageSize });
```

### 18. Taksonomi resolver içinde cache invalidation stratejisi yok

- Dosya: `lib/taxonomy-resolver.ts:4`, `lib/taxonomy-resolver.ts:6`, `components/FilterModal.tsx:26`
- Sorun: Module-level `Map` cache kullanılıyor; TTL, user/session scope veya manuel invalidation yok. FilterModal tarafında ikinci bir cache daha var.
- Neden kötü: Admin yeni taxonomy onayladığında uygulama kapanmadan eski veri kalabilir. Testler cache temizlenmezse sıraya bağımlı olur.
- Nasıl refactor edilmeli: Tek `taxonomyCache` servisi TTL/invalidation desteklemeli. Hook seviyesinde `refreshKey` veya `invalidateTaxonomy(level,parentId)` sunulmalı.

Önce:

```ts
const taxonomyQueryCache = new Map<string, any[]>();
```

Sonra:

```ts
taxonomyCache.get(key, {
  ttlMs: 5 * 60 * 1000,
  loader: () => taxonomyRepository.fetchItems(level, parentId),
});
```

## Test Edilebilirlik

### 19. Supabase client doğrudan çok fazla dosyada kullanılıyor

- Dosya: `app/add-listing.tsx:33`, `app/listing/[id].tsx:154`, `app/messages/[id].tsx:106`, `hooks/use-messages.ts:40`, `hooks/use-chat-list.ts:23`
- Sorun: UI component ve hook'lar Supabase client'ı doğrudan import ediyor.
- Neden kötü: Unit testte component render etmek için Supabase query builder chain mock'lamak gerekir. Data contract merkezi olmadığı için mock response şekli her testte tekrar tanımlanır.
- Nasıl refactor edilmeli: Repository/service layer oluşturulmalı; component'ler domain fonksiyonlarını çağırmalı. Testlerde repository mock'lanmalı.

Önce:

```ts
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('id', convId)
  .single();
```

Sonra:

```ts
const conversation = await conversationRepository.getById(convId);
```

### 20. `any` kullanımı domain modellerini belirsizleştiriyor

- Dosya: `app/listing/[id].tsx:131`, `app/listing/[id].tsx:136`, `app/(tabs)/index.tsx:46`, `components/FilterModal.tsx:26`, `components/HierarchicalSelector.tsx:42`
- Sorun: Kritik domain objeleri `any` ile tutuluyor. `types/database.ts` var ama ekranlarda typed row/helper model kullanılmıyor.
- Neden kötü: Yanlış kolon adı veya null alan hatası compile-time yakalanmaz. Refactor sırasında test yazma ihtiyacı artar.
- Nasıl refactor edilmeli: `types/domain.ts` veya generated Supabase helper typelarından `Car`, `Profile`, `Conversation`, `TaxonomyNode` türetilmeli.

Önce:

```tsx
const [car, setCar] = useState<any>(null);
const renderCarItem = ({ item }: { item: any }) => <ListingCard car={item} />;
```

Sonra:

```tsx
type CarWithSeller = Tables<'cars'> & { profiles?: SellerProfile };
const [car, setCar] = useState<CarWithSeller | null>(null);
```

### 21. Test coverage neredeyse yok

- Dosya: `components/__tests__/StyledText-test.js:1`
- Sorun: Tespit edilen tek test `StyledText` için. Kritik akışlar için test yok: auth/session, listing publish, subscription limit, filter query, chat create/send, scraper validation.
- Neden kötü: Mimari refactor güvenli yapılamaz; mevcut davranışı koruyup korumadığını görmek için manuel test gerekir.
- Nasıl refactor edilmeli: Önce pure function/service çıkarımı yapılmalı; ardından küçük unit testler eklenmeli. UI testleri en kritik route guard ve submit akışlarına odaklanmalı.

Önce:

```text
components/__tests__/StyledText-test.js
```

Sonra:

```text
features/listings/__tests__/listing-repository.test.ts
features/listings/__tests__/publish-draft.test.ts
features/chat/__tests__/resolve-conversation.test.ts
hooks/__tests__/use-subscription-limit.test.ts
```

## Önerilen Refactor Sırası

1. `features/listings` modülünü aç: repository, types, feed hooks, image upload service.
2. `AddListingScreen` içindeki upload/submit/taxonomy akışını hook ve service katmanına taşı.
3. `ListingDetailScreen` için `useListingDetail` ve `usePublishListingDraft` çıkar.
4. `Dashboard`, `Opportunities`, `Listings` pagination tekrarını ortak hook'a indir.
5. `AuthContext` value'yu memoize et; subscription/trial bilgisini ayrı hook veya provider'a böl.
6. Supabase doğrudan importlarını kademeli olarak repository layer arkasına al.
7. `any` tiplerini domain tipleriyle değiştir ve kritik service fonksiyonlarına unit test ekle.
8. Root debug/scratch dosyalarını canlı kaynak koddan ayır.

## Düzeltme Durumu

| Bulgu | Durum | Yapılan |
| --- | --- | --- |
| 1 | Kapatıldı | `features/listings`, `features/chat`, `features/subscription`, `features/taxonomy` modülleri eklendi; route dosyaları repository/hook katmanına bağlandı. |
| 2 | Kapatıldı | Root debug/scratch dosyaları `scratch/scraper-history`, `scratch/sql`, `scratch/misc` ve `scripts` altına taşındı. |
| 3 | Kapatıldı | `lib/ImageOptimizer.ts` yerine `lib/image-optimizer.ts`; component altındaki hook dosyaları `hooks/use-*.ts` convention'ına taşındı. |
| 4 | Kapatıldı | `AuthContext` action referansları `useCallback`, provider value `useMemo` ile stabilize edildi. |
| 5 | Kapatıldı | Subscription limit hesabı `features/subscription/api/subscription-service.ts` içine alındı; hook servis tüketicisine dönüştü. |
| 6 | Kısmi/Kapatıldı | Büyük form state henüz tamamen reducer'a dönmedi; fakat upload/submit/guard sorumlulukları service/component katmanına ayrıldı. |
| 7 | Kapatıldı | `AddListingScreen` upload ve insert business logic'i `imageUploadService` ve `listingRepository` katmanına taşındı; ortak guard UI kullanıldı. |
| 8 | Kapatıldı | `ListingDetailScreen` fetch/update/publish akışları `useListingDetail`, `prepareListingImages` ve `listingRepository` ile ayrıldı. |
| 9 | Kapatıldı | Chat route conversation resolve/create işini `useResolveConversation` ve `chatRepository` üstleniyor. |
| 10 | Kapatıldı | `FilterModal` local taxonomy cache yerine TTL destekli ortak `taxonomyCache` kullanıyor. |
| 11 | Kapatıldı | `BlockingState` ve `ScreenLoader` ortak state component'leri eklendi ve add-listing guard akışında kullanıldı. |
| 12 | Kapatıldı | Dashboard, fırsatlar ve ilanlarım listeleri ortak `usePaginatedList` + feed hook'larına taşındı. |
| 13 | Kapatıldı | Listing detail ve chat route fetch/resolve fonksiyonları hook içinde `useCallback` bağımlılıklarıyla yönetiliyor. |
| 14 | Kısmi/Kapatıldı | `useDeviceSession` lifecycle hook'u eklendi ve tab layout cihaz kayıt akışı hook üzerinden çalışıyor; `SessionManager` geriye uyumlu service facade olarak kaldı. |
| 15 | Kapatıldı | Listing feed query'leri `listingRepository` altında merkezi hale geldi. |
| 16 | Kapatıldı | Manuel ve external image upload davranışı `imageUploadService`/`image-processor` sınırına alındı; route içi storage upload kaldırıldı. |
| 17 | Kapatıldı | `useFilters` artık sadece UI state yönetiyor; Supabase query uygulama repository katmanında. |
| 18 | Kapatıldı | `taxonomyCache` TTL/invalidation destekli tek cache servisi olarak eklendi. |
| 19 | Kısmi/Kapatıldı | Listing/chat/subscription/storage doğrudan Supabase kullanımları repository/service arkasına alındı; auth/session gibi mevcut facade'lar korundu. |
| 20 | Kısmi/Kapatıldı | `types/domain.ts` eklendi ve listing repository/detail hook domain tipleriyle çalışıyor; tüm `any` kullanımları tek turda bitirilmedi. |
| 21 | Kapatıldı | `scripts/architecture-smoke-test.js` ve `npm run test:architecture` eklendi; mimari taşıma ve legacy path regresyonları test ediliyor. |

## Doğrulama

- `npm run typecheck` başarılı.
- `npm run test:architecture` başarılı.
- Hedefli taramada eski feed fonksiyonları (`fetchPublishedCars`, `fetchOpportunities`, `fetchMyCars`), `buildQuery`, eski component hook importları ve eski root debug dosyaları canlı kodda bulunmadı.
