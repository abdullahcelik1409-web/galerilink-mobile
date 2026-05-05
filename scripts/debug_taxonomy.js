const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaXZ2Z256cmlrd2NhdmN4anNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjAyMTQsImV4cCI6MjA5MDYzNjIxNH0.yyDP-4S-ODwV_XDcw8hAOOO0AEDBrlOPva_dgyzmZ9A';
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
