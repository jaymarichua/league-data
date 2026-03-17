/**
 * Data Dragon client — Riot's static CDN for game assets (no API key required).
 * Docs: https://developer.riotgames.com/docs/lol#data-dragon
 */

const axios = require("axios");

const BASE_URL = "https://ddragon.leagueoflegends.com";

/**
 * Returns the latest game version string (e.g. "14.8.1").
 * @returns {Promise<string>}
 */
async function getLatestVersion() {
  const { data } = await axios.get(`${BASE_URL}/api/versions.json`);
  return data[0];
}

/**
 * Returns a summary map of all champions keyed by champion id.
 * Each entry includes: id, name, title, blurb, tags, stats.
 *
 * @param {string} [version] - Game version (defaults to latest)
 * @returns {Promise<Record<string, object>>}
 */
async function getChampions(version) {
  const v = version ?? (await getLatestVersion());
  const { data } = await axios.get(
    `${BASE_URL}/cdn/${v}/data/en_US/champion.json`
  );
  return data.data; // { Aatrox: {...}, Ahri: {...}, ... }
}

/**
 * Returns full detail for a single champion including spells (abilities),
 * passive, lore, skins, and recommended items.
 *
 * @param {string} championId - Exact Data Dragon id (e.g. "Ahri", "MissFortune")
 * @param {string} [version]  - Game version (defaults to latest)
 * @returns {Promise<object>}
 */
async function getChampionDetail(championId, version) {
  const v = version ?? (await getLatestVersion());
  const { data } = await axios.get(
    `${BASE_URL}/cdn/${v}/data/en_US/champion/${championId}.json`
  );
  return data.data[championId];
}

/**
 * Returns the CDN URL for a champion's square icon.
 *
 * @param {string} championId
 * @param {string} version
 * @returns {string}
 */
function getChampionIconUrl(championId, version) {
  return `${BASE_URL}/cdn/${version}/img/champion/${championId}.png`;
}

/**
 * Returns the CDN URL for a spell icon.
 *
 * @param {string} spellId  - e.g. "AhriOrbofDeception"
 * @param {string} version
 * @returns {string}
 */
function getSpellIconUrl(spellId, version) {
  return `${BASE_URL}/cdn/${version}/img/spell/${spellId}.png`;
}

module.exports = {
  getLatestVersion,
  getChampions,
  getChampionDetail,
  getChampionIconUrl,
  getSpellIconUrl,
};
