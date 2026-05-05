const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqivvgnzrikwcavcxjsi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxaXZ2Z256cmlrd2NhdmN4anNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjAyMTQsImV4cCI6MjA5MDYzNjIxNH0.yyDP-4S-ODwV_XDcw8hAOOO0AEDBrlOPva_dgyzmZ9A';

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
