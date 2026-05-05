
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('car_taxonomy').select('status').eq('status', 'approved').limit(5);
  if (error) console.error(error);
  else console.log(data);
}

check();
