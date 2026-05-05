const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkParent() {
  const { data, error } = await supabase
    .from('car_taxonomy')
    .select('id, name, level')
    .eq('id', '1f5a460f-4d00-40d3-b97b-424a2c650cae');
  
  if (data && data.length > 0) {
    console.log('PARENT DETAILS:', data[0]);
  } else {
    console.log('Parent not found or error:', error);
  }
}

checkParent();
