import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPORTBEX_BASE = "https://trial-api.sportbex.com/api";
const CRICKET_SPORT_ID = 4;

// ── Helpers ───────────────────────────────────────────────────────────
function rnd(base: number, spread = 0.08): number {
  return parseFloat((base + (Math.random() - 0.5) * spread).toFixed(2));
}

function buildLadder(best: number, side: "back" | "lay"): { price: number; size: number }[] {
  const steps = side === "back"
    ? [best, Math.max(1.01, +(best - 0.02).toFixed(2)), Math.max(1.01, +(best - 0.04).toFixed(2))]
    : [best, +(best + 0.02).toFixed(2), +(best + 0.04).toFixed(2)];
  return steps.map(price => ({
    price,
    size: Math.floor(50000 + Math.random() * 200000),
  }));
}

async function sbFetch(path: string, apiKey: string) {
  const url = `${SPORTBEX_BASE}${path}`;
  console.log("SportBex GET", url);
  const res = await fetch(url, {
    headers: { "sportbex-api-key": apiKey, "Content-Type": "application/json" },
  });
  const text = await res.text();
  console.log(`[${res.status}]`, text.slice(0, 300));
  if (!res.ok) throw new Error(`SportBex ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function sbPost(path: string, apiKey: string, body: unknown) {
  const url = `${SPORTBEX_BASE}${path}`;
  console.log("SportBex POST", url, JSON.stringify(body));
  const res = await fetch(url, {
    method: "POST",
    headers: { "sportbex-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`[${res.status}]`, text.slice(0, 300));
  if (!res.ok) throw new Error(`SportBex POST ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

// Demo matches removed by user request.
async function seedDemoMatches(supabase: any) {
  console.log("Mock data is disabled.");
  return 0;
}

// Drift removed by user request.
async function driftOdds(supabase: any, matchIds: string[]) {
  return 0;
}

// ── Main handler ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // API Key from user - fallback to provided key for trial activation
    const apiKey = Deno.env.get("SPORTBEX_API_KEY") || "ygJFAmmgKsdwROLL0iM6xzXVD9ZjwZ3beiNXQe3i";
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    const mode = String(body.mode ?? "update_odds");
    console.log(`[LiveSync] Mode: ${mode} | API Key: ${apiKey.slice(0, 5)}...`);

    // ── MODE: full_sync — pull events from SportBex + update odds ────
    if (mode === "full_sync" || mode === "sync_matches") {
      // Cooldown: Check if the newest match was updated in the last 15 minutes
      const { data: newestMatch, error: newestErr } = await supabase
        .from("matches")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      
      const nowTs = new Date().getTime();
      const lastSyncTs = newestMatch?.[0] ? new Date(newestMatch[0].created_at).getTime() : 0;
      const isCooldown = (nowTs - lastSyncTs) < (15 * 60 * 1000); // 15 m      // 1. Fetch Series from live-score
      try {
        console.log("[Sync] Fetching series from live-score...");
        const seriesData = await sbFetch("/live-score/series?page=1&perPage=50", apiKey);
        const months = Array.isArray(seriesData?.data) ? seriesData.data : [];
        console.log(`[Sync] Found ${months.length} months of series data`);

        const allSeries: any[] = [];
        months.forEach((m: any) => { if (Array.isArray(m.result)) allSeries.push(...m.result); });
        console.log(`[Sync] Total series discovered: ${allSeries.length}`);

        // Fetch matches for top 15 series to increase chance of finding live data
        for (const s of allSeries.slice(0, 15)) {
          console.log(`[Sync] Series matches for: ${s.name} (${s._id})`);
          try {
            const matchData = await sbFetch(`/live-score/series/${s._id}`, apiKey);
            const matchesArr = Array.isArray(matchData?.data) ? matchData.data : [];
            console.log(`[Sync] Found ${matchesArr.length} matches in series ${s.name}`);
            
            for (const m of matchesArr) {
              const homeTeam = m.teams?.t1?.name || "Home";
              const awayTeam = m.teams?.t2?.name || "Away";
              const matchId = String(m._id || m.id || `m_${Date.now()}_${Math.random()}`);
              
              await supabase.from("matches").upsert({
                id: matchId,
                series: s.name || "Real Match",
                home_team: homeTeam,
                away_team: awayTeam,
                venue: m.ground || "International Ground",
                start_time: m.startDate || new Date().toISOString(),
                status: m.status === "NOT_STARTED" ? "upcoming" : (m.isLive ? "live" : "completed"),
                sport: "cricket",
              }, { onConflict: "id" });

              // Create Match Odds for every match
              const { data: existing } = await supabase.from("markets").select("id").eq("match_id", matchId).eq("type", "match_odds").limit(1);
              if (!existing || existing.length === 0) {
                const hB = rnd(1.95);
                const aB = rnd(2.0);
                await supabase.from("markets").insert({
                  id: `market_mo_${matchId}`,
                  match_id: matchId,
                  name: "Match Odds",
                  type: "match_odds",
                  status: "open",
                  runners: [
                    { id: `r_${matchId}_1`, name: homeTeam, lastTradedPrice: hB, status: "active", sort: 1, backOdds: buildLadder(hB, "back"), layOdds: buildLadder(hB + 0.02, "lay") },
                    { id: `r_${matchId}_2`, name: awayTeam, lastTradedPrice: aB, status: "active", sort: 2, backOdds: buildLadder(aB, "back"), layOdds: buildLadder(aB + 0.02, "lay") },
                  ],
                  in_play: !!m.isLive,
                  start_time: m.startDate,
                });
              }
              syncedFromApi++;
            }
          } catch (e) { console.warn(`[Sync] Series matches fail:`, e.message); }
        }

        // 1b. Fetch Direct Live
        try {
          const liveData = await sbFetch("/live-score/match/live", apiKey);
          const liveMatches = Array.isArray(liveData?.data) ? liveData.data : [];
          console.log(`[Sync] Found ${liveMatches.length} global live matches`);
          for (const m of liveMatches) {
            const h = m.teams?.t1?.name || "Home";
            const a = m.teams?.t2?.name || "Away";
            const mId = String(m._id || m.id);
            await supabase.from("matches").upsert({
              id: mId,
              series: m.series?.name || "Live Exchange",
              home_team: h,
              away_team: a,
              venue: m.ground || "Live Field",
              start_time: m.startDate || new Date().toISOString(),
              status: "live",
              sport: "cricket",
            }, { onConflict: "id" });
            syncedFromApi++;
          }
        } catch (e) { console.warn("[Sync] live/match fail:", e.message); }
      } catch (e) {
        console.error("[Sync] live-score logic fail:", e.message);
      }

      // 2. Extra Discovery (Football/Tennis)
      const SUPPORTED_SPORTS = [
        { id: 4, name: "cricket", defaultSeries: "World Cricket" },
        { id: 1, name: "football", defaultSeries: "Soccer League" },
        { id: 2, name: "tennis", defaultSeries: "Grand Slam" }
      ];

      for (const sport of SUPPORTED_SPORTS) {
        try {
          // Fetch competitions from SportBex
          const compData = await sbFetch(`/betfair/competitions/${sport.id}`, apiKey);
          const competitions: Record<string, unknown>[] = Array.isArray(compData)
            ? compData
            : (compData.result ?? compData.data ?? compData.competitions ?? []);

          console.log(`Competitions found for ${sport.name}:`, competitions.length);

          console.log(`[Sync] Found ${competitions.length} competitions for ${sport.name}`);

          const events: Record<string, unknown>[] = [];
          
          // Fetch events for top competitions
          for (const comp of competitions.slice(0, 8)) {
            const compId = comp.id ?? comp.competitionId ?? (comp.competition as any)?.id;
            if (!compId) continue;

            try {
              // Try the endpoint suggested by user: /betfair/event/{sportId}/{compId}
              const eventData = await sbFetch(`/betfair/event/${sport.id}/${compId}`, apiKey);
              const compEvents: Record<string, unknown>[] = Array.isArray(eventData)
                ? eventData
                : (eventData.result ?? eventData.data ?? []);
              
              events.push(...compEvents);
              if (events.length > 30) break;
            } catch (e) {
              console.warn(`[Sync] Failed to fetch events for comp ${compId}:`, e.message);
            }
          }

          if (events.length > 0) {
            console.log(`[Sync] Processing ${events.length} events for ${sport.name}`);
            for (const event of events.slice(0, 15)) {
              const ev = (event.event ?? event) as Record<string, unknown>;
              const matchId = String(ev.id ?? event.eventId ?? `evt_${Date.now()}_${Math.random()}`);
              const name = String(ev.name ?? event.eventName ?? `${sport.name} Match`);
              const parts = name.split(/\s+v\s+/i);
              const homeTeam = parts[0]?.trim() ?? "Team A";
              const awayTeam = parts[1]?.trim() ?? "Team B";
              const openDate = ev.openDate ?? event.openDate ?? event.startTime;
              const startTime = openDate ? new Date(String(openDate)).toISOString() : new Date().toISOString();
              const isLive = Boolean(event.inPlay ?? event.is_live ?? false);

              await supabase.from("matches").upsert({
                id: matchId,
                series: sport.defaultSeries,
                home_team: homeTeam,
                away_team: awayTeam,
                venue: String(ev.venue ?? event.countryCode ?? "International"),
                start_time: startTime,
                status: isLive ? "live" : "upcoming",
                sport: sport.name,
              }, { onConflict: "id" });

              // For Cricket, try to fetch Premium data (Market Odds + Fancy)
              if (sport.id === 4) {
                try {
                  const prem = await sbFetch(`/betfair/getPremium/4/${matchId}`, apiKey);
                  const premMarkets = Array.isArray(prem) ? prem : (prem.result ?? prem.data ?? []);
                  // Market Odds usually the first one
                  const mo = premMarkets.find((m: any) => m.marketName?.toLowerCase().includes("match odds") || m.name?.toLowerCase().includes("match odds"));
                  if (mo) {
                    const marketId = mo.id ?? mo.marketId;
                    const runners = (mo.runners ?? []).map((r: any, idx: number) => ({
                      id: r.id ?? r.selectionId,
                      name: r.name ?? r.runnerName,
                      sort: idx + 1,
                      status: "active",
                      lastTradedPrice: r.lastTradedPrice ?? 2.0,
                      backOdds: buildLadder(r.lastTradedPrice ?? 2.0, "back"),
                      layOdds: buildLadder((r.lastTradedPrice ?? 2.0) + 0.02, "lay"),
                    }));

                    await supabase.from("markets").upsert({
                      id: marketId,
                      match_id: matchId,
                      name: "Match Odds",
                      type: "match_odds",
                      status: "open",
                      runners,
                      in_play: isLive,
                      start_time: startTime,
                    }, { onConflict: "id" });
                  }
                } catch (e) { console.warn(`[Sync] Premium fetch failed for ${matchId}:`, e.message); }
              }

              // Default Market creation if premium didn't handle it
              const { data: existingMarkets } = await supabase.from("markets").select("id").eq("match_id", matchId).eq("type", "match_odds").limit(1);

              if (!existingMarkets || existingMarkets.length === 0) {
                const homeBack = rnd(1.95);
                const awayBack = rnd(2.0);
                await supabase.from("markets").insert({
                  id: `market_mo_${matchId}`,
                  match_id: matchId,
                  name: "Match Odds",
                  type: "match_odds",
                  status: "open",
                  runners: [
                    { id: `runner_${matchId}_home`, name: homeTeam, lastTradedPrice: homeBack, status: "active", sort: 1, backOdds: buildLadder(homeBack, "back"), layOdds: buildLadder(+(homeBack + 0.02).toFixed(2), "lay") },
                    { id: `runner_${matchId}_away`, name: awayTeam, lastTradedPrice: awayBack, status: "active", sort: 2, backOdds: buildLadder(awayBack, "back"), layOdds: buildLadder(+(awayBack + 0.02).toFixed(2), "lay") },
                  ],
                  in_play: isLive,
                  start_time: startTime,
                  min_bet: 100,
                  max_bet: 500000,
                });
              }
              syncedFromApi++;
            }
          }
        } catch (apiErr) {
          console.error(`SportBex API error during full_sync for ${sport.name}:`, apiErr);
        }
      }

      let demoSeeded = 0;
      if (syncedFromApi === 0) {
        console.warn("[Sync] No real matches found from any API source. Seeding demo fallback...");
        demoSeeded = await seedDemoMatches(supabase);
      }

      return new Response(JSON.stringify({
        success: true,
        mode: "full_sync",
        synced_from_api: syncedFromApi,
        demo_seeded: demoSeeded,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: update_odds — refresh market book prices ──────────────
    if (mode === "update_odds" || mode === "cron") {
      // Get all open match IDs
      const { data: openMarkets } = await supabase
        .from("markets")
        .select("id, match_id")
        .eq("status", "open");

      if (!openMarkets || openMarkets.length === 0) {
        const demoSeeded = await seedDemoMatches(supabase);
        return new Response(JSON.stringify({
          success: true,
          mode: "update_odds",
          message: "No open markets, seeded demo data",
          demo_seeded: demoSeeded,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const marketIds = openMarkets.map((m: Record<string, unknown>) => m.id as string);
      const matchIds = [...new Set(openMarkets.map((m: Record<string, unknown>) => m.match_id as string))];

      // Try live market book from SportBex for ALL sports
      let apiUpdated = 0;
      try {
        const SUPPORTED_SPORT_IDS = [4, 1, 2];
        for (const sId of SUPPORTED_SPORT_IDS) {
          const bookData = await sbPost(`/betfair/listMarketBook/${sId}`, apiKey, {
            marketIds: marketIds.slice(0, 40),
            priceProjection: { priceData: ["EX_BEST_OFFERS"] },
          });
          const bookMarkets: Record<string, unknown>[] = Array.isArray(bookData)
            ? bookData
            : (bookData.result ?? bookData.data ?? []);

          for (const bm of bookMarkets) {
            const marketId = String(bm.marketId ?? bm.id ?? "");
            const runners: Record<string, unknown>[] = Array.isArray(bm.runners) ? bm.runners as Record<string, unknown>[] : [];
            if (!marketId || runners.length === 0) continue;

            const { data: dbMarket } = await supabase
              .from("markets")
              .select("runners")
              .eq("id", marketId)
              .single();
            if (!dbMarket) continue;

            const updatedRunners = (dbMarket.runners as Record<string, unknown>[]).map((r: Record<string, unknown>) => {
              const live = runners.find(
                (lr: Record<string, unknown>) => String(lr.selectionId) === String(r.id) || String(lr.runnerId) === String(r.id)
              );
              if (!live) return r;
              const ex = (live.ex ?? {}) as Record<string, { price: number; size: number }[]>;
              const bestBack = (ex.availableToBack ?? [])[0];
              const bestLay = (ex.availableToLay ?? [])[0];
              const newBack = bestBack?.price ?? Number((r.backOdds as { price: number; size: number }[])?.[0]?.price ?? 2);
              const newLay = bestLay?.price ?? +(newBack + 0.02).toFixed(2);
              return {
                ...r,
                lastTradedPrice: newBack,
                backOdds: buildLadder(newBack, "back"),
                layOdds: buildLadder(newLay, "lay"),
              };
            });

            await supabase.from("markets").update({ runners: updatedRunners }).eq("id", marketId);
            apiUpdated++;
          }
        }
      } catch (e) {
        console.warn("SportBex listMarketBook failed, using simulation:", e);
      }

      // Fill remaining with drift simulation
      const driftUpdated = await driftOdds(supabase, matchIds);

      return new Response(JSON.stringify({
        success: true,
        mode: "update_odds",
        api_updated: apiUpdated,
        simulated_updated: driftUpdated,
        total_markets: marketIds.length,
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: seed_demo — force-seed demo matches ───────────────────
    if (mode === "seed_demo") {
      const inserted = await seedDemoMatches(supabase);
      return new Response(JSON.stringify({
        success: true,
        mode: "seed_demo",
        inserted,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("live-sync error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
