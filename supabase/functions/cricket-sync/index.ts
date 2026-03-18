import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SportBex Betfair API
const SPORTBEX_BASE = "https://trial-api.sportbex.com/api";
const CRICKET_SPORT_ID = 4; // Betfair sport ID for cricket

// Helper: authenticated fetch to SportBex
async function sbFetch(path: string, apiKey: string, options: RequestInit = {}) {
  const url = `${SPORTBEX_BASE}${path}`;
  console.log(`SportBex GET ${url}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      "sportbex-api-key": apiKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  console.log(`SportBex response [${res.status}]:`, text.slice(0, 500));
  if (!res.ok) throw new Error(`SportBex ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

// Helper: POST to SportBex
async function sbPost(path: string, apiKey: string, body: unknown) {
  const url = `${SPORTBEX_BASE}${path}`;
  console.log(`SportBex POST ${url}`, JSON.stringify(body));
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "sportbex-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`SportBex response [${res.status}]:`, text.slice(0, 500));
  if (!res.ok) throw new Error(`SportBex POST ${path} → ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

// Generate realistic cricket odds
function randomOdds(base: number, spread = 0.3): number {
  return parseFloat((base + (Math.random() - 0.5) * spread).toFixed(2));
}

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

    // Parse request body for mode (default: sync_matches)
    let mode = "sync_matches";
    let targetMarketIds: string[] = [];
    try {
      const body = await req.json();
      mode = body.mode ?? mode;
      targetMarketIds = body.market_ids ?? [];
    } catch {
      // no body or invalid JSON — use defaults
    }

    // ── MODE: update_odds — refresh live market book prices ───────────
    if (mode === "update_odds") {
      if (targetMarketIds.length === 0) {
        // Find all open markets for live matches
        const { data: liveMarkets } = await supabase
          .from("markets")
          .select("id, match_id, runners")
          .eq("in_play", true)
          .eq("status", "open");
        targetMarketIds = (liveMarkets ?? []).map((m: Record<string, unknown>) => m.id as string);
      }

      if (targetMarketIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No live markets to update" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try fetching live market book from SportBex
      try {
        const bookData = await sbPost(`/betfair/listMarketBook/${CRICKET_SPORT_ID}`, apiKey, {
          marketIds: targetMarketIds,
          priceProjection: { priceData: ["EX_BEST_OFFERS"] },
        });

        const markets = Array.isArray(bookData) ? bookData : (bookData.result ?? bookData.data ?? []);
        let updated = 0;

        for (const market of markets) {
          const marketId = market.marketId ?? market.id;
          const runners = Array.isArray(market.runners) ? market.runners : [];

          // Get current market from DB
          const { data: dbMarket } = await supabase
            .from("markets")
            .select("runners")
            .eq("id", marketId)
            .single();

          if (!dbMarket) continue;

          const updatedRunners = (dbMarket.runners as Record<string, unknown>[]).map((r: Record<string, unknown>) => {
            const liveRunner = runners.find(
              (lr: Record<string, unknown>) =>
                String(lr.selectionId) === String(r.id) || String(lr.runnerId) === String(r.id)
            );
            if (!liveRunner) return r;

            const ex = liveRunner.ex ?? {};
            const bestBack = (ex.availableToBack ?? [])[0];
            const bestLay = (ex.availableToLay ?? [])[0];

            return {
              ...r,
              backOdds: bestBack?.price ?? r.backOdds,
              layOdds: bestLay?.price ?? r.layOdds,
              available: bestBack?.size ?? r.available,
            };
          });

          await supabase
            .from("markets")
            .update({ runners: updatedRunners })
            .eq("id", marketId);

          updated++;
        }

        return new Response(
          JSON.stringify({ success: true, mode: "update_odds", updated }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (oddsErr) {
        console.error("Odds update error:", oddsErr);
        // Fall through — simulate odds update
        await simulateOddsUpdate(supabase, targetMarketIds);
        return new Response(
          JSON.stringify({ success: true, mode: "update_odds_simulated", updated: targetMarketIds.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── MODE: sync_matches — fetch competitions & events ──────────────

    // Step 1: Get cricket competitions (leagues)
    const compData = await sbFetch(`/betfair/competitions/${CRICKET_SPORT_ID}`, apiKey);
    console.log("Competitions raw:", JSON.stringify(compData).slice(0, 1000));

    // Normalise competition list
    const competitions: Record<string, unknown>[] = Array.isArray(compData)
      ? compData
      : (compData.result ?? compData.data ?? compData.competitions ?? []);

    console.log(`Total competitions: ${competitions.length}`);

    // Filter for IPL (competition name contains "Indian Premier" or "IPL")
    const iplComp = competitions.find((c: Record<string, unknown>) => {
      const name = String(
        (c.competition as Record<string, unknown>)?.name ??
        c.competitionName ??
        c.name ??
        ""
      ).toLowerCase();
      return name.includes("indian premier") || name.includes("ipl") || name.includes("t20");
    });

    // Collect events from IPL or all cricket competitions
    const eventsToProcess: Record<string, unknown>[] = [];

    if (iplComp) {
      const compId =
        (iplComp.competition as Record<string, unknown>)?.id ??
        iplComp.competitionId ??
        iplComp.id;
      console.log(`IPL competition found: id=${compId}`);

      // Grab events directly from competition object or fetch separately
      const events = Array.isArray(iplComp.events)
        ? iplComp.events
        : Array.isArray((iplComp as Record<string, unknown[]>).matches)
        ? (iplComp as Record<string, unknown[]>).matches
        : [];

      eventsToProcess.push(...events);
    }

    // If no events found directly, try all competitions and take cricket events
    if (eventsToProcess.length === 0) {
      for (const comp of competitions.slice(0, 10)) {
        const events = Array.isArray(comp.events)
          ? (comp.events as Record<string, unknown>[])
          : Array.isArray((comp as Record<string, unknown[]>).matches)
          ? (comp as Record<string, unknown[]>).matches as Record<string, unknown>[]
          : [];
        eventsToProcess.push(...events);
        if (eventsToProcess.length > 30) break;
      }
    }

    console.log(`Events to process: ${eventsToProcess.length}`);

    // If SportBex returns empty events, use the competition list itself to seed matches
    if (eventsToProcess.length === 0) {
      // Try fetching premium data for the first competition as a probe
      const probeComp = iplComp ?? competitions[0];
      const probeEventId =
        (probeComp?.event as Record<string, unknown>)?.id ??
        probeComp?.eventId ??
        probeComp?.id;

      if (probeEventId) {
        try {
          const premData = await sbFetch(
            `/betfair/getPremium/${CRICKET_SPORT_ID}/${probeEventId}`,
            apiKey
          );
          console.log("Premium probe:", JSON.stringify(premData).slice(0, 500));

          const premEvents = Array.isArray(premData)
            ? premData
            : (premData.result ?? premData.data ?? []);
          eventsToProcess.push(...premEvents);
        } catch (e) {
          console.error("Premium probe error:", e);
        }
      }
    }

    if (eventsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          message: "No IPL/cricket events found from SportBex. API may require specific plan. Competitions fetched: " + competitions.length,
          competitions_sample: competitions.slice(0, 3),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upserted: string[] = [];

    for (const event of eventsToProcess) {
      // Normalise event fields (Betfair format varies)
      const eventObj = (event.event ?? event) as Record<string, unknown>;
      const matchId = String(
        eventObj.id ?? event.eventId ?? event.id ?? `evt_${Date.now()}_${Math.random()}`
      );
      const eventName = String(eventObj.name ?? event.eventName ?? event.name ?? "Unknown Match");

      // Parse team names from "Team A v Team B" format
      const parts = eventName.split(/\s+v\s+/i);
      const homeTeam = parts[0]?.trim() ?? "Team A";
      const awayTeam = parts[1]?.trim() ?? "Team B";

      const openDate = eventObj.openDate ?? event.openDate ?? event.startTime;
      const startTime = openDate
        ? new Date(String(openDate)).toISOString()
        : new Date().toISOString();

      const isLive = Boolean(event.inPlay ?? event.is_live ?? false);
      const status: "upcoming" | "live" | "completed" = isLive ? "live" : "upcoming";

      const matchRow = {
        id: matchId,
        series: "IPL 2026",
        home_team: homeTeam,
        away_team: awayTeam,
        venue: String(event.venue ?? eventObj.venue ?? event.countryCode ?? "India"),
        start_time: startTime,
        status,
        score: null,
        sport: "cricket",
      };

      const { error: matchError } = await supabase
        .from("matches")
        .upsert(matchRow, { onConflict: "id" });

      if (matchError) {
        console.error("Match upsert error:", matchId, matchError.message);
        continue;
      }

      // Fetch premium markets for this event
      let premMarkets: Record<string, unknown>[] = [];
      try {
        const premData = await sbFetch(
          `/betfair/getPremium/${CRICKET_SPORT_ID}/${matchId}`,
          apiKey
        );
        premMarkets = Array.isArray(premData)
          ? premData
          : (premData.result ?? premData.data ?? []);
        console.log(`Markets for event ${matchId}: ${premMarkets.length}`);
      } catch (e) {
        console.warn(`No premium markets for event ${matchId}:`, e);
      }

      // Check if markets already created
      const { data: existingMarkets } = await supabase
        .from("markets")
        .select("id")
        .eq("match_id", matchId)
        .limit(1);

      if (!existingMarkets || existingMarkets.length === 0) {
        // ── Create Match Odds market ───────────────────────────────
        // Try to use real runners from SportBex premium data
        const moMarket = premMarkets.find((m: Record<string, unknown>) => {
          const mName = String(m.marketName ?? m.name ?? "").toLowerCase();
          return mName.includes("match odds") || mName.includes("winner");
        });

        let runners: Record<string, unknown>[];

        if (moMarket && Array.isArray(moMarket.runners)) {
          runners = (moMarket.runners as Record<string, unknown>[]).map((r: Record<string, unknown>) => ({
            id: String(r.selectionId ?? r.runnerId ?? r.id),
            name: String(r.runnerName ?? r.name ?? "Runner"),
            backOdds: parseFloat(String(r.lastPriceTraded ?? r.backOdds ?? randomOdds(2.0))),
            layOdds: parseFloat(String(r.layOdds ?? (Number(r.lastPriceTraded ?? 2) + 0.02))),
            available: Number(r.totalMatched ?? 100000),
          }));
        } else {
          runners = [
            {
              id: `runner_${matchId}_home`,
              name: homeTeam,
              backOdds: randomOdds(2.0),
              layOdds: randomOdds(2.05),
              available: 100000,
            },
            {
              id: `runner_${matchId}_away`,
              name: awayTeam,
              backOdds: randomOdds(2.0),
              layOdds: randomOdds(2.05),
              available: 100000,
            },
          ];
        }

        await supabase.from("markets").insert({
          id: `market_mo_${matchId}`,
          match_id: matchId,
          name: "Match Odds",
          type: "match_odds",
          status: "open",
          runners,
          in_play: isLive,
          start_time: startTime,
          min_bet: 100,
          max_bet: 500000,
        });

        // ── Toss Winner ───────────────────────────────────────────
        await supabase.from("markets").insert({
          id: `market_toss_${matchId}`,
          match_id: matchId,
          name: "Toss Winner",
          type: "match_odds",
          status: "open",
          runners: [
            { id: `toss_${matchId}_home`, name: homeTeam, backOdds: 1.9, layOdds: 1.92, available: 50000 },
            { id: `toss_${matchId}_away`, name: awayTeam, backOdds: 1.9, layOdds: 1.92, available: 50000 },
          ],
          in_play: false,
          start_time: startTime,
          min_bet: 100,
          max_bet: 100000,
        });

        // ── Fancy: Total Sixes ────────────────────────────────────
        await supabase.from("markets").insert({
          id: `market_fancy_sixes_${matchId}`,
          match_id: matchId,
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

        // ── Fancy: Total Fours ────────────────────────────────────
        await supabase.from("markets").insert({
          id: `market_fancy_fours_${matchId}`,
          match_id: matchId,
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

        // ── Fancy: First Over Runs ────────────────────────────────
        await supabase.from("markets").insert({
          id: `market_fancy_1stover_${matchId}`,
          match_id: matchId,
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

        // ── Real SportBex fancy markets if available ──────────────
        const fancyMarkets = premMarkets.filter((m: Record<string, unknown>) => {
          const mName = String(m.marketName ?? m.name ?? "").toLowerCase();
          return (
            mName.includes("session") ||
            mName.includes("over") ||
            mName.includes("innings") ||
            mName.includes("runs")
          );
        });

        for (const fm of fancyMarkets.slice(0, 4)) {
          const fmId = String(fm.marketId ?? fm.id ?? `market_sb_${matchId}_${Math.random()}`);
          const fmName = String(fm.marketName ?? fm.name ?? "Fancy Market");
          await supabase.from("markets").upsert({
            id: fmId,
            match_id: matchId,
            name: fmName,
            type: "fancy",
            status: "open",
            runners: [],
            in_play: isLive,
            start_time: startTime,
            min_bet: 100,
            max_bet: 100000,
            fancy_question: fmName,
            fancy_line: Number(fm.line ?? fm.overRate ?? 0),
            fancy_yes_odds: 1.9,
            fancy_no_odds: 1.9,
          }, { onConflict: "id" });
        }

      } else {
        // Update status on existing markets
        await supabase
          .from("markets")
          .update({ in_play: isLive, status: "open" })
          .eq("match_id", matchId);
      }

      upserted.push(matchId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "sync_matches",
        synced: upserted.length,
        total_events: eventsToProcess.length,
        match_ids: upserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Cricket sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simulate odds drift for live markets (fallback)
async function simulateOddsUpdate(
  supabase: ReturnType<typeof createClient>,
  marketIds: string[]
) {
  for (const marketId of marketIds) {
    const { data } = await supabase
      .from("markets")
      .select("runners, type")
      .eq("id", marketId)
      .single();

    if (!data || data.type === "fancy") continue;

    const updatedRunners = (data.runners as Record<string, unknown>[]).map(
      (r: Record<string, unknown>) => {
        const drift = (Math.random() - 0.5) * 0.06;
        const back = Math.max(1.01, Number(r.backOdds) + drift);
        const lay = Math.max(back + 0.01, Number(r.layOdds) + drift);
        return {
          ...r,
          backOdds: parseFloat(back.toFixed(2)),
          layOdds: parseFloat(lay.toFixed(2)),
        };
      }
    );

    await supabase
      .from("markets")
      .update({ runners: updatedRunners })
      .eq("id", marketId);
  }
}
