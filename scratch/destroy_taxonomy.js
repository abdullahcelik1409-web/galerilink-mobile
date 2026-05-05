const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaXZ2Z256cmlrd2NhdmN4anNpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2MDIxNCwiZXhwIjoyMDkwNjM2MjE0fQ.52xjpbbLVsQ71o4DRlZ4pUzMJtvYkxWKqLyFdJlBw7c';

const supabase = createClient(supabaseUrl, supabaseKey);

const brandsToDelete = [
  'BUICK', 'CADILLAC', 'CODA', 'FAW', 'FISKER', 
  'GMC', 'HISCAR', 'WIESMANN', 'RAVON', 
  'RENAULT (OYAK)', 'TOFAS-FIAT', 'MAYBACH'
].map(b => b.toLowerCase().trim());

async function destroy() {
  console.log('--- STARTING AGGRESSIVE CASCADE DESTRUCTION ---');

  // 1. Fetch ALL brands to filter in JS (to be safe with spaces/casing)
  console.log('Fetching all brand-level nodes...');
  const { data: allBrands, error: fetchErr } = await supabase
    .from('car_taxonomy')
    .select('id, name')
    .eq('level', 'marka');

  if (fetchErr) {
    console.error('Error fetching all brands:', fetchErr);
    return;
  }

  const targetBrandNodes = allBrands.filter(b => {
    const cleanName = b.name.toLowerCase().trim();
    return brandsToDelete.includes(cleanName);
  });

  console.log(`Found ${targetBrandNodes.length} matching brand nodes across all categories/years.`);

  if (targetBrandNodes.length === 0) {
    console.log('No matching brands found. Exiting.');
    return;
  }

  const brandIds = targetBrandNodes.map(b => b.id);
  
  // 2. Recursive Child Collection
  let allIdsToDelete = [...brandIds];
  let currentParentIds = [...brandIds];

  while (currentParentIds.length > 0) {
    console.log(`Checking for children of ${currentParentIds.length} nodes...`);
    
    const CHUNK_SIZE = 100; // Smaller chunk for IN filter to avoid Bad Request
    let allChildren = [];
    
    for (let i = 0; i < currentParentIds.length; i += CHUNK_SIZE) {
      const chunk = currentParentIds.slice(i, i + CHUNK_SIZE);
      const { data: children, error: childErr } = await supabase
        .from('car_taxonomy')
        .select('id')
        .in('parent_id', chunk);

      if (childErr) {
        console.error(`  Error fetching children for chunk ${i}:`, childErr);
        continue;
      }
      if (children) allChildren = [...allChildren, ...children];
    }

    if (allChildren.length === 0) break;

    const childIds = allChildren.map(c => c.id);
    // Avoid circularity or redundant processing
    const newChildIds = childIds.filter(id => !allIdsToDelete.includes(id));
    if (newChildIds.length === 0) break;

    allIdsToDelete = [...allIdsToDelete, ...newChildIds];
    currentParentIds = newChildIds;
    console.log(`  Found ${newChildIds.length} new descendant nodes.`);
  }

  console.log(`\nTOTAL NODES IDENTIFIED FOR DELETION: ${allIdsToDelete.length}`);

  // 3. Perform Deletion in Chunks
  const DEL_CHUNK_SIZE = 200;
  for (let i = 0; i < allIdsToDelete.length; i += DEL_CHUNK_SIZE) {
    const chunk = allIdsToDelete.slice(i, i + DEL_CHUNK_SIZE);
    const { count, error: delErr } = await supabase
      .from('car_taxonomy')
      .delete({ count: 'exact' })
      .in('id', chunk);

    if (delErr) {
      console.error(`  Error deleting chunk ${i}:`, delErr);
    } else {
      console.log(`  Successfully processed chunk. Affected rows: ${count}`);
      if (count === 0) {
        console.warn('  WARNING: 0 rows affected. This usually indicates RLS policy restrictions or invalid permissions.');
      }
    }
  }

  console.log('\n--- AGGRESSIVE DESTRUCTION COMPLETE ---');
}

destroy();
