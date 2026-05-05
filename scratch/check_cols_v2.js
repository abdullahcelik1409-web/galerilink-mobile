
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'car_taxonomy' });
  // If RPC doesn't exist, try a select on a non-existent column to see the error message which might list columns
  if (error) {
     const { error: error2 } = await supabase.from('car_taxonomy').select('non_existent_column').limit(1);
     console.log(error2.message);
  } else {
     console.log(data);
  }
}

check();
