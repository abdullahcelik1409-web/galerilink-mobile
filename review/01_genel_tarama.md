## Ozet

Kapsam: `app/`, `components/`, `hooks/`, `lib/`, `constants/`, `types/` ve proje kokundeki mobil uygulamayi etkileyen yapilandirma/credential dosyalari tarandi. Klasik `src/`, `screens/`, `navigation/`, `store/`, `services/`, `utils/` dizinleri bu projede bulunmuyor; proje Expo Router yapisinda.

`npx tsc --noEmit` calistirildi ve derleme basarisiz oldu. En kritik iki alan: repoda acikta duran gizli anahtarlar ve TypeScript derlemesini kiran dosyalar.

## Duzeltme Durumu

2026-06-01 tarihinde bulgular sirasiyla ele alindi. Kod tarafindaki duzeltmeler uygulandi ve `npx tsc --noEmit` basarili calisti. Key bulgularinda local kaynak temizlendi; ancak daha once gorunmus olan Supabase service role key ve Firebase service account private key mutlaka ilgili panellerden rotate edilmelidir.

| Onem | Adet |
|---|---:|
| 🔴 Kritik | 6 |
| 🟡 Orta | 18 |
| 🟢 Dusuk | 16 |
| Toplam | 40 |

## Kritik Bulgular

### 1. 🔴 `.env:3` - Supabase service role key mobil proje icinde duruyor

Sorun: `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` istemci projesinin kok `.env` dosyasinda. `EXPO_PUBLIC_*` degiskenleri mobil/web bundle tarafina sizabilir; service role anahtari RLS dahil tum guvenlik sinirlarini asabilir.

Oneri: Anahtari hemen rotate edin, `.env` dosyasindan kaldirin, service role gerektiren islemleri Supabase Edge Function veya backend uzerinden yapin. Mobil uygulamada yalnizca anon/publishable key kullanin.

### 2. 🔴 `galerilink-fcm-key.json:4` - Firebase service account private key repoda

Sorun: Firebase Admin SDK service account JSON dosyasi proje kokunde ve private key iceriyor. Bu dosya yanlislikla commit/paket/distribution icine girerse Firebase projesi ele gecirilebilir.

Oneri: Anahtari rotate edin, dosyayi repodan silin, `.gitignore` icine `galerilink-fcm-key.json` ve genel `*-service-account*.json` kurali ekleyin. Push gonderimini backend/Edge Function ortam degiskenleriyle yapin.

### 3. 🔴 `lib/image-processor.ts:89` - TypeScript derlemesi kiriliyor

Sorun: `processMultipleImages` `Promise<string[]>` donuyor ama `successful` dizisi `(string | null)[]`. `npx tsc --noEmit` bu nedenle hata veriyor.

Oneri: `map` sonrasinda type guard ile null degerleri temizleyin: `filter((url): url is string => typeof url === 'string' && url.length > 0)`.

### 4. 🔴 `supabase/functions/push-service/index.ts:2` - Deno Edge Function app tsconfig kapsaminda derleniyor

Sorun: Kok `tsconfig.json` tum `**/*.ts` dosyalarini dahil ettigi icin Deno Edge Function da React Native TypeScript derlemesine giriyor. `npm:@supabase/supabase-js@2`, `Deno` globali ve `unknown` error tipleri yuzunden `tsc` basarisiz.

Oneri: `tsconfig.json` icin `exclude: ["supabase/functions/**"]` ekleyin veya Edge Function'a ayri Deno tsconfig verin. Edge Function tarafinda `deno.json`/Deno tipleriyle ayri kontrol calistirin.

### 5. 🔴 `lib/session-manager.ts:31` - Cihaz kimligi benzersiz degil

Sorun: `deviceId` olarak `Device.osBuildId || Device.modelName || 'unknown_device'` kullaniliyor. Ayni model/OS build'e sahip farkli cihazlar ayni ID gibi gorunebilir; oturum limiti yanlis uygulanir veya baska cihazin oturumu kapatilabilir.

Oneri: Ilk acilista `expo-secure-store` icinde UUID uretip saklayin ve `device_id` olarak onu kullanin. Model/OS bilgisini sadece gorunen cihaz adi olarak tutun.

### 6. 🔴 `app/(tabs)/scraper.tsx:342` - WebView kaynak ve mesajlari yeterince kisitlanmiyor

Sorun: WebView tum `http/https` URL'lerine izin veriyor (`onShouldStartLoadWithRequest`) ve sayfadan gelen her `postMessage` verisi `SCRAPE_SUCCESS` ise kayit akisini tetikleyebiliyor. Kotu niyetli veya yanlis sayfa sahte ilan verisiyle taslak olusturabilir.

Oneri: Navigasyonu `sahibinden.com` origin'i ile sinirlayin, `handleMessage` icinde `currentUrl` host'unu dogrulayin, payload semasini validate edin ve `mixedContentMode="always"` kullanmayin.

## Orta Bulgular

### 7. 🟡 `app/add-listing.tsx:202` - Gorsel optimizasyonunda async hata ve unmount korumasi yok

Sorun: `newImages.forEach(async ...)` icindeki `optimizeImage` hata firlatirsa tekil catch yok; ekran kapanirsa `setImages` unmounted component uzerinde calisabilir.

Oneri: `Promise.allSettled` kullanin, component mounted flag/AbortController benzeri koruma ekleyin ve her gorsel icin hata state'i yazin.

### 8. 🟡 `components/SkeletonCard.tsx:13` - Animated loop cleanup yok

Sorun: `Animated.loop(...).start()` baslatiliyor fakat effect cleanup'inda animasyon durdurulmuyor. Liste gecislerinde gereksiz animasyonlar bellek/CPU tuketebilir.

Oneri: Animasyonu degiskene alin ve cleanup'ta `animation.stop()` cagrin.

### 9. 🟡 `components/LoginRequestModal.tsx:62` - Realtime approval subscription temizlenmiyor

Sorun: `SessionManager.listenForApproval` bir channel donduruyor ama modal kapandiginda veya tekrar istek atildiginda `removeChannel`/`unsubscribe` calismiyor.

Oneri: Channel referansini `useRef` ile saklayin; modal kapanisinda, timeout'ta ve unmount'ta `supabase.removeChannel(channel)` cagrin.

### 10. 🟡 `hooks/use-messages.ts:88` - Fire-and-forget update hata yutmuyor

Sorun: Okundu bilgisini isaretleyen `supabase.from(...).update(...).then()` zincirinde `catch` yok. Realtime callback icinde rejection olursa sessiz veya global unhandled rejection uretebilir.

Oneri: `void supabase...then(({ error }) => ...).catch(...)` seklinde hata loglayin veya helper fonksiyona alin.

### 11. 🟡 `hooks/use-chat-list.ts:11` - Kullanici yokken loading sonsuz kalabilir

Sorun: `fetchConversations` icinde `if (!user) return;` var ama `setLoading(false)` yok. Auth gecislerinde mesaj listesi loading durumunda kalabilir.

Oneri: Kullanici yokken `setConversations([])` ve `setLoading(false)` cagrin.

### 12. 🟡 `hooks/use-chat-list.ts:50` - Realtime tum conversation/message insertlerini dinliyor

Sorun: Channel filtreleri kullaniciya gore daraltilmamis. Her conversation degisikligi ve her message insert'i tum kullanicilarda `fetchConversations` tetikleyebilir.

Oneri: Mümkunse `buyer_id`/`seller_id` filtreli ayri kanallar veya server tarafli user-scoped feed kullanin. En azindan debounce ekleyin.

### 13. 🟡 `hooks/use-subscription-limit.ts:55` - Limit hesabi taslaklari saymiyor

Sorun: Sadece `cars` tablosundaki aktif ilanlar sayiliyor. `cars_drafts` ile olusturulan taslaklar limite dahil degil; scraper veya taslak akisi kotuye kullanilabilir.

Oneri: Limit politikasina gore `cars_drafts` tablosunu da sayin veya taslak/published icin ayri limit uygulayin.

### 14. 🟡 `hooks/use-filters.ts:96` - Seri/Model filtreleri yanlis kolon ve else-if nedeniyle eksik

Sorun: `selectedSeri` secildiginde `model` kolonuna seri adi ile filtre uygulanıyor; `selectedModel` ise `else if` oldugu icin seri seciliyken hic uygulanmiyor.

Oneri: `selectedSeri` icin `series` kolonunu, `selectedModel` icin `model` kolonunu ayri `if` bloklariyla uygulayin.

### 15. 🟡 `app/(tabs)/opportunities.tsx:78` - Firsat ekraninda filtrelerin cogu uygulanmiyor

Sorun: `useFilters` icinden `buildQuery` aliniyor ama kullanilmiyor. Fiyat, yil, km, sehir, arama ve taxonomy filtreleri firsat havuzunda etkisiz kaliyor.

Oneri: Dashboard ile ayni `buildQuery(query, filters)` zincirini kullanin; sadece firsat ekranina ozel filtreleri bunun uzerine ekleyin.

### 16. 🟡 `app/(tabs)/index.tsx:113` - Ilk acilista ayni veri iki kez cekiliyor

Sorun: Hem `useFocusEffect` hem `useEffect` ayni dependency setiyle `fetchPublishedCars` ve `fetchCurrentUserProfile` cagiriyor. Mount/focus aninda duplicate sorgu uretir.

Oneri: Tek bir veri yukleme tetikleyicisi kullanin veya focus refresh ile filter-change refresh'i ayrin.

### 17. 🟡 `app/(tabs)/opportunities.tsx:157` - Firsat ekraninda da duplicate fetch var

Sorun: `useFocusEffect` ve `useEffect` ayni anda `fetchOpportunities(0, false)` cagiriyor.

Oneri: Dashboard icin onerilen tek kaynakli refresh modelini burada da uygulayin.

### 18. 🟡 `app/listing/[id].tsx:229` - Ekspertiz guncellemede try/catch yok

Sorun: `handleExpertiseChange` Supabase update'ini direkt await ediyor. Network/rejection durumunda fonksiyon patlayabilir ve UI eski/yanlis state'te kalabilir.

Oneri: Optimistic update'i rollback edebilecek `try/catch` ekleyin; hata durumunda kullaniciya Alert/Toast gosterin.

### 19. 🟡 `app/listing/[id].tsx:253` - Dis gorsel isleme kismi veri kaybina acik

Sorun: Dis kaynak gorseller varsa sadece ilk 10 gorsel isleniyor ve `processMultipleImages` basarisiz olanlari sessizce dusuruyor. Tum upload'lar basarisiz olursa ilan gorselsiz yayina alinabilir.

Oneri: Minimum bir basarili upload sarti koyun, basarisiz sayisini kullaniciya gosterin ve orijinal listeyi tamamen ezmeden once dogrulama yapin.

### 20. 🟡 `app/(tabs)/settings.tsx:209` - Maksimum oturum guncellemesinde hata yonetimi yok

Sorun: `onPress` icinde Supabase update await ediliyor ama try/catch yok; hata olursa kullaniciya bilgi verilmiyor.

Oneri: `try/catch` ekleyin, buton loading state'i koyun ve hata durumunda Alert gosterin.

### 21. 🟡 `hooks/use-notifications.ts:120` - Notification deep link degeri validate edilmiyor

Sorun: Bildirim payload'undan gelen `data.url` dogrudan `router.push(data.url as any)` ile calisiyor. Beklenmeyen route veya hatali payload navigasyon hatalarina yol acabilir.

Oneri: Kabul edilen route prefixlerini whitelist edin (`/messages/`, `/listing/`, vb.) ve string disi payload'lari reddedin.

### 22. 🟡 `lib/supabase.ts:91` - Eksik config dummy Supabase client ile gizleniyor

Sorun: Env yoksa dummy URL/JWT ile client olusturuluyor. Bu durum configuration hatasini erken fail etmek yerine runtime'da anlamsiz network/auth hatalarina donusturur.

Oneri: Development'ta acik hata firlatin; production build'de zorunlu env validation yapin. Dummy key kullanmayin.

### 23. 🟡 `lib/auth-context.tsx:87` - Tarih parse islemi timezone hatasi uretebilir

Sorun: `dateStr.replace(' ', 'T').split('.')[0] + 'Z'` her degere `Z` ekliyor. Zaten timezone iceren ISO stringlerde veya local timestamp'lerde trial bitis zamani yanlis hesaplanabilir.

Oneri: Postgres timestamptz degerlerini dogrudan `Date.parse` ile parse edin; timezone yoksa server RPC'den gelen formatla uyumlu tek parser yazin ve test ekleyin.

### 24. 🟡 `lib/session-manager.ts:234` - Push bildirimi client tarafindan Expo API'ye gonderiliyor

Sorun: `notifyActiveDevices` mobil client icinden Expo Push API'ye direkt istek atiyor ve HTTP sonucunu kontrol etmiyor. Abuse, rate-limit ve delivery hatalari yonetilmiyor.

Oneri: Push gonderimini Supabase Edge Function/backend'e tasiyin; client sadece authenticated istek yapsin, backend Expo response ticket/receipt kontrolu yapsin.

## Dusuk Bulgular

### 25. 🟢 `hooks/use-chat-list.ts:47` - Debug console log production'a kalmis

Sorun: Channel lifecycle bilgileri console'a yaziliyor. Benzer debug loglar `lib/auth-context.tsx:57`, `app/add-listing.tsx:316`, `app/(tabs)/scraper.tsx:261`, `hooks/use-notifications.ts:102` gibi yerlerde de var.

Oneri: Logger wrapper kullanin ve production build'de debug seviyesini kapatin.

### 26. 🟢 `app/(tabs)/scraper.tsx:55` - Bos catch bloklari hatalari sakliyor

Sorun: Inject edilen scraper scriptinde birden fazla `catch(e) {}` var (`55`, `159`, `201`). DOM parse hatalari tespit edilemiyor.

Oneri: En azindan debug modda hata listesini payload'a ekleyin veya kontrollu fallback metriği tutun.

### 27. 🟢 `app/(tabs)/_layout.tsx:8` - Kullanilmayan import

Sorun: `LoginApprovalListener` import edilmis ama JSX'te yorum satirina alinmis. Bundle/lint kirliligi yaratir.

Oneri: Import'u kaldirin veya ozellik aktif olacaksa feature flag ile gercekten render edin.

### 28. 🟢 `app/(tabs)/index.tsx:20` - Kullanilmayan import

Sorun: `INITIAL_FILTERS` import edilmis ama kullanilmiyor.

Oneri: Import'u kaldirin.

### 29. 🟢 `app/(tabs)/opportunities.tsx:19` - Kullanilmayan import

Sorun: `INITIAL_FILTERS` import edilmis ama kullanilmiyor.

Oneri: Import'u kaldirin.

### 30. 🟢 `components/FilterModal.tsx:19` - Kullanilmayan import

Sorun: `TaxonomyResolver` import edilmis ama dosyada kullanilmiyor. `supabase` import'u da `components/FilterModal.tsx:22` satirinda kullanilmiyor.

Oneri: Kullanilmayan import'lari kaldirin; ESLint `no-unused-vars` aktif edin.

### 31. 🟢 `components/ExpertiseSelector.tsx:15` - Kullanilmayan degisken

Sorun: `const { width } = Dimensions.get('window');` tanimli ama kullanilmiyor.

Oneri: Degiskeni kaldirin.

### 32. 🟢 `components/SellerContactCard.tsx:19` - Prop tanimli ama kullanilmiyor

Sorun: `onSendMessage` prop'u interface ve component parametresinde var ancak UI'da buton veya handler olarak kullanilmiyor.

Oneri: Mesaj gonder butonunu ekleyin veya prop'u kaldirin.

### 33. 🟢 `components/ListingCard.tsx:22` - Hesaplanan satici adi kullanilmiyor

Sorun: `galeriAdi` hesaplanıyor ama render edilmiyor. Bu hem unused variable hem de kartta satici bilgisi eksikligi.

Oneri: Kartta satici adini gosterin veya degiskeni kaldirin.

### 34. 🟢 `app/(tabs)/settings.tsx:292` - Bildirim toggle state'i kalici degil

Sorun: `notifsEnabled` ve `priceAlertsEnabled` sadece local state. Ekran kapaninca tercih kayboluyor.

Oneri: Profil tablosu veya AsyncStorage ile kalici tercih kaydedin.

### 35. 🟢 `app/add-listing.tsx:53` - Yil listesi hardcode 2026'ya bagli

Sorun: `YEARS = Array.from({ length: 27 }, (_, i) => (2026 - i).toString())` zamanla eskir.

Oneri: `new Date().getFullYear()` kullanin ve minimum yil sabitini ayri tutun.

### 36. 🟢 `app/(tabs)/scraper.tsx:344` - Harici URL hardcode

Sorun: `https://www.sahibinden.com` ve user agent stringleri kod icinde sabit.

Oneri: Domain whitelist ve user agent ayarlarini merkezi config'e alin.

### 37. 🟢 `components/Themed.tsx:29` - `@ts-ignore` kullanimi

Sorun: TypeScript hatasi `@ts-ignore` ile bastirilmis.

Oneri: `keyof typeof Colors.light & keyof typeof Colors.dark` gibi daraltilmis tiplerle ignore ihtiyacini kaldirin.

### 38. 🟢 `components/ExternalLink.tsx:13` - `@ts-expect-error` rota tipini bastiriyor

Sorun: External URL icin router tip hatasi bastirilmis. Bu kabul edilebilir ama lint/type debt olarak takip edilmeli.

Oneri: Expo Router typed routes icin desteklenen external link pattern'i veya wrapper tipi kullanin.

### 39. 🟢 `components/EditScreenInfo.tsx:32` - Expo template component'i kaynakta kalmis

Sorun: Varsayilan Expo bilgi component'i uygulama kodunda duruyor ve docs linkleri iceriyor.

Oneri: Kullanilmiyorsa silin; kullaniliyorsa uygulama diline ve tasarimina uyarlayin.

### 40. 🟢 `tsconfig.json:3` - Strict var ama unused kontroller kapali

Sorun: `strict: true` var fakat `noUnusedLocals`/`noUnusedParameters` kapali oldugu icin kullanilmayan import, prop ve degiskenler derlemede yakalanmiyor.

Oneri: `noUnusedLocals`, `noUnusedParameters` ve ESLint'i ekleyin; CI'da `tsc --noEmit` ve lint calistirin.
