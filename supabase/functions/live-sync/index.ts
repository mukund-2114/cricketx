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

// ── Demo IPL matches for when API returns no data ─────────────────────
const DEMO_MATCHES = [
  { id: "demo_ipl_1", home: "Mumbai Indians", away: "Chennai Super Kings", venue: "Wankhede Stadium", hoursOffset: 2 },
  { id: "demo_ipl_2", home: "Royal Challengers Bangalore", away: "Kolkata Knight Riders", venue: "M. Chinnaswamy Stadium", hoursOffset: 6 },
  { id: "demo_ipl_3", home: "Rajasthan Royals", away: "Delhi Capitals", venue: "Sawai Mansingh Stadium", hoursOffset: 48 },
  { id: "demo_ipl_4", home: "Punjab Kings", away: "Sunrisers Hyderabad", venue: "PCA Stadium", hoursOffset: 72 },
  { id: "demo_ipl_5", home: "Gujarat Titans", away: "Lucknow Super Giants", venue: "Narendra Modi Stadium", hoursOffset: 96 },
];

async function seedDemoMatches(supabase: ReturnType<typeof createClient>) {
  console.log("Seeding demo IPL matches...");
  const now = new Date();
  let inserted = 0;

  for (const dm of DEMO_MATCHES) {
    const startTime = new Date(now.getTime() + dm.hoursOffset * 3600 * 1000).toISOString();
    const isLive = dm.hoursOffset <= 0;

    const { error: mErr } = await supabase.from("matches").upsert({
      id: dm.id,
      series: "IPL 2026",
      home_team: dm.home,
      away_team: dm.away,
      venue: dm.venue,
      start_time: startTime,
      status: isLive ? "live" : "upcoming",
      sport: "cricket",
    }, { onConflict: "id", ignoreDuplicates: true });

    if (mErr) { console.error("Demo match upsert error:", mErr.message); continue; }

    // Check if markets already exist
    const { data: existing } = await supabase
      .from("markets")
      .select("id")
      .eq("match_id", dm.id)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const homeBack = rnd(1.95);
    const awayBack = rnd(2.0);

    // Match Odds market
    await supabase.from("markets").insert({
      id: `market_mo_${dm.id}`,
      match_id: dm.id,
      name: "Match Odds",
      type: "match_odds",
      status: "open",
      runners: [
        {
          id: `runner_${dm.id}_home`,
          name: dm.home,
          lastTradedPrice: homeBack,
          status: "active",
          sort: 1,
          backOdds: buildLadder(homeBack, "back"),
          layOdds: buildLadder(+(homeBack + 0.02).toFixed(2), "lay"),
        },
        {
          id: `runner_${dm.id}_away`,
          name: dm.away,
          lastTradedPrice: awayBack,
          status: "active",
          sort: 2,
          backOdds: buildLadder(awayBack, "back"),
          layOdds: buildLadder(+(awayBack + 0.02).toFixed(2), "lay"),
        },
      ],
      in_play: isLive,
      start_time: startTime,
      min_bet: 100,
      max_bet: 500000,
    });

    // Toss Winner
    await supabase.from("markets").insert({
      id: `market_toss_${dm.id}`,
      match_id: dm.id,
      name: "Toss Winner",
      type: "match_odds",
      status: "open",
      runners: [
        { id: `toss_${dm.id}_home`, name: dm.home, lastTradedPrice: 1.9, status: "active", sort: 1, backOdds: buildLadder(1.9, "back"), layOdds: buildLadder(1.92, "lay") },
        { id: `toss_${dm.id}_away`, name: dm.away, lastTradedPrice: 1.9, status: "active", sort: 2, backOdds: buildLadder(1.9, "back"), layOdds: buildLadder(1.92, "lay") },
      ],
      in_play: false,
      start_time: startTime,
      min_bet: 100,
      max_bet: 100000,
    });

    // Fancy: Total Sixes
    await supabase.from("markets").insert({
      id: `market_sixes_${dm.id}`,
      match_id: dm.id,
      name: "Total Sixes",
      type: "fancy",
      status: "open",
      runners: [],
      in_play: isLive,
      start_time: startTime,
      min_bet: 100,
      max_bet: 100000,
      fancy_question: "Total sixes in the match?",
      fancy_line: 14.5,
      fancy_yes_odds: 1.9,
      fancy_no_odds: 1.9,
    });

    // Fancy: Total Fours
    await supabase.from("markets").insert({
      id: `market_fours_${dm.id}`,
      match_id: dm.id,
      name: "Total Fours",
      type: "fancy",
      status: "open",
      runners: [],
      in_play: isLive,
      start_time: startTime,
      min_bet: 100,
      max_bet: 100000,
      fancy_question: "Total fours in the match?",
      fancy_line: 28.5,
      fancy_yes_odds: 1.9,
      fancy_no_odds: 1.9,
    });

    // Fancy: 1st Over Runs
    await supabase.from("markets").insert({
      id: `market_1over_${dm.id}`,
      match_id: dm.id,
      name: "1st Over Runs",
      type: "fancy",
      status: "open",
      runners: [],
      in_play: isLive,
      start_time: startTime,
      min_bet: 100,
      max_bet: 50000,
      fancy_question: "Runs scored in 1st over?",
      fancy_line: 7.5,
      fancy_yes_odds: 1.85,
      fancy_no_odds: 1.85,
    });

    // Fancy: Powerplay Runs
    await supabase.from("markets").insert({
      id: `market_pp_${dm.id}`,
      match_id: dm.id,
      name: "Powerplay Runs (1-6 Overs)",
      type: "fancy",
      status: "open",
      runners: [],
      in_play: isLive,
      start_time: startTime,
      min_bet: 100,
      max_bet: 100000,
      fancy_question: "Total runs in powerplay (overs 1-6)?",
      fancy_line: 52.5,
      fancy_yes_odds: 1.88,
      fancy_no_odds: 1.88,
    });

    inserted++;
  }

  return inserted;
}

// ── Drift simulation for match_odds markets ───────────────────────────
async function driftOdds(supabase: ReturnType<typeof createClient>, matchIds: string[]) {
  let updated = 0;
  for (const matchId of matchIds) {
    const { data: markets } = await supabase
      .from("markets")
      .select("id, runners, type, fancy_yes_odds, fancy_no_odds, fancy_line")
      .eq("match_id", matchId)
      .eq("status", "open");

    if (!markets) continue;

    for (const market of markets) {
      if (market.type === "match_odds" && Array.isArray(market.runners) && market.runners.length > 0) {
        const updatedRunners = market.runners.map((r: Record<string, unknown>) => {
          const drift = (Math.random() - 0.5) * 0.06;
          const oldBack = Number((r.backOdds as { price: number; size: number }[])?.[0]?.price ?? r.lastTradedPrice ?? 2);
          const newBack = Math.max(1.01, +(oldBack + drift).toFixed(2));
          const newLay = Math.max(+(newBack + 0.01).toFixed(2), +(newBack + (Math.random() * 0.03 + 0.01)).toFixed(2));

          return {
            ...r,
            lastTradedPrice: newBack,
            backOdds: buildLadder(newBack, "back"),
            layOdds: buildLadder(newLay, "lay"),
          };
        });

        await supabase.from("markets").update({ runners: updatedRunners }).eq("id", market.id);
        updated++;
      } else if (market.type === "fancy") {
        // Drift fancy line and odds slightly
        const lineDrift = (Math.random() - 0.5) * 0.5;
        const newLine = Math.max(0, +(Number(market.fancy_line ?? 0) + lineDrift).toFixed(1));
        await supabase.from("markets").update({
          fancy_line: newLine,
          fancy_yes_odds: rnd(1.88, 0.04),
          fancy_no_odds: rnd(1.88, 0.04),
        }).eq("id", market.id);
        updated++;
      }
    }
  }
  return updated;
}

// ── Main handler ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("SPORTBEX_API_KEY");
    if (!apiKey) throw new Error("SPORTBEX_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* no body */ }

    const mode = String(body.mode ?? "update_odds");
    console.log("live-sync mode:", mode);

    // ── MODE: full_sync — pull events + update odds ─────────────────
    if (mode === "full_sync" || mode === "sync_matches") {
      let syncedFromApi = 0;

      try {
        // Fetch cricket competitions from SportBex
        const compData = await sbFetch(`/betfair/competitions/${CRICKET_SPORT_ID}`, apiKey);
        const competitions: Record<string, unknown>[] = Array.isArray(compData)
          ? compData
          : (compData.result ?? compData.data ?? compData.competitions ?? []);

        console.log("Competitions found:", competitions.length);

        const events: Record<string, unknown>[] = [];
        for (const comp of competitions.slice(0, 15)) {
          const compEvents: Record<string, unknown>[] = Array.isArray(comp.events)
            ? comp.events as Record<string, unknown>[]
            : Array.isArray((comp as Record<string, unknown[]>).matches)
            ? (comp as Record<string, unknown[]>).matches as Record<string, unknown>[]
            : [];
          events.push(...compEvents);
          if (events.length > 50) break;
        }

        // If no events, try fetching premium for first competition event
        if (events.length === 0 && competitions.length > 0) {
          const first = competitions[0];
          const eventId = (first.event as Record<string, unknown>)?.id ?? first.eventId ?? first.id;
          if (eventId) {
            try {
              const prem = await sbFetch(`/betfair/getPremium/${CRICKET_SPORT_ID}/${eventId}`, apiKey);
              const premEvents = Array.isArray(prem) ? prem : (prem.result ?? prem.data ?? []);
              events.push(...premEvents);
            } catch (e) { console.warn("Premium fetch error:", e); }
          }
        }

        if (events.length > 0) {
          for (const event of events.slice(0, 20)) {
            const ev = (event.event ?? event) as Record<string, unknown>;
            const matchId = String(ev.id ?? event.eventId ?? `evt_${Date.now()}`);
            const name = String(ev.name ?? event.eventName ?? "Cricket Match");
            const parts = name.split(/\s+v\s+/i);
            const homeTeam = parts[0]?.trim() ?? "Team A";
            const awayTeam = parts[1]?.trim() ?? "Team B";
            const openDate = ev.openDate ?? event.openDate ?? event.startTime;
            const startTime = openDate ? new Date(String(openDate)).toISOString() : new Date().toISOString();
            const isLive = Boolean(event.inPlay ?? event.is_live ?? false);

            await supabase.from("matches").upsert({
              id: matchId,
              series: "IPL 2026",
              home_team: homeTeam,
              away_team: awayTeam,
              venue: String(ev.venue ?? event.countryCode ?? "India"),
              start_time: startTime,
              status: isLive ? "live" : "upcoming",
              sport: "cricket",
            }, { onConflict: "id" });

            syncedFromApi++;
          }
        }
      } catch (apiErr) {
        console.error("SportBex API error during full_sync:", apiErr);
        // Fall through to demo seeding
      }

      // Check if we have any matches at all; if not, seed demo data
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("id")
        .limit(1);

      let demoSeeded = 0;
      if (!existingMatches || existingMatches.length === 0) {
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
        // No markets exist — seed demo matches
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

      // Try live market book from SportBex
      let apiUpdated = 0;
      try {
        const bookData = await sbPost(`/betfair/listMarketBook/${CRICKET_SPORT_ID}`, apiKey, {
          marketIds,
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
