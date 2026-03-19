const { createClient } = require('@supabase/supabase-js');
const URL = "https://vdxafpcdjcgfxcrwvdym.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeGFmcGNkamNnZnhjcnd2ZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg1NjUsImV4cCI6MjA4ODk5NDU2NX0.TejsZNonu941Bl_xTxBvlUpcvqCfb2qHivJH2E5JrOY";

const supabase = createClient(URL, KEY);

async function check() {
  const { data, count } = await supabase.from('matches').select('*', { count: 'exact' });
  console.log(`Matched Count: ${count}`);
  if (data && data.length > 0) {
    console.log(`First Match: ${data[0].id} - ${data[0].home_team} vs ${data[0].away_team}`);
  } else {
    console.log("No data found in Remote DB.");
  }
}

check();
