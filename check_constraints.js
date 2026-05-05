
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function discover() {
  console.log('🔍 Geçerli bir seller_id aranıyor (cars tablosundan)...');
  const { data: car } = await supabase.from('cars').select('seller_id').limit(1).maybeSingle();
  
  let seller_id = car ? car.seller_id : null;

  if (!seller_id) {
    console.log('ℹ️ Hiç ilan bulunamadı. Anonim bir UUID deniyoruz...');
    seller_id = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
  }
  
  console.log('✅ Seller ID:', seller_id);

  const candidates = [
    'Nakit İhtiyacı', 'Acil Satılık', 'Yeni Araç Aldım', 'Yurt Dışı Yerleşimi', 'Ticari Borç Ödemesi',
    'nakit_ihtiyacı', 'acil_satilik', 'yeni_arac', 'yurt_disi', 'borc_odemesi',
    'nakit_ihtiyaci',
    'Nakit', 'Acil', 'Borç', 'Yurt Dışı', 'Diğer',
    'Cash Need', 'Urgent Sale', 'New Car', 'Moving Abroad', 'Business Debt',
    'CASH_NEED', 'URGENT_SALE', 'NEW_CAR', 'MOVING_ABROAD', 'BUSINESS_DEBT'
  ];

  for (const reason of candidates) {
    process.stdout.write(`🧪 Deneniyor: "${reason}"... `);
    try {
        const { error } = await supabase
          .from('cars')
          .insert([{
            seller_id,
            brand: 'TEST',
            model: 'TEST',
            year: 2024,
            km: 0,
            price_b2b: 0,
            title: 'TEST DELETE ME',
            images: [],
            expertise: {},
            is_opportunity: true,
            opportunity_reason: reason,
            status: 'draft'
          }]);

        if (error) {
          if (error.message.includes('cars_opportunity_reason_check')) {
            console.log('❌ Reddedildi (Constraint)');
          } else {
            console.log('⚠️ Hata:', error.message);
          }
        } else {
          console.log('✅ KABUL EDİLDİ!');
          await supabase.from('cars').delete().eq('opportunity_reason', reason).eq('title', 'TEST DELETE ME');
          return;
        }
    } catch (e) {
        console.log('💥 İstisna:', e.message);
    }
  }
}

discover();
