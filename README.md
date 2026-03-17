# league-data

Node.js web app for browsing League of Legends champion and ability data via the Riot Games API and Data Dragon CDN. Ships a REST API backed by a clean service layer, and a zero-dependency frontend with a searchable champion grid and ability detail panel.

---

## Quick start

```bash
npm install
node server.js
# open http://localhost:3000
```

No API key required. See [Live data](#live-data-riot-api) to enable the optional summoner/ranked section.

---

## What it looks like

- **Champion grid** — all 172 champions rendered as icon cards, searchable by name in real time.
- **Ability detail panel** — click any champion to open a side panel showing the full kit (P/Q/W/E/R) with icons, descriptions, and lore.
- Data is fetched on demand from the local API server, which pulls from Riot's Data Dragon CDN.

---

## Data sources

Two distinct APIs with fundamentally different characteristics:

### Data Dragon (static CDN)

`https://ddragon.leagueoflegends.com` — Riot's versioned static asset CDN. No authentication required. Serves champion rosters, ability definitions, lore, skins, and icon images. Data is tied to the game patch (e.g. `14.8.1`) and changes only on patch days.

Because it's unauthenticated and versioned, responses are safe to cache aggressively — at the application layer or behind a CDN. In production, resolve the version once at startup and pin all subsequent requests to it.

### Riot Games API (live data)

`https://{region}.api.riotgames.com` — Riot's authenticated REST API for player and match data. Requires an `X-Riot-Token` header. Development keys expire after 24 hours with strict rate limits (~20 req/s). Production keys require a registered application.

---

## Project structure

```
league-data/
├── server.js               # Express server — API routes + static file serving
├── public/
│   ├── index.html          # App shell
│   ├── style.css           # Styles (dark theme, CSS grid layout)
│   └── app.js              # Frontend logic (fetch, render, search, panel)
├── src/
│   ├── clients/
│   │   ├── dataDragon.js   # Thin HTTP wrapper for the Data Dragon CDN
│   │   └── riotApi.js      # Factory that produces a configured Riot API client
│   ├── services/
│   │   └── champions.js    # Normalises raw API data into clean, stable shapes
│   └── index.js            # CLI demo (optional, independent of the web server)
├── .env.example
└── package.json
```

---

## Server (`server.js`)

Express serves two things from a single process: the REST API and the static frontend.

### API routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/champions` | Array of all champions (`ChampionSummary[]`) |
| `GET` | `/api/champions/:id` | Full detail for one champion including abilities (`ChampionDetail`) |

`:id` must match the Data Dragon champion id exactly — `Ahri`, `MissFortune`, `AurelionSol`, etc. Casing matters.

The champion list is cached in memory for the lifetime of the server process. It only changes on patch day, so fetching it once at startup is correct behaviour. A failed request propagates through Express error middleware and returns `{ error: "..." }` with a 500 status.

### Static serving

`express.static` serves everything in `public/` at the root path. The frontend is a single HTML file with no build step — no bundler, no framework, no compilation needed.

---

## Frontend (`public/`)

Vanilla JS, CSS, HTML. No dependencies, no build step.

### `index.html`

Minimal shell. Defines the header (title + search input), the champion grid container, the detail panel markup, and the overlay backdrop. Loads `style.css` and `app.js`.

### `style.css`

Dark theme using CSS custom properties (`--bg`, `--gold`, `--surface`, etc.) so the palette is easy to retheme from one place. Layout is CSS grid with `auto-fill` columns — the grid reflows automatically at any viewport width without media queries. The detail panel is a fixed-position side drawer with a dimming overlay.

### `app.js`

All frontend logic in one file, no framework. Key flows:

**Init** — on load, `fetch("/api/champions")` and render the full grid. The array is kept in module scope so search can filter it without re-fetching.

**Search** — `input` event listener filters `allChampions` in memory and re-renders the grid on every keystroke. No debounce needed at this data size.

**Detail panel** — clicking a card calls `fetch("/api/champions/:id")`. While the request is in flight the panel opens immediately with a loading state, then replaces its content once the response arrives. Closing works via the ✕ button, overlay click, or `Escape` key.

**Rendering** — both the grid and panel content are built with template literals and set via `innerHTML`. This is appropriate here since all data originates from our own API (not user input), eliminating XSS risk.

---

## Service layer (`src/services/champions.js`)

The layer route handlers call directly. Owns two responsibilities:

1. **Orchestration** — resolves the current game version once per request, then calls the appropriate Data Dragon endpoints.
2. **Normalisation** — transforms raw Riot shapes into stable objects the frontend can consume without further processing.

Transforms applied:
- HTML tags stripped from ability descriptions (Riot embeds `<br>`, `<li>`, `<span>` etc.)
- Passive mapped to `{ key: "P" }` to unify it with the Q/W/E/R spell convention
- Icon URLs resolved and attached to every entity — consumers never need to know CDN URL patterns

Exported shapes:

```
ChampionSummary   { id, name, title, tags[], iconUrl }
ChampionDetail    { id, name, title, lore, tags[], iconUrl, abilities: AbilitySummary[] }
AbilitySummary    { key, id, name, description, iconUrl }
```

---

## API clients (`src/clients/`)

### `dataDragon.js`

Pure HTTP client — each function maps 1:1 to a Data Dragon endpoint.

| Function | Endpoint |
|---|---|
| `getLatestVersion()` | `/api/versions.json` → `data[0]` |
| `getChampions(version?)` | `/cdn/{v}/data/en_US/champion.json` |
| `getChampionDetail(id, version?)` | `/cdn/{v}/data/en_US/champion/{id}.json` |
| `getChampionIconUrl(id, version)` | URL builder — champion square icon |
| `getSpellIconUrl(spellId, version)` | URL builder — spell icon |

`version` is optional on fetch functions and defaults to the latest patch via `getLatestVersion()`. Pass it explicitly when you've already resolved it to avoid the extra round-trip.

### `riotApi.js`

`createRiotClient({ apiKey, region })` returns a namespaced client. The `axios` instance is pre-configured with `baseURL` and the `X-Riot-Token` header. A response interceptor translates 403 and 429 HTTP errors into readable messages before they propagate.

Namespace structure mirrors Riot's own API groupings (`client.summoner.*`, `client.league.*`), keeping endpoint additions contained and the top-level surface small.

---

## CLI demo (`src/index.js`)

Standalone script that exercises the service layer directly without the web server. Run with `node src/index.js` (or `npm run cli`). Activates the live Riot API section automatically when `RIOT_API_KEY` and `DEMO_SUMMONER_NAME` are set in `.env`.

---

## Environment variables

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `RIOT_API_KEY` | Live data only | API key from developer.riotgames.com (`RGAPI-...`) |
| `RIOT_REGION` | No (default: `na1`) | Regional routing: `na1`, `euw1`, `eun1`, `kr`, `br1`, etc. |
| `DEMO_SUMMONER_NAME` | CLI demo only | Summoner name for the CLI live data section |
| `PORT` | No (default: `3000`) | Port the Express server binds to |

Data Dragon requests work without any environment variables set.

---

## Live data (Riot API)

The server's API routes currently serve only static Data Dragon data. The Riot API client (`src/clients/riotApi.js`) is wired up and ready — adding a live endpoint is a matter of instantiating the client in `server.js` and calling it from a new route.

To get a key: https://developer.riotgames.com — development key is on the dashboard, auto-regenerates every 24 hours.

---

## Extending into a production app

The architecture is already split for extraction:

- **Add a route** — import from `src/services/` in `server.js` and add a handler. The service and client layers don't change.
- **Add a service** — add a file to `src/services/`, compose the existing clients. The server and frontend don't change.
- **Swap the frontend** — delete `public/` and point a React/Vue/Svelte app at the same API routes. Nothing in the backend changes.

Production considerations:
- **Cache the version** — resolve `getLatestVersion()` once at startup and reuse it across all requests rather than calling it per-request.
- **Error boundaries** — `getChampionDetail` throws on an unknown `championId`; add a 404 check before the 500 fallback in error middleware.
- **Rate limiting** — the Riot API enforces hard per-second limits. A request queue (e.g. `bottleneck`) is essential before going to production with live data endpoints.
- **CDN for assets** — Data Dragon icon URLs point to Riot's CDN directly. That's fine for a demo; in production you may want to proxy and cache them to avoid dependency on Riot's uptime for asset delivery.

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server, routing, static file serving |
| `axios` | HTTP client with interceptor support |
| `dotenv` | `.env` file loading for local development |
