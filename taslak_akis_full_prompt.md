# GÖREV — Scraper Taslak Akışı + Ekspertiz Düzenleme

## BAĞLAM

Bu proje React Native + Supabase tabanlı bir B2B otomotiv uygulamasıdır.
Şu an `scraper.tsx` dosyasındaki "Bu İlanı Portföye Ekle" butonu, çekilen ilanı direkt
`cars` tablosuna `status: 'published'` ile insert ediyor.

**İstenen yeni akış:**
1. Butona basılınca veri `cars_drafts` tablosuna `status: 'draft'` olarak kaydedilsin
2. Kayıt sonrası kullanıcı otomatik olarak taslak detay ekranına yönlendirilsin
3. Taslak detay ekranında kullanıcı ekspertiz şemasındaki parçalara dokunarak durumlarını düzenleyebilsin
4. Düzenlemeler bitince "Yayınla" butonuna bassın → veri `cars` tablosuna taşınsın, taslak silinsin

---

## ADIM 1 — scraper.tsx: saveToDatabase Fonksiyonunu Değiştir

`scraper.tsx` dosyasını bul. İçindeki `saveToDatabase` async fonksiyonunu tamamen aşağıdaki
mantıkla değiştir. `cars` tablosuna insert eden satırı kaldır, yerine `cars_drafts` tablosuna
insert et.

**Kolon eşleştirmesi — scraper verisinden cars_drafts kolonlarına:**

```
seller_id        ← user.id
ilan_no          ← data.ilanNo || ''
title            ← data.title
brand            ← data.brand || 'Belirtilmemiş'
model            ← data.model || 'Belirtilmemiş'
series           ← data.series || ''
year             ← data.year || 0
km               ← data.km || 0
price            ← String(data.price || 0)        // cars_drafts.price text tipinde
price_b2b        ← data.price || 0                 // cars_drafts.price_b2b numeric
description      ← data.description || ''
images           ← data.imageUrls || []
expertise        ← data.expertise || {}
fuel             ← data.fuel || ''
transmission     ← data.transmission || ''
body_type        ← data.bodyType || ''
engine           ← data.engine || ''
status           ← 'draft'                         // SABİT — asla 'published' yazma
is_active        ← true
is_opportunity   ← false
is_trade_closed  ← true
heavy_damage     ← 'Hayır'
```

**Insert sonrası:**
- Hata yoksa `Alert` gösterme
- Insert'ten dönen kaydın `id`'sini al
- Navigation ile taslak detay ekranına yönlendir, `draftId` parametresini ilet:
  ```js
  router.push({ pathname: '/drafts/[id]', params: { id: insertedRecord.id } });
  // VEYA projenin navigation yapısına göre:
  navigation.navigate('DraftDetail', { draftId: insertedRecord.id });
  ```
- Navigation için projedeki mevcut router/navigation yapısını kullan (expo-router veya react-navigation)
- `setIsScraping(false)` finally bloğunda kalsın

---

## ADIM 2 — Taslak Detay Ekranını Bul

Projede taslak/draft detay ekranını bul. Dosya adı muhtemelen şunlardan biri:
```
drafts/[id].tsx
DraftDetailScreen.tsx
draft-detail.tsx
DraftsScreen.tsx
```

Bu ekranı bul ve aşağıdaki yapının mevcut olup olmadığını kontrol et:
- `cars_drafts` tablosundan `id`'ye göre veri çeken bir Supabase sorgusu
- Araç bilgilerini gösteren bir UI
- Ekspertiz SVG şeması bileşeni
- "Yayınla" butonu

Eğer bu ekran ekspertiz düzenleme özelliğine sahip değilse ADIM 3'ü uygula.
Eğer ekspertiz düzenleme zaten varsa ADIM 3'ü atla, ADIM 4'e geç.

---

## ADIM 3 — Taslak Detay Ekranına Ekspertiz Düzenleme Ekle

### 3a. Mevcut Ekspertiz Modalını Bul

Projede normal ilan ekleme ekranında parçaya tıklanınca açılan ekspertiz durum seçici modalı bul.
Bu modal muhtemelen şu kalıpları içerir:
```
ExpertiseModal
DamageModal
StatusModal
'painted'
'local'
'changed'
partKey
```

Bu modalın component adını ve dosya yolunu not et.

### 3b. SVG Şemasına Tıklama Ekle

Taslak detay ekranındaki ekspertiz SVG şemasında her `<Path>` bileşenine
`onPress` handler'ı ekle:

```jsx
<Path
  id="on_sol"
  d={...}
  fill={colorMap['on_sol'] ?? COLORS.original}
  onPress={() => handlePartPress('on_sol')}  // ← EKLE
/>
```

### 3c. handlePartPress Fonksiyonu

```js
const [selectedPart, setSelectedPart] = useState(null);
const [modalVisible, setModalVisible] = useState(false);

const handlePartPress = (partKey) => {
  setSelectedPart(partKey);
  setModalVisible(true);
};
```

### 3d. Modal'dan Durum Güncellemesi

Modal içinde kullanıcı bir durum seçtiğinde (`'painted'`, `'local'`, `'changed'`, `'original'`):

```js
const handleStatusSelect = async (newStatus) => {
  // 1. Local state'i güncelle (anlık UI feedback)
  const updatedExpertise = { ...expertise, [selectedPart]: newStatus };
  setExpertise(updatedExpertise);

  // 2. cars_drafts tablosunu güncelle
  const { error } = await supabase
    .from('cars_drafts')
    .update({ expertise: updatedExpertise })
    .eq('id', draftId);

  if (error) {
    console.error('Ekspertiz güncelleme hatası:', error);
  }

  // 3. Modalı kapat
  setModalVisible(false);
  setSelectedPart(null);
};
```

**Renk kuralları — değiştirme:**
```js
const COLORS = {
  original: '#9CA3AF', // Gri
  painted:  '#2563EB', // Mavi
  local:    '#F97316', // Turuncu
  changed:  '#DC2626', // Kırmızı
};
```

---

## ADIM 4 — Yayınla Butonu

Taslak detay ekranındaki "Yayınla" butonuna bu fonksiyonu bağla:

```js
const handlePublish = async () => {
  try {
    setIsPublishing(true);

    // 1. cars_drafts'tan güncel taslağı çek
    const { data: draft, error: fetchError } = await supabase
      .from('cars_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (fetchError || !draft) throw new Error('Taslak bulunamadı');

    // 2. cars tablosuna insert et
    const { error: insertError } = await supabase
      .from('cars')
      .insert([{
        seller_id:          draft.seller_id,
        brand:              draft.brand,
        model:              draft.model,
        series:             draft.series,
        year:               draft.year,
        km:                 draft.km,
        price_b2b:          draft.price_b2b || Number(draft.price) || 0,
        title:              draft.title,
        description:        draft.description,
        images:             draft.images,
        expertise:          draft.expertise,
        fuel:               draft.fuel,
        transmission:       draft.transmission,
        body_type:          draft.body_type,
        engine:             draft.engine,
        status:             'published',
        is_active:          true,
        is_opportunity:     false,
        is_trade_closed:    true,
        heavy_damage:       draft.heavy_damage || 'Hayır',
      }]);

    if (insertError) throw insertError;

    // 3. Taslağı sil
    await supabase
      .from('cars_drafts')
      .delete()
      .eq('id', draftId);

    // 4. Başarı mesajı ve yönlendirme
    Alert.alert('Başarılı', 'İlan yayınlandı.');
    router.replace('/'); // veya projenin ana sayfasına yönlendir

  } catch (err: any) {
    Alert.alert('Yayınlama Hatası', err.message);
  } finally {
    setIsPublishing(false);
  }
};
```

---

## SINIR KURALLARI — BUNLARI YAPMA

- ❌ `scraper.tsx` içinde `cars` tablosuna direkt insert yapma — sadece `cars_drafts`'a yaz
- ❌ `status: 'published'` değerini scraper'dan gönderme — scraper her zaman `'draft'` gönderir
- ❌ Ekspertiz SVG path şekillerini (`d` prop) değiştirme
- ❌ Renk kodlarını değiştirme
- ❌ Yayınla işleminde `cars_drafts` kaydını silmeyi atlama
- ❌ `handleStatusSelect` içinde `expertise` state'ini deep copy almadan mutate etme
- ❌ Birden fazla `setState` çağrısını döngü içinde yapma

---

## BEKLENEN KULLANICI AKIŞI (Doğrulama)

```
1. Kullanıcı sahibinden ilan sayfasına gider
2. "Bu İlanı Portföye Ekle" butonuna basar
3. Veri cars_drafts tablosuna status='draft' olarak kaydedilir
4. Kullanıcı otomatik olarak taslak detay ekranına yönlendirilir
5. Ekranda araç bilgileri ve ekspertiz SVG şeması görünür
6. Kullanıcı bir parçaya dokunur → modal açılır
7. Modal'dan durum seçer (Boyalı / Lokal Boyalı / Değişen / Orijinal)
8. SVG'de o parça anında doğru renge boyanır
9. Güncelleme cars_drafts tablosuna yazılır
10. Kullanıcı "Yayınla" butonuna basar
11. Veri cars tablosuna kopyalanır, cars_drafts kaydı silinir
12. Kullanıcı ana sayfaya yönlendirilir
```
