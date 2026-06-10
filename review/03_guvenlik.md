## Ozet

| Risk | Adet |
| --- | ---: |
| Kritik | 0 |
| Yuksek | 3 |
| Orta | 8 |
| Dusuk | 4 |

Notlar:
- `npm audit --json` registry uzerinden calistirildi. Sonuc: 0 kritik, 0 yuksek, 21 moderate paket bulgusu.
- `.env` icinde gorulen `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` mobil client icin public kabul edilir; bu raporda secret olarak isaretlenmedi.
- Supabase local config de tarandi. `supabase/config.toml` local gelistirme icin kullaniliyor olabilir; prod ortama uygulanacaksa auth ayarlari ayrica sikilastirilmalidir.

## Hassas Veri Yonetimi

### 1. Yuksek - Supabase auth session, SecureStore basarisiz olursa veya veri 2KB ustuyse AsyncStorage'a dusuyor

- Dosya: `lib/supabase.ts:28`, `lib/supabase.ts:41`, `lib/supabase.ts:49`
- Sorun: Supabase auth storage adapter'i once SecureStore kullaniyor, fakat `value.length > 2000` veya SecureStore hatasinda session verisini AsyncStorage'a yaziyor. Supabase session icinde access token ve refresh token bulunabilir; refresh token duz storage'a dustugunde cihaz yedegi, root/jailbreak, debug backup veya malware ile ele gecirilebilir.
- Nasil exploit edilir: Saldirgan fiziksel cihaza veya yedek dosyalarina erisir; AsyncStorage kayitlarindan Supabase session JSON'unu alir; refresh token gecerliligini koruyorsa kullanici adina yeni access token uretebilir.
- Nasil kapatilir: Auth session icin fail-closed SecureStore kullan. SecureStore limitine takilan session'i AsyncStorage'a dusmek yerine parcalara bolerek SecureStore'a yaz veya native keychain tabanli daha uygun storage kullan. SecureStore yazilamazsa session persist etme.

```ts
// Oneri: token iceren auth key'leri icin AsyncStorage fallback kullanma.
if (key.includes('auth-token')) {
  await SecureStore.setItemAsync(key, value);
  return;
}
```

### 2. Orta - Web build'de session localStorage'a yaziliyor

- Dosya: `lib/supabase.ts:18`, `lib/supabase.ts:36`
- Sorun: `Platform.OS === 'web'` durumunda Supabase session localStorage'a kaydediliyor. Bu proje mobil odakli olsa da web build acilirsa XSS veya browser extension saldirilarinda token okunabilir.
- Nasil exploit edilir: Uygulamaya veya bagimli web view/web build yuzeyine XSS sokan saldirgan `localStorage` uzerinden Supabase refresh token'i okur.
- Nasil kapatilir: Web hedefi kullanilmiyorsa web persist'i kapat. Web hedefi kullanilacaksa httpOnly secure cookie tabanli SSR auth mimarisine gec veya en azindan web'de `persistSession: false` kullan.

### 3. Dusuk - Console log/error'lar hata nesneleri ve kullanici/veri payload'larini loglayabiliyor

- Dosya: `app/(tabs)/scraper.tsx:330`, `app/(tabs)/scraper.tsx:335`, `app/add-listing.tsx:465`, `supabase/functions/push-service/index.ts:140`, `supabase/functions/push-service/index.ts:150`
- Sorun: Kodda `console.error`/`console.info` ile hata nesnesi veya servis response'u loglanıyor. Su an dogrudan password/token loglayan satir tespit edilmedi; ancak push-service response'u, scrape payload hatalari ve submit hatalari prod loglarinda kullanici verisi veya servis metadata'si biriktirebilir.
- Nasil exploit edilir: Log erisimi olan iceriden bir aktor veya ele gecirilmis log sistemi kullaniciya ait ilan verisi, hata detaylari veya servis response metadata'sini toplayabilir.
- Nasil kapatilir: Prod log seviyesini azalt; hata kodu ve correlation id logla, ham payload/error object loglama. Edge Function loglarinda response body'yi maskele.

## API & Network Guvenligi

### 4. Orta - Certificate pinning yok

- Dosya: `package.json:11`, `lib/supabase.ts:90`, `app/(tabs)/scraper.tsx:355`
- Sorun: Supabase ve WebView trafigi HTTPS kullaniyor, fakat projede certificate pinning yapan bir native kutuphane veya network security config tespit edilmedi.
- Nasil exploit edilir: Kullanici cihazina kotu niyetli veya kurumsal CA yuklenirse, saldirgan HTTPS trafigini MITM ile izleyebilir veya degistirmeye calisabilir. Supabase JWT'leri header'da tasindigi icin ozellikle auth trafigi hassas.
- Nasil kapatilir: Production build icin Supabase domaini ve kritik API domainlerine certificate/public key pinning ekle. React Native tarafinda pinning destekleyen native modul kullan veya Android Network Security Config + iOS ATS/pinning konfigurasyonu uygula. Pin rotation planini da dokumante et.

### 5. Orta - API isteklerinde genel timeout/cancellation politikasi yok

- Dosya: `lib/supabase.ts:90`, `hooks/use-messages.ts:39`, `hooks/use-chat-list.ts:22`, `app/(tabs)/scraper.tsx:255`, `supabase/functions/push-service/index.ts:129`
- Sorun: Supabase client cagrilari ve Edge Function'daki Expo push `fetch` icin merkezi timeout/cancellation yok. Bu dogrudan veri sizintisi degil; ancak ag manipülasyonu veya servis yavaslatma durumunda app akislari asili kalabilir.
- Nasil exploit edilir: Saldirgan captive portal, MITM veya ag seviyesinde paketleri geciktirir; kullanici auth, mesaj veya ilan kayit akislari belirsiz sure bekler ve tekrar tekrar istek olusturabilir.
- Nasil kapatilir: Supabase cagrilari icin AbortController destekli wrapper yaz; kritik islemlerde 10-15 sn timeout ve idempotency/tekrar deneme politikasi kullan. Edge Function `fetch` icin de AbortSignal ekle.

### 6. Orta - Local Supabase config HTTP redirect URL'leri iceriyor

- Dosya: `supabase/config.toml:93`, `supabase/config.toml:154`
- Sorun: Local config'te `api_url = "http://127.0.0.1"` ve `site_url = "http://127.0.0.1:3000"` var. Local icin normal olabilir; prod config'e tasinmasi halinde OAuth/email redirect akislari HTTP'ye donebilir.
- Nasil exploit edilir: Prod ortamda HTTP redirect izinliyse saldirgan ayni agda auth redirect veya magic link akisini izleyip session/token parametrelerini ele gecirmeye calisabilir.
- Nasil kapatilir: Prod Supabase Auth URL allowlist'inde yalnizca HTTPS app/link domainleri olsun. Local config ile prod config'i ayir; deploy oncesi config diff/advisor kontrolu zorunlu hale getir.

## Kimlik Dogrulama & Yetkilendirme

### 7. Yuksek - Push Edge Function `LOGIN_APPROVAL` isteginde hedef userId client payload'undan geliyor

- Dosya: `supabase/functions/push-service/index.ts:16`, `supabase/functions/push-service/index.ts:23`, `supabase/functions/push-service/index.ts:30`
- Sorun: Edge Function service role client olusturuyor ve `LOGIN_APPROVAL` payload'undaki `userId` ile profile push token'i cekiyor. Fonksiyon cagrisi JWT ile korunuyor olsa bile, kod caller kimligini payload'daki `userId` ile karsilastirmiyor.
- Nasil exploit edilir: Herhangi bir authenticated kullanici veya fonksiyona erisebilen istemci baska bir kullanicinin `userId` degerini gondererek login approval bildirimi spam'i tetikleyebilir. Eger function JWT dogrulamasi kapatilirsa anonim spam'e donusur.
- Nasil kapatilir: Edge Function icinde `Authorization` header'daki JWT'yi dogrula, `auth.getUser()` ile caller'i al ve sadece `caller.id === payload.userId` veya server-side session policy uygunsa devam et. Webhook ve client-call tiplerini ayir; webhook icin secret header kullan.

```ts
const authHeader = req.headers.get('Authorization');
const { data: { user }, error } = await supabaseClient.auth.getUser(
  authHeader?.replace('Bearer ', '') ?? ''
);
if (error || user?.id !== payload.userId) {
  return new Response('Forbidden', { status: 403 });
}
```

### 8. Yuksek - Deep link parametreleri UUID olarak dogrulanmadan Supabase filtrelerine giriyor

- Dosya: `app/messages/[id].tsx:24`, `app/messages/[id].tsx:97`, `app/messages/[id].tsx:100`, `app/listing/[id].tsx:122`, `app/listing/[id].tsx:147`
- Sorun: `receiverId`, `carId` ve `id` deep link/search parametreleri UUID formatinda dogrulanmadan Supabase sorgularina giriyor. En riskli kisim `app/messages/[id].tsx:100` satirindaki `.or(...)` string interpolation; PostgREST filter syntax'i string oldugu icin beklenmeyen karakterler sorgu semantigini bozabilir.
- Nasil exploit edilir: Saldirgan kullaniciya ozel bir deep link gonderir: `/messages/new?receiverId=...` icinde PostgREST operator karakterleri kullanarak conversation lookup filtresini genisletmeye calisir. RLS iyi kurgulanmis olsa bile veri sizintisi yerine yetkisiz conversation olusturma, hata ayrintisi veya farkli akisa yonlendirme riski dogar.
- Nasil kapatilir: Tum route parametreleri icin UUID allowlist validator ekle. `.or()` string'i kullanmak zorundaysan parametreleri encode/escape et; daha guvenlisi iki ayri `.eq()` sorgu veya server-side RPC ile conversation resolve islemi yapmaktir.

```ts
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(receiverId ?? '')) {
  router.replace('/(tabs)/messages');
  return;
}
```

### 9. Orta - Supabase auth config zayif parola ve reauth ayarlariyla duruyor

- Dosya: `supabase/config.toml:176`, `supabase/config.toml:180`, `supabase/config.toml:221`, `supabase/config.toml:223`
- Sorun: `minimum_password_length = 6`, `password_requirements = ""`, `enable_confirmations = false`, `secure_password_change = false`. Local config olabilir; prod ortamda ayni ayarlar kullanilirsa hesap ele gecirme riski artar.
- Nasil exploit edilir: Saldirgan parola spray/bruteforce ile zayif 6 karakterli parolalari hedefler; e-posta dogrulamasi ve password change reauth zorunlu degilse hesap hijack sonrasi kalicilik kolaylasir.
- Nasil kapatilir: Prod auth config'te minimum 8-12 karakter, `lower_upper_letters_digits_symbols` veya en az `lower_upper_letters_digits`, e-posta confirmation ve secure password change aktif olsun. Rate limitleri prod trafik profilinize gore sikilastirin.

## Input Guvenligi

### 10. Yuksek - WebView scrape payload'inda image URL'leri host/protokol bazinda dogrulanmiyor

- Dosya: `app/(tabs)/scraper.tsx:25`, `app/(tabs)/scraper.tsx:269`, `app/listing/[id].tsx:264`, `lib/image-processor.ts:15`
- Sorun: WebView sadece mevcut URL host'unu kontrol ediyor ve payload icin `Array.isArray(data.imageUrls)` ile yetiniyor. `imageUrls` icindeki her URL'nin `https`, host, uzunluk, adet ve dosya tipi dogrulamasindan gectigi gorulmuyor. Daha sonra dis gorseller publish sirasinda indirilip storage'a yukleniyor.
- Nasil exploit edilir: Izinli domain uzerinde XSS/DOM manipülasyonu veya beklenmeyen ilan HTML'i ile `imageUrls` icine saldirgan kontrollu URL'ler koyulur. Uygulama bu URL'leri kullanicinin cihazindan indirerek IP/user-agent sizarabilir, buyuk dosyalarla DoS yaratabilir veya storage maliyetini arttirabilir.
- Nasil kapatilir: Payload validator icinde her image URL icin `https`, izinli CDN/domain, maksimum adet, maksimum string uzunlugu ve dosya uzantisi/MIME allowlist kontrolu yap. Indirme oncesi HEAD ile content-length/type kontrolu ve timeout ekle.

```ts
const isAllowedImageUrl = (url: unknown) => {
  if (typeof url !== 'string' || url.length > 2048) return false;
  const parsed = new URL(url);
  return parsed.protocol === 'https:' && parsed.hostname.endsWith('sahibinden.com');
};
```

### 11. Orta - WebView JavaScript ve DOM storage acik

- Dosya: `app/(tabs)/scraper.tsx:361`, `app/(tabs)/scraper.tsx:362`, `app/(tabs)/scraper.tsx:347`
- Sorun: Scraper icin `javaScriptEnabled` ve `domStorageEnabled` acik; uygulama kendi JS'ini `injectJavaScript` ile sayfaya calistiriyor. Host whitelist mevcut ve iyi; yine de WebView, izinli domain compromise/XSS durumunda native bridge'e veri gonderebilen yuksek riskli bir yuzey.
- Nasil exploit edilir: Izinli domainde saldirgan JS calisirsa `window.ReactNativeWebView.postMessage` ile uygulamaya sahte payload gonderebilir. Mevcut payload validation bunu kismen sinirliyor, ancak 10. bulgudaki URL validasyonu eksikligiyle birlesince etki artar.
- Nasil kapatilir: `originWhitelist`, `limitsNavigationsToAppBoundDomains` (iOS), `setSupportMultipleWindows={false}` gibi hardening ayarlari ekle. JS injection'u sadece kullanici aksiyonunda ve listing sayfasi dogrulandiktan sonra calissin; payload schema validation'i zod/io-ts gibi kati parser ile yapilsin.

### 12. Orta - Bildirim ve internal route URL allowlist var ama path parametre semantigi dogrulanmiyor

- Dosya: `hooks/use-notifications.ts:9`, `hooks/use-notifications.ts:122`, `hooks/use-notifications.ts:124`
- Sorun: Bildirim URL allowlist'i dis URL'leri engelliyor; bu olumlu. Ancak `/messages/<id>` ve `/listing/<id>` segmentleri sadece `[\w-]+` ile kontrol ediliyor, UUID/varlik/yetki semantigi route tarafina birakiliyor.
- Nasil exploit edilir: Push payload ureten backend bug'i veya ele gecirilmis push-service, kullaniciyi var olmayan/garip id'li route'a yonlendirerek hata akisi, crash veya yetkisiz veri sorgusu denemesi tetikleyebilir.
- Nasil kapatilir: Notification URL parser'i route bazli UUID validator kullansin. Gecersiz id'de route'a push etmek yerine guvenli fallback'e yonlendir.

## Ucuncu Taraf Kutuphaneler

### 13. Orta - `npm audit` 21 moderate vulnerability raporluyor

- Dosya: `package.json:17`, `package.json:19`, `package.json:20`, `package.json:28`, `package.json:29`, `package.json:30`, `package.json:32`, `package.json:50`
- Sorun: `npm audit --json` sonucunda 21 moderate bulgu var. One cikanlar: `postcss` XSS advisory `GHSA-qx2v-qp2m-jg93`, `uuid` buffer bounds advisory `GHSA-w5hq-g745-h8pq`, `ws` uninitialized memory disclosure `GHSA-58qx-3vcg-4xpx`, `brace-expansion` DoS `GHSA-jxxr-4gwj-5jf2`. Expo zinciri icin fix onerisi major upgrade olarak Expo 56 ailesine isaret ediyor.
- Nasil exploit edilir: Bu paketlerin cogu build/dev tooling veya transitive dependency; mobil runtime etkisi sinirli olabilir. Ancak dev server, bundler, realtime websocket veya CI build girdileri saldirgan kontrollu hale gelirse XSS/DoS/memory disclosure etkileri dogabilir.
- Nasil kapatilir: Expo SDK upgrade planla; `npm audit fix` dogrudan major upgrade getirecegi icin once Expo upgrade guide ile ilerle. `@expo/ngrok` sadece lokal dev'de gerekiyorsa kaldir veya dev ortamla sinirla. CI'da `npm audit --audit-level=high` gate'i, release oncesi de moderate review ekle.

### 14. Dusuk - Kullanilmayan veya dev-only kutuphaneler attack surface'i buyutuyor

- Dosya: `package.json:20`, `package.json:40`, `app.json:42`
- Sorun: `expo-dev-client` app plugin olarak duruyor; `react-native-reanimated-carousel` performans duzeltmesinden sonra kodda kullanilmiyor. Dev-only veya unused paketler native dependency ve transitive advisory yuzeyini buyutur.
- Nasil exploit edilir: Dev client yanlis build profile ile release'e girerse debug/dev menu veya ek native kod yuzeyi gereksiz risk yaratir. Kullanilmayan paketlerdeki transitive zafiyetler CI audit borcu olarak kalir.
- Nasil kapatilir: Production profile'da `expo-dev-client` plugin'ini disarida birak; kullanilmayan `react-native-reanimated-carousel` paketini kaldir ve lockfile'i temizle. EAS build profile'larinda dev/prod plugin ayrimini netlestir.

### 15. Dusuk - Android izinleri su an minimal, fakat google-services dosyasi repo disiplini gerektiriyor

- Dosya: `app.json:22`, `app.json:23`
- Sorun: Android izinleri `INTERNET` ve `ACCESS_NETWORK_STATE` ile minimal gorunuyor; bu olumlu. Ancak `googleServicesFile` local dosyaya isaret ediyor. Firebase config genelde public kabul edilse de yanlislikla admin/service-account JSON ile karistirilmamali.
- Nasil exploit edilir: Admin service account JSON'u `google-services.json` yerine repo icine konursa private key sizabilir. Bu durumda FCM veya Firebase kaynaklari ele gecirilebilir.
- Nasil kapatilir: `.gitignore` icinde Firebase admin/service-account pattern'leri korunmali. `google-services.json` client config ise commit politikasini netlestir; admin JSON asla mobil repo icinde durmamali.

## Ek Gozlemler

### 16. Dusuk - Client-side fiyat/abonelik kontrolleri tek basina yetki kontrolu sayilmamali

- Dosya: `app/listing/[id].tsx:249`, `app/add-listing.tsx:145`, `hooks/use-subscription-limit.ts:34`
- Sorun: UI tarafinda `canAdd`, `isTrialExpired`, fiyat veya verified durumuna gore akislari kapatan kontroller var. Bunlar UX icin gerekli; fakat guvenlik icin server/RLS tarafinda ayni kurallarin kesin uygulanmasi gerekir.
- Nasil exploit edilir: Saldirgan modifiye edilmis client ile UI kontrollerini atlar ve Supabase endpoint'lerine dogrudan insert/update dener.
- Nasil kapatilir: `cars`, `cars_drafts`, `profiles`, `login_requests`, `messages` tablolarinda RLS policy'leri bu kurallari tekrar etmeli. Kritik islemleri RPC/Edge Function ile server-side validate etmek daha guvenli olur.

## Duzeltme Durumu

| Bulgu | Durum | Yapilan |
| --- | --- | --- |
| 1 | Kapatildi | Supabase auth storage AsyncStorage fallback'i kaldirildi; SecureStore chunk storage eklendi. |
| 2 | Kapatildi | Web auth persistence localStorage yerine memory-only adapter'a alindi. |
| 3 | Kapatildi | Scraper, ilan ekleme, image processor, session manager ve push-service tarafinda ham payload/error loglari maskelendi. |
| 4 | Kismi | Android cleartext ve iOS ATS sikilastirildi. Gercek certificate/public-key pinning icin production domain pin hashleri ve native build konfigurasyonu ayrica uygulanmali. |
| 5 | Kapatildi | Supabase client icin merkezi fetch timeout, Edge Function push timeout ve dis gorsel indirme timeout'u eklendi. |
| 6 | Kapatildi | Auth `site_url` ve redirect allowlist mobil deep link'e cekildi; local `api_url` sadece Supabase local runtime icin birakildi. |
| 7 | Kapatildi | `LOGIN_APPROVAL` Edge Function cagrisi Authorization header ile kullanici dogruluyor ve `caller.id === payload.userId` kontrolu yapiyor. |
| 8 | Kapatildi | Deep link route parametreleri UUID allowlist ile dogrulaniyor. |
| 9 | Kapatildi | Supabase auth parola, email confirmation, secure password change ve email frequency ayarlari sikilastirildi. |
| 10 | Kapatildi | Scraper image URL'leri https, host, uzanti, uzunluk ve adet allowlist'inden geciriliyor. |
| 11 | Kapatildi | WebView origin, mixed content ve multi-window hardening eklendi; JS scrape sadece izinli ilan sayfasinda calisiyor. |
| 12 | Kapatildi | Notification route parser UUID semantigiyle ortak security helper'a tasindi. |
| 13 | Kismi | Kaldirilabilir transitive bulgular icin `npm audit fix` calisti; kalan 15 moderate bulgu Expo SDK 56 major upgrade gerektiriyor. |
| 14 | Kapatildi | `expo-dev-client`, `react-native-reanimated-carousel` ve `@expo/ngrok` kaldirildi. |
| 15 | Kapatildi | Firebase admin/service-account dosya patternleri ve `google-services.json` `.gitignore` altina alindi. |
| 16 | Dogrulandi | Supabase migrations icinde cars/cars_drafts RLS limit politikalari dogrulandi; client kontrolleri tek basina guvenlik kontrolu sayilmamali notu korunuyor. |

## Dogrulama

- `npx tsc --noEmit` basarili.
- `npm audit fix` calistirildi; `npm audit --audit-level=moderate` sonucu 15 moderate bulgu kaldi. Kalanlar `npm audit fix --force` ile Expo 56.0.8'e major upgrade istiyor.
- `npm ls expo-dev-client react-native-reanimated-carousel @expo/ngrok` sonucu paketler agacta yok.
- Hedefli pattern taramasi `localStorage`, `AsyncStorage`, kaldirilan paketler, eski ham log mesajlari, `FileSystem.downloadAsync`, zayif auth config degerleri icin kodda eslesme vermedi.
