const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function trace(id, levelName) {
  const { data: children } = await supabase.from('car_taxonomy').select('*').eq('parent_id', id).limit(5);
  console.log(`\n--- Level: ${levelName} (ID: ${id}) ---`);
  if (!children || children.length === 0) {
    console.log('No more children.');
    return;
  }
  console.log('Children found:', children.map(c => ({ name: c.name, level: c.level })));
  
  // Follow the first child
  await trace(children[0].id, children[0].level);
}

async function startTrace() {
  // Start from Audi (Year 2024) (ca79a1bd-a5ad-45e5-9ba9-680bc92cd8ab)
  await trace('ca79a1bd-a5ad-45e5-9ba9-680bc92cd8ab', 'marka');
  process.exit();
}

startTrace();
