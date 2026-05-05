import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

/**
 * Gelişmiş Kazıma Scripti (V5 - Ekspertiz Fix)
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

    // 2. Teknik Bilgiler (Kesin Eşleşme)
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
        if(label === "Yakıt Tipi" || label === "Yakıt") data.fuel = value;
        if(label === "Vites") data.transmission = value;
        if(label === "Kasa Tipi") data.bodyType = value;
        if(label === "Motor Hacmi") engineCC = value;
        if(label === "Motor Gücü") engineHP = value;
      } catch(e) {}
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

    // 4. Ekspertiz (Çalışan Eski Mantık)
    var expItems = document.querySelectorAll('li.selected-damage');
    var pMap = { 
      'tampon': 'on_tampon', 'kaput': 'on_kaput', 'tavan': 'tavan', 
      'bagaj': 'arka_bagaj', 'ön çamurluk': 'on_sol', 'arka çamurluk': 'arka_sol',
      'ön kapı': 'on_sol_kapi', 'arka kapı': 'arka_sol_kapi',
      'sağ ön çamurluk': 'on_sag', 'sağ arka çamurluk': 'arka_sag',
      'sağ ön kapı': 'on_sag_kapi', 'sağ arka kapı': 'arka_sag_kapi'
    };

    for (var k = 0; k < expItems.length; k++) {
      var txt = expItems[k].innerText.toLowerCase();
      var state = 'painted';
      var parentTxt = expItems[k].parentElement ? expItems[k].parentElement.innerText.toLowerCase() : "";
      if (txt.indexOf('değişen') !== -1 || parentTxt.indexOf('değişen') !== -1) {
        state = 'changed';
      }

      for (var key in pMap) {
        if (txt.indexOf(key) !== -1) {
          var targetKey = pMap[key];
          if (txt.indexOf('sağ') !== -1) targetKey = targetKey.replace('sol', 'sag');
          data.expertise[targetKey] = state;
        }
      }
    }

    // 5. Açıklama (Ham Veriye Öncelik Ver)
    try {
      var scripts = document.getElementsByTagName('script');
      for (var s = 0; s < scripts.length; s++) {
        var h = scripts[s].innerHTML;
        if (h.indexOf('classifiedDetail') !== -1) {
           var m = h.match(/"description":"(.*?)"/);
           if (m && m[1]) {
             data.description = m[1]
               .replace(/\\\\n/g, '\\n')
               .replace(/\\\\r/g, '')
               .replace(/\\\\u003c/g, '<')
               .replace(/\\\\u003e/g, '>')
               .replace(/\\\\u0026/g, '&')
               .replace(/<[^>]*>?/gm, ''); 
             break;
           }
        }
      }
    } catch(e) {}

    if (!data.description || data.description.length < 5) {
      var descEl = document.querySelector('#classifiedDescription, .ui-description-content, .description-paris-container');
      if (descEl) data.description = descEl.innerText.trim();
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRAPE_SUCCESS', payload: data }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRAPE_ERROR', payload: err.toString() }));
  }
})();
`;

export default function ScraperScreen() {
  const { user } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const saveToDatabase = async (data: any) => {
    try {
      if (!user) throw new Error('Oturum açılmamış');

      const { error } = await supabase.from('cars').insert([{
        seller_id: user.id,
        brand: data.brand || 'Belirtilmemiş',
        model: data.model || 'Belirtilmemiş',
        series: data.series || '',
        year: data.year || 0,
        km: data.km || 0,
        price_b2b: data.price || 0,
        title: data.title,
        description: data.description || '',
        images: data.imageUrls,
        expertise: data.expertise,
        fuel: data.fuel,
        transmission: data.transmission,
        body_type: data.bodyType,
        engine: data.engine,
        status: 'published'
      }]);

      if (error) throw error;
      Alert.alert('Başarılı', 'İlan başarıyla portföyünüze eklendi.');
    } catch (err: any) {
      Alert.alert('Kayıt Hatası', err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SCRAPE_SUCCESS') {
        const data = msg.payload;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ İLAN VERİSİ ÇEKİLDİ');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📌 Başlık: ${data.title}`);
        console.log(`💰 Fiyat: ${data.price} TL`);
        console.log(`🚗 Araç: ${data.brand} ${data.series} ${data.model}`);
        console.log(`📅 Yıl: ${data.year} | 📏 KM: ${data.km}`);
        console.log(`⛽ Yakıt: ${data.fuel} | ⚙️ Vites: ${data.transmission}`);
        console.log(`📦 Kasa: ${data.bodyType} | 🔋 Motor: ${data.engine}`);
        console.log(`📝 Açıklama: ${data.description ? data.description.substring(0, 100) + '...' : 'BOŞ'}`);
        console.log(`🖼️ Görsel Sayısı: ${data.imageUrls?.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        saveToDatabase(data);
      } else {
        setIsScraping(false);
        console.error('❌ Scrape Hatası:', msg.payload);
        Alert.alert('Hata', 'İlan verileri çekilemedi.');
      }
    } catch (e) {
      setIsScraping(false);
      console.error('❌ Mesaj İşleme Hatası:', e);
    }
  };

  const startScrape = () => {
    if (!webViewRef.current) return;
    setIsScraping(true);
    webViewRef.current.injectJavaScript(SCRAPE_SCRIPT);
  };

  const isListingPage = currentUrl.includes('/ilan/') || currentUrl.includes('classified') || currentUrl.includes('detay');

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.sahibinden.com' }}
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
        mixedContentMode="always"
        onShouldStartLoadWithRequest={(request) => {
          return request.url.startsWith('http://') || request.url.startsWith('https://');
        }}
      />
      
      {isListingPage && (
        <TouchableOpacity 
          style={[styles.scrapeButton, isScraping && styles.disabledButton]} 
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
