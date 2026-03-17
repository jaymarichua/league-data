/**
 * Demo entry point.
 * Run: node src/index.js
 *
 * For web-app integration, import the service/client modules directly
 * into your Express/Fastify route handlers instead of running this file.
 */

require("dotenv").config();

const { listChampions, getChampionWithAbilities } = require("./services/champions");
const { createRiotClient } = require("./clients/riotApi");

async function main() {
  // ── 1. Champion roster (Data Dragon — no API key needed) ──────────────────
  console.log("Fetching champion list...");
  const champions = await listChampions();
  console.log(`Found ${champions.length} champions\n`);

  // Print first 5 as a sample
  champions.slice(0, 5).forEach((c) => {
    console.log(`  ${c.name.padEnd(16)} [${c.tags.join(", ")}]`);
  });
  console.log("  ...\n");

  // ── 2. Single champion with abilities ─────────────────────────────────────
  const DEMO_CHAMPION = "Ahri";
  console.log(`Fetching abilities for ${DEMO_CHAMPION}...`);
  const detail = await getChampionWithAbilities(DEMO_CHAMPION);

  console.log(`\n${detail.name} — ${detail.title}`);
  console.log(`Tags: ${detail.tags.join(", ")}\n`);
  console.log("Abilities:");
  detail.abilities.forEach((a) => {
    console.log(`  [${a.key}] ${a.name}`);
    console.log(`      ${a.description.slice(0, 100)}...`);
  });

  // ── 3. Live data via Riot API (optional — requires API key in .env) ───────
  const apiKey = process.env.RIOT_API_KEY;
  const summonerName = process.env.DEMO_SUMMONER_NAME;

  if (apiKey && apiKey.startsWith("RGAPI-") && summonerName) {
    console.log(`\nFetching live data for summoner: ${summonerName}`);
    const riot = createRiotClient({ apiKey, region: process.env.RIOT_REGION });

    const summoner = await riot.summoner.getBySummonerName(summonerName);
    console.log(`  Summoner: ${summoner.name} (level ${summoner.summonerLevel})`);

    const entries = await riot.league.getEntriesBySummonerId(summoner.id);
    if (entries.length === 0) {
      console.log("  No ranked data found.");
    } else {
      entries.forEach((e) => {
        console.log(`  ${e.queueType}: ${e.tier} ${e.rank} — ${e.leaguePoints} LP`);
      });
    }
  } else {
    console.log("\n(Skipping live Riot API demo — set RIOT_API_KEY and DEMO_SUMMONER_NAME in .env)");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
