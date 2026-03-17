# league-data

Minimal Node.js demo for accessing League of Legends game data via the Riot Games API and Data Dragon CDN. Structured for straightforward extraction into a fullstack web app.

---

## Quick start

```bash
npm install
node src/index.js
```

No API key required for champion and ability data. See [Live data](#live-data-riot-api) for summoner/ranked features.

---

## Data sources

There are two distinct APIs in play with fundamentally different characteristics:

### Data Dragon (static CDN)

`https://ddragon.leagueoflegends.com` — Riot's versioned static asset CDN. No authentication. Serves champion rosters, ability definitions, lore, skins, and icon images. Data is versioned to the game patch (e.g. `14.8.1`) and changes only on patch days.

Because it's unauthenticated and versioned, Data Dragon responses are safe to cache aggressively — at the application layer or behind a CDN. In a production app you'd fetch the version once per deploy or daily, then pin all asset requests to that version.

### Riot Games API (live data)

`https://{region}.api.riotgames.com` — Riot's authenticated REST API for player and match data. Requires an `X-Riot-Token` header. Development keys expire after 24 hours and have strict rate limits (~20 req/s). Production keys require a registered application with Riot.

---

## Project structure

```
src/
├── clients/
│   ├── dataDragon.js   # Thin HTTP wrapper for the Data Dragon CDN
│   └── riotApi.js      # Factory that produces a configured Riot API client
├── services/
│   └── champions.js    # Business logic: normalises raw API data into clean shapes
└── index.js            # Demo runner
```

### `src/clients/dataDragon.js`

Pure HTTP client. Each function maps 1:1 to a Data Dragon endpoint:

| Function | Endpoint | Notes |
|---|---|---|
| `getLatestVersion()` | `/api/versions.json` | Returns `data[0]`, the current patch |
| `getChampions(version?)` | `/cdn/{v}/data/en_US/champion.json` | Summary map of all champions |
| `getChampionDetail(id, version?)` | `/cdn/{v}/data/en_US/champion/{id}.json` | Full data for one champion including spells, passive, lore, skins |
| `getChampionIconUrl(id, version)` | (URL builder) | Returns CDN URL for champion square icon |
| `getSpellIconUrl(spellId, version)` | (URL builder) | Returns CDN URL for spell icon |

`version` is optional on fetch functions — they call `getLatestVersion()` automatically if omitted. In a web app you'd resolve the version once at startup and pass it explicitly to avoid the extra round-trip on every request.

### `src/clients/riotApi.js`

Factory function `createRiotClient({ apiKey, region })` returns a namespaced client object. The underlying `axios` instance is pre-configured with `baseURL` and `X-Riot-Token`. A response interceptor normalises 403 and 429 errors into readable messages before they propagate.

The namespaced structure (`client.summoner.getBySummonerName`, `client.league.getEntriesBySummonerId`) mirrors Riot's own API groupings and makes it easy to add endpoints without a flat function namespace explosion.

### `src/services/champions.js`

The layer your route handlers should call. It owns two responsibilities:

1. **Orchestration** — calls the right client functions in the right order and resolves the version once per request.
2. **Normalisation** — transforms raw Data Dragon shapes into stable, frontend-ready objects.

Specific transforms applied:
- HTML tags stripped from ability descriptions (Riot embeds `<br>`, `<li>`, etc.)
- Passive mapped to `{ key: "P" }` to match the Q/W/E/R spell convention
- Icon URLs resolved and attached to every entity so consumers don't need to know CDN URL patterns

Exported types:

```
ChampionSummary     { id, name, title, tags, iconUrl }
ChampionDetail      { id, name, title, lore, tags, iconUrl, abilities: AbilitySummary[] }
AbilitySummary      { key, id, name, description, iconUrl }
```

### `src/index.js`

Demo script only — not part of the library surface. Exercises the three major flows: champion list, single champion detail, and (optionally) live summoner data. In a web app, delete this file and import from `services/` directly in your route handlers.

---

## Environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `RIOT_API_KEY` | For live data only | API key from developer.riotgames.com (`RGAPI-...`) |
| `RIOT_REGION` | No (defaults `na1`) | Regional routing: `na1`, `euw1`, `eun1`, `kr`, `br1`, etc. |
| `DEMO_SUMMONER_NAME` | For live demo only | Summoner name to look up in the demo script |

Data Dragon requests work without any environment variables.

---

## Live data (Riot API)

The demo activates the live data section only when `RIOT_API_KEY` is set and starts with `RGAPI-`. It fetches a summoner profile by name and their ranked queue entries.

To get a key: https://developer.riotgames.com — log in, the development key is on the dashboard. It auto-regenerates every 24 hours.

---

## Integrating into a web app

The service layer is already decoupled from the demo runner. A minimal Express example:

```js
const express = require("express");
const { listChampions, getChampionWithAbilities } = require("./src/services/champions");

const app = express();

app.get("/champions", async (req, res) => {
  const champions = await listChampions();
  res.json(champions);
});

app.get("/champions/:id", async (req, res) => {
  const champion = await getChampionWithAbilities(req.params.id);
  res.json(champion);
});
```

For production, consider:
- **Caching** `getLatestVersion()` and the champion list at app startup — they change only on patch day.
- **Error handling middleware** — `getChampionDetail` will throw on an unknown `championId`; surface that as a 404.
- **Rate limiting** — Data Dragon is generous, but the Riot API enforces hard limits. A queue (e.g. `bottleneck`) prevents 429s under load.

---

## Dependencies

| Package | Purpose |
|---|---|
| `axios` | HTTP client with interceptor support |
| `dotenv` | `.env` file loading for local development |
