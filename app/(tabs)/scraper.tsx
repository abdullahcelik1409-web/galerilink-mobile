import Colors from '@/constants/Colors';
import { useSubscriptionLimit } from '@/hooks/use-subscription-limit';
import { useAuth } from '@/lib/auth-context';
import { isAllowedSahibindenHost, normalizeScrapedImageUrls } from '@/lib/security';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const SCRAPER_HOME_URL = 'https://www.sahibinden.com';

const isAllowedScraperUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && isAllowedSahibindenHost(parsed.hostname);
  } catch {
    return false;
  }
};

const isValidScrapePayload = (data: any) => {
  const imageUrls = normalizeScrapedImageUrls(data?.imageUrls);
  if (data && typeof data === 'object') {
    data.imageUrls = imageUrls;
  }

  return data
    && typeof data === 'object'
    && typeof data.title === 'string'
    && data.title.trim().length > 0
    && (typeof data.price === 'number' || typeof data.price === 'string')
    && imageUrls.length > 0;
};

/**
 * Gelişmiş Kazıma Scripti (V7 - Açıklama Scope Fix)
 */
const SCRAPE_SCRIPT = `
(function() {
  try {
    var data = { expertise: {}, imageUrls: [], description: "" };
    
    function clean(t) { return t ? t.innerText.trim() : ""; }

    // 1. Fiyat ve Başlık
    var priceEl = document.querySelector('.price');
    data.price = priceEl ? parseInt(priceEl.innerText.replace(/[^0-9]/g, '')) : 0;
    data.title = clean(document.querySelector('.classified-title-container h1')) || clean(document.querySelector('.classified-title')) || document.title.split('-')[0].trim();
    data.ilanNo = clean(document.querySelector('#classifiedId')) || clean(document.querySelector('.classifiedId'));

    // 2. Teknik Bilgiler
    var rows = document.querySelectorAll('.classified-info-list li');
    var engineCC = "", engineHP = "";
    
    for (var i = 0; i < rows.length; i++) {
      try {
        var labelNode = rows[i].querySelector('strong');
        var valueNode = rows[i].querySelector('span');
        if (!labelNode || !valueNode) continue;
        var label = labelNode.innerText.replace(':','').trim();
        var value = valueNode.innerText.trim();
        if(label === "Marka") data.brand = value;
        if(label === "Seri") data.series = value;
        if(label === "Model") data.model = value;
        if(label === "Yıl") data.year = parseInt(value) || 0;
        if(label === "KM" || label === "Kilometre") data.km = parseInt(value.replace(/[^0-9]/g, '')) || 0;
        if(label === "Yakıt Tipi" || label === "Yakıt") {
          data.fuel = value;
          // EURO standartını temizle (Dizel / EURO 5 → Dizel)
          if (data.fuel) {
            data.fuel = data.fuel.replace(/\\s*\\/\\s*EURO\\s*\\d+/i, '').trim();
          }
        }
        if(label === "Vites") data.transmission = value;
        if(label === "Kasa Tipi") data.bodyType = value;
        if(label === "Motor Hacmi") engineCC = value;
        if(label === "Motor Gücü") engineHP = value;
      } catch(e) {}
    }
    if (data.model && data.series) {
      var seriesEscaped = data.series.trim().replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\\\$&');
      var regex = new RegExp('^' + seriesEscaped + '\\s+' + seriesEscaped + '\\s*', 'i');
      data.model = data.model.replace(regex, data.series + ' ').trim();
    }
    if (engineCC || engineHP) {
      data.engine = (engineHP + " / " + engineCC).trim().replace(/^\\/|\\/$/g, '').trim();
    }

    // 3. Görseller
    var allImgs = document.getElementsByTagName('img');
    for (var j = 0; j < allImgs.length; j++) {
      var src = allImgs[j].getAttribute('data-src') || allImgs[j].getAttribute('data-original') || allImgs[j].src;
      if (src && src.indexOf('photos/') !== -1 && src.indexOf('thmb_') === -1 && src.indexOf('clear.gif') === -1) {
        var big = src.replace('.avif', '.jpg').split('?')[0];
        if (data.imageUrls.indexOf(big) === -1) data.imageUrls.push(big);
      }
    }

    // 4. Ekspertiz
    var statusClassMap = {
      'local-painted-new': 'local',
      'painted-new':       'painted',
      'changed-new':       'changed'
    };

    function getPartKey(txt) {
      if (txt.indexOf('sağ arka çamurluk') !== -1) return 'arka_sag';
      if (txt.indexOf('sağ ön çamurluk')  !== -1) return 'on_sag';
      if (txt.indexOf('sağ arka kapı')    !== -1) return 'arka_sag_kapi';
      if (txt.indexOf('sağ ön kapı')      !== -1) return 'on_sag_kapi';
      if (txt.indexOf('sol arka çamurluk') !== -1) return 'arka_sol';
      if (txt.indexOf('sol ön çamurluk')  !== -1) return 'on_sol';
      if (txt.indexOf('sol arka kapı')    !== -1) return 'arka_sol_kapi';
      if (txt.indexOf('sol ön kapı')      !== -1) return 'on_sol_kapi';
      if (txt.indexOf('arka çamurluk')    !== -1) return 'arka_sol';
      if (txt.indexOf('ön çamurluk')      !== -1) return 'on_sol';
      if (txt.indexOf('arka kapı')        !== -1) return 'arka_sol_kapi';
      if (txt.indexOf('ön kapı')          !== -1) return 'on_sol_kapi';
      if (txt.indexOf('arka tampon')      !== -1) return 'arka_tampon';
      if (txt.indexOf('tampon')           !== -1) return 'on_tampon';
      if (txt.indexOf('kaput')            !== -1) return 'on_kaput';
      if (txt.indexOf('tavan')            !== -1) return 'tavan';
      if (txt.indexOf('bagaj')            !== -1) return 'arka_bagaj';
      return null;
    }

    var allUls = document.querySelectorAll('ul');
    for (var u = 0; u < allUls.length; u++) {
      var liChildren = allUls[u].querySelectorAll('li');
      var activeStatus = null;
      for (var k = 0; k < liChildren.length; k++) {
        var li = liChildren[k];
        var liClass = li.className || '';
        if (liClass.indexOf('pair-title') !== -1) {
          activeStatus = null;
          for (var statusClass in statusClassMap) {
            if (liClass.indexOf(statusClass) !== -1) {
              activeStatus = statusClassMap[statusClass];
              break;
            }
          }
          continue;
        }
        if (liClass.indexOf('selected-damage') !== -1 && activeStatus !== null) {
          var partTxt = li.innerText.toLowerCase().trim();
          var partKey = getPartKey(partTxt);
          if (partKey !== null) {
            data.expertise[partKey] = activeStatus;
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. Açıklama — 3 Katmanlı Sistem
    // KURAL: Tüm değişkenler bu bloğun EN ÜSTÜNDE tanımlanır (scope güvenliği)
    // ─────────────────────────────────────────────────────────────────────
    data.description = '';

    // Scope-safe değişkenler — try/catch dışında tanımlı
    var jsonLdCount = 0;
    var descCandidates = [];
    var tabButton = null;

    // ── KATMAN 1: JSON-LD ──
    try {
      var jsonLdTags = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdCount = jsonLdTags.length; // scope-safe değişkene kopyala
      for (var ld = 0; ld < jsonLdTags.length; ld++) {
        var ldContent = jsonLdTags[ld].innerHTML;
        if (ldContent && ldContent.indexOf('description') !== -1) {
          var ldParsed = JSON.parse(ldContent);
          var ldDesc = ldParsed.description ||
                       (ldParsed['@graph'] && ldParsed['@graph'][0] && ldParsed['@graph'][0].description) ||
                       '';
          if (ldDesc && ldDesc.length > 5) {
            data.description = ldDesc.replace(/<[^>]*>?/gm, '').trim();
            break;
          }
        }
      }
    } catch(e) {}

    

    // ── KATMAN 2: SCRIPT TAG İÇİ JSON ──
    if (!data.description || data.description.length < 5) {
      try {
        var allScripts = document.getElementsByTagName('script');
        for (var s = 0; s < allScripts.length; s++) {
          var scriptContent = allScripts[s].innerHTML;
          if (!scriptContent) continue;

          if (scriptContent.indexOf('classifiedDetail') !== -1) {
            var m1 = scriptContent.match(/"description"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"/);
            if (m1 && m1[1] && m1[1].length > 5) descCandidates.push(m1[1]);
          }
          if (scriptContent.indexOf('__NEXT_DATA__') !== -1 ||
              scriptContent.indexOf('__INITIAL_STATE__') !== -1) {
            var m2 = scriptContent.match(/"description"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"/);
            if (m2 && m2[1] && m2[1].length > 5) descCandidates.push(m2[1]);
          }
          if (scriptContent.indexOf('pageProps') !== -1 ||
              scriptContent.indexOf('detailPage') !== -1) {
            var m3 = scriptContent.match(/"description"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"/);
            if (m3 && m3[1] && m3[1].length > 5) descCandidates.push(m3[1]);
          }
        }

        if (descCandidates.length > 0) {
          var bestCandidate = descCandidates.reduce(function(a, b) {
            return a.length >= b.length ? a : b;
          });
          data.description = bestCandidate
            .replace(/\\\\n/g, '\\n')
            .replace(/\\\\r/g, '')
            .replace(/\\\\u003c/g, '<')
            .replace(/\\\\u003e/g, '>')
            .replace(/\\\\u0026/g, '&')
            .replace(/\\\\"/g, '"')
            .replace(/<[^>]*>?/gm, '')
            .trim();
        }
      } catch(e) {}
    }

    

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRAPE_SUCCESS', payload: data }));

  } catch (err) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'SCRAPE_ERROR', payload: err.toString() })
    );
  }
})();
`;



export default function ScraperScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { user, isTrialExpired } = useAuth();
  const { canAdd } = useSubscriptionLimit();
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const saveToDatabase = async (data: any) => {
    try {
      if (!user) throw new Error('Oturum açılmamış');

      // description removed: users will enter manually

      const { data: insertedDraft, error } = await supabase
        .from('cars_drafts')
        .insert([{
          seller_id: user.id,
          ilan_no: data.ilanNo || '',
          title: data.title,
          brand: data.brand || 'Belirtilmemiş',
          model: data.model || 'Belirtilmemiş',
          series: data.series || '',
          year: data.year || 0,
          km: data.km || 0,
          price: String(data.price || 0),
          price_b2b: data.price || 0,
          description: '',
          images: normalizeScrapedImageUrls(data.imageUrls),
          expertise: data.expertise || {},
          fuel: data.fuel ? data.fuel.replace(/\s*\/\s*EURO\s*\d+/i, '').trim() : '',
          transmission: data.transmission || '',
          body_type: data.bodyType || '',
          engine: data.engine || '',
          status: 'draft',
          is_active: true,
          is_opportunity: false,
          is_trade_closed: true,
          heavy_damage: 'Hayır',
        }])
        .select()
        .single();

      if (error) throw error;
      if (!insertedDraft) throw new Error('Taslak oluşturulamadı');

      router.push(`/listing/${insertedDraft.id}`);
    } catch (err: any) {
      const isLimitError = err.message?.toLowerCase().includes('sınırınıza') || 
                           err.message?.toLowerCase().includes('limit') ||
                           err.message?.toLowerCase().includes('row-level security');
      
      if (isLimitError) {
        Alert.alert(
          'Abonelik Yetkisi / Limit Aşımı',
          'Mevcut paketinizin ilan limitine ulaştınız veya aktif bir aboneliğiniz bulunmuyor.',
          [
            {
              text: 'Paketi Yükselt / Paket Seç',
              onPress: () => router.push('/subscription'),
            },
            {
              text: 'Vazgeç',
              style: 'cancel',
            },
          ]
        );
      } else {
        Alert.alert('Kayıt Hatası', err.message);
      }
    } finally {
      setIsScraping(false);
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      
      if (msg.type === 'SCRAPE_SUCCESS') {
        const data = msg.payload;
        if (!isAllowedScraperUrl(currentUrl) || !isValidScrapePayload(data)) {
          setIsScraping(false);
          Alert.alert('Hata', 'Bu sayfadan ilan verisi alinamaz.');
          return;
        }
        saveToDatabase(data);
      } else {
        setIsScraping(false);
        console.warn('[Scraper] Scrape failed.');
        Alert.alert('Hata', 'İlan verileri çekilemedi.');
      }
    } catch (e) {
      setIsScraping(false);
      console.warn('[Scraper] Message handling failed.');
    }
  };

  const startScrape = () => {
    if (!canAdd || isTrialExpired) {
      router.push('/subscription');
      return;
    }

    if (!webViewRef.current || !isAllowedScraperUrl(currentUrl) || !isListingPage) return;
    setIsScraping(true);
    webViewRef.current.injectJavaScript(SCRAPE_SCRIPT);
  };

  const isListingPage = currentUrl.includes('/ilan/') || currentUrl.includes('classified') || currentUrl.includes('detay');

  return (
    <SafeAreaView style={styles.container}>
      {isFocused && (
        <WebView
          ref={webViewRef}
          source={{ uri: SCRAPER_HOME_URL }}
          onNavigationStateChange={(navState) => setCurrentUrl(navState.url)}
          onMessage={handleMessage}
          style={{ flex: 1 }}
          domStorageEnabled={true}
          javaScriptEnabled={true}
          userAgent={Platform.OS === 'android' 
            ? "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
            : "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
          }
          applicationNameForUserAgent="Safari/604.1"
          originWhitelist={['https://*.sahibinden.com']}
          setSupportMultipleWindows={false}
          mixedContentMode="never"
          onShouldStartLoadWithRequest={(request) => {
            return isAllowedScraperUrl(request.url);
          }}
        />
      )}
      
      {isFocused && isListingPage && (
        <TouchableOpacity 
          style={[
            styles.scrapeButton, 
            isScraping && styles.disabledButton,
            (!canAdd || isTrialExpired) && { opacity: 0.5 }
          ]} 
          onPress={startScrape}
          disabled={isScraping}
        >
          {isScraping ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.buttonText}>Bu İlanı Portföye Ekle</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrapeButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.tint,
    height: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
