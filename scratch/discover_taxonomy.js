const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaXZ2Z256cmlrd2NhdmN4anNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MDIxNCwiZXhwIjoyMDkwNjM2MjE0fQ.52xjpbbLVsQ71o4DRlZ4pUzMJtvYkxWKqLyFdJlBw7c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function discover() {
  console.log('--- TAXONOMY HIERARCHY ANALYSIS ---');
  
  // Search for specific keywords in the whole table
  const keywords = ['BUICK', 'CADILLAC', 'CODA', 'FAW', 'FISKER', 'GMC', 'HISCAR', 'WIESMANN', 'RAVON', 'RENAULT (OYAK)', 'TOFAS-FIAT', 'MAYBACH'];
  for (const kw of keywords) {
    const { data, error } = await supabase
      .from('car_taxonomy')
      .select('id, name, level, parent_id')
      .ilike('name', `%${kw}%`);
    
    if (data && data.length > 0) {
      console.log(`\nFOUND ITEMS FOR KEYWORD "${kw}":`);
      data.forEach(d => console.log(`ID: ${d.id}, Name: ${d.name}, Level: ${d.level}, ParentID: ${d.parent_id}`));
    } else {
      console.log(`\nNo items found for keyword "${kw}"`);
    }
  }
}

discover();
