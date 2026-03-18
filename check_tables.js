import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['profiles', 'matches', 'markets', 'bets', 'transactions', 'withdrawals'];
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table ${table}: Error - ${error.message} (${error.code})`);
      } else {
        console.log(`Table ${table}: OK`);
      }
    } catch (e) {
      console.log(`Table ${table}: Exception - ${e.message}`);
    }
  }
}

checkTables();
