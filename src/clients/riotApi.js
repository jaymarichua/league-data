/**
 * Riot Games API client — requires an API key from https://developer.riotgames.com
 * Used for live/account data (summoner profiles, match history, ranked stats, etc.)
 * Static game content (champions, spells) lives in Data Dragon instead.
 *
 * Docs: https://developer.riotgames.com/apis
 */

const axios = require("axios");

/**
 * Creates a pre-configured Riot API client for a given region.
 *
 * @param {object} options
 * @param {string} options.apiKey  - Riot API key (RGAPI-...)
 * @param {string} [options.region="na1"] - Regional routing value (na1, euw1, kr, etc.)
 * @returns {object} Client with method per endpoint group
 */
function createRiotClient({ apiKey, region = "na1" }) {
  if (!apiKey) throw new Error("RIOT_API_KEY is required");

  const http = axios.create({
    baseURL: `https://${region}.api.riotgames.com`,
    headers: { "X-Riot-Token": apiKey },
  });

  // Attach the region to error messages for easier debugging
  http.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err.response?.status;
      const msg =
        status === 403
          ? "Forbidden — check your API key and its permissions"
          : status === 429
          ? "Rate limited — slow down requests"
          : err.message;
      return Promise.reject(new Error(`[RiotAPI ${region}] ${msg}`));
    }
  );

  return {
    summoner: {
      /**
       * Fetch summoner profile by encrypted summoner name.
       * @param {string} summonerName
       * @returns {Promise<object>}
       */
      getBySummonerName(summonerName) {
        return http
          .get(`/lol/summoner/v4/summoners/by-name/${encodeURIComponent(summonerName)}`)
          .then((r) => r.data);
      },
    },

    league: {
      /**
       * Fetch ranked queue entries for a summoner.
       * @param {string} encryptedSummonerId
       * @returns {Promise<object[]>}
       */
      getEntriesBySummonerId(encryptedSummonerId) {
        return http
          .get(`/lol/league/v4/entries/by-summoner/${encryptedSummonerId}`)
          .then((r) => r.data);
      },
    },
  };
}

module.exports = { createRiotClient };
