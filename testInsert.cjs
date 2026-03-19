const { createClient } = require('@supabase/supabase-js');
const URL = "https://vdxafpcdjcgfxcrwvdym.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeGFmcGNkamNnZnhjcnd2ZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg1NjUsImV4cCI6MjA4ODk5NDU2NX0.TejsZNonu941Bl_xTxBvlUpcvqCfb2qHivJH2E5JrOY";

const supabase = createClient(URL, KEY);

async function testInsert() {
  const { error } = await supabase.from('matches').insert({
    id: 'test_insert',
    series: 'Test Series',
    home_team: 'Team A',
    away_team: 'Team B',
    venue: 'Test Stadium',
    start_time: new Date().toISOString(),
    status: 'upcoming',
    sport: 'cricket'
  });
  if (error) console.error("INSERT ERROR:", error.message);
  else console.log("INSERT SUCCESS!");
}

testInsert();
