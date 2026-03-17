/**
 * Champion service — higher-level helpers built on top of the Data Dragon client.
 * These functions return clean, normalised objects ready to be served from an API route
 * or stored in a database.
 */

const dd = require("../clients/dataDragon");

/**
 * @typedef {object} AbilitySummary
 * @property {string} key    - "P" | "Q" | "W" | "E" | "R"
 * @property {string} id     - Spell id (e.g. "AhriOrbofDeception")
 * @property {string} name   - Display name
 * @property {string} description - Plain-text description
 * @property {string} iconUrl
 */

/**
 * @typedef {object} ChampionSummary
 * @property {string}   id
 * @property {string}   name
 * @property {string}   title
 * @property {string[]} tags    - e.g. ["Mage", "Assassin"]
 * @property {string}   iconUrl
 */

/**
 * @typedef {object} ChampionDetail
 * @property {string}          id
 * @property {string}          name
 * @property {string}          title
 * @property {string}          lore
 * @property {string[]}        tags
 * @property {string}          iconUrl
 * @property {AbilitySummary[]} abilities
 */

/**
 * Returns a flat array of all champions with icon URLs attached.
 * Suitable for rendering a champion roster/grid.
 *
 * @returns {Promise<ChampionSummary[]>}
 */
async function listChampions() {
  const version = await dd.getLatestVersion();
  const raw = await dd.getChampions(version);

  return Object.values(raw).map((c) => ({
    id: c.id,
    name: c.name,
    title: c.title,
    tags: c.tags,
    iconUrl: dd.getChampionIconUrl(c.id, version),
  }));
}

/**
 * Returns full detail for one champion including all five abilities.
 *
 * @param {string} championId - Data Dragon champion id (e.g. "Ahri", "MissFortune")
 * @returns {Promise<ChampionDetail>}
 */
async function getChampionWithAbilities(championId) {
  const version = await dd.getLatestVersion();
  const raw = await dd.getChampionDetail(championId, version);

  const passive = {
    key: "P",
    id: raw.passive.image.full.replace(".png", ""),
    name: raw.passive.name,
    description: stripHtml(raw.passive.description),
    iconUrl: `https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${raw.passive.image.full}`,
  };

  const spells = raw.spells.map((spell, i) => ({
    key: ["Q", "W", "E", "R"][i],
    id: spell.id,
    name: spell.name,
    description: stripHtml(spell.description),
    iconUrl: dd.getSpellIconUrl(spell.image.full.replace(".png", ""), version),
  }));

  return {
    id: raw.id,
    name: raw.name,
    title: raw.title,
    lore: raw.lore,
    tags: raw.tags,
    iconUrl: dd.getChampionIconUrl(raw.id, version),
    abilities: [passive, ...spells],
  };
}

/** Strips basic HTML tags Riot includes in description strings. */
function stripHtml(str) {
  return str.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

module.exports = { listChampions, getChampionWithAbilities };
