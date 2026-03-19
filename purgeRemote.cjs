const { createClient } = require('@supabase/supabase-js');
const URL = "https://vdxafpcdjcgfxcrwvdym.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeGFmcGNkamNnZnhjcnd2ZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTg1NjUsImV4cCI6MjA4ODk5NDU2NX0.TejsZNonu941Bl_xTxBvlUpcvqCfb2qHivJH2E5JrOY";

const supabase = createClient(URL, KEY);

async function purge() {
  console.log("Purging REMOTE markets...");
  await supabase.from('markets').delete().neq('id', 'void');
  console.log("Purging REMOTE matches...");
  const { error } = await supabase.from('matches').delete().neq('id', 'void');
  if (error) console.error("Error:", error);
  else console.log("Success! Remote DB is clean.");
}

purge();
