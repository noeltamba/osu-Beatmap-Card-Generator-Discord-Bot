const fs = require('fs');
const path = require('path');
const { Beatmap, Performance, GameMode } = require('rosu-pp-js');
const { detectScoreClient } = require('./utils');

// In-memory cache for .osu file text content to avoid re-reading disk
const osuContentCache = new Map();

// Local cache directory for .osu beatmap files
const BEATMAPS_CACHE_DIR = path.join(__dirname, '..', 'data', 'beatmaps');

if (!fs.existsSync(BEATMAPS_CACHE_DIR)) {
  try {
    fs.mkdirSync(BEATMAPS_CACHE_DIR, { recursive: true });
  } catch (_) {}
}

/**
 * Fetch and cache the raw .osu file content for a given beatmap ID.
 * @param {number|string} beatmapId 
 * @returns {Promise<string|null>}
 */
async function getBeatmapOsuContent(beatmapId) {
  if (!beatmapId) return null;
  const id = Number(beatmapId);
  if (isNaN(id) || id <= 0) return null;

  // 1. Check in-memory cache
  if (osuContentCache.has(id)) {
    return osuContentCache.get(id);
  }

  // 2. Check disk cache
  const filePath = path.join(BEATMAPS_CACHE_DIR, `${id}.osu`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content && content.includes('osu file format')) {
        osuContentCache.set(id, content);
        return content;
      }
    } catch (_) {}
  }

  // 3. Download from osu! official public endpoint
  try {
    const res = await fetch(`https://osu.ppy.sh/osu/${id}`, {
      headers: {
        'User-Agent': 'osu-beatmap-card-bot/1.0'
      }
    });

    if (!res.ok) {
      console.warn(`[ppCalculator] Gagal mengunduh .osu untuk ID ${id}: HTTP ${res.status}`);
      return null;
    }

    const content = await res.text();
    if (content && content.includes('osu file format')) {
      try {
        fs.writeFileSync(filePath, content, 'utf-8');
      } catch (_) {}
      osuContentCache.set(id, content);
      return content;
    }
  } catch (err) {
    console.error(`[ppCalculator] Error fetching .osu beatmap ${id}:`, err.message);
  }

  return null;
}

/**
 * Map mode string or ID to rosu-pp GameMode enum
 */
function getRosuMode(mode) {
  if (typeof mode === 'number') {
    switch (mode) {
      case 0: return GameMode.Osu;
      case 1: return GameMode.Taiko;
      case 2: return GameMode.Catch;
      case 3: return GameMode.Mania;
      default: return GameMode.Osu;
    }
  }
  const m = String(mode || '').toLowerCase();
  if (m === 'taiko') return GameMode.Taiko;
  if (m === 'fruits' || m === 'catch' || m === 'ctb') return GameMode.Catch;
  if (m === 'mania') return GameMode.Mania;
  return GameMode.Osu;
}

/**
 * Calculate Performance Points (PP) and difficulty attributes for a score.
 * Works for both ranked and unranked/graveyard/loved beatmaps.
 * 
 * @param {object} score - osu! score object
 * @param {object} [beatmap] - optional beatmap info
 * @returns {Promise<{ pp: number, stars: number, isUnranked: boolean }|null>}
 */
async function calculateScorePp(score, beatmap = null) {
  if (!score) return null;
  const bm = score.beatmap || beatmap || {};
  const beatmapId = bm.id || score.beatmap_id;
  if (!beatmapId) return null;

  const mapStatus = String(bm.status || score.beatmap?.status || '').toLowerCase();
  const isRanked = mapStatus === 'ranked' || mapStatus === 'approved';

  // If score already has official pp from API on a ranked map, return it directly
  if (isRanked && score.pp != null && Number(score.pp) > 0) {
    return {
      pp: Number(score.pp),
      stars: bm.difficulty_rating || 0,
      isUnranked: false
    };
  }

  const osuContent = await getBeatmapOsuContent(beatmapId);
  if (!osuContent) return null;

  let map;
  try {
    map = new Beatmap(osuContent);
    const targetMode = getRosuMode(score.mode || score.ruleset_id || bm.mode);
    if (targetMode !== GameMode.Osu) {
      map.convert(targetMode);
    }

    const stats = score.statistics || {};
    const mode = score.mode || bm.mode || 'osu';

    const n300 = stats.great ?? stats.count_300 ?? (mode === 'mania' ? stats.perfect ?? 0 : 0);
    const n100 = stats.ok ?? stats.count_100 ?? (mode === 'fruits' ? stats.large_tick_hit ?? 0 : 0);
    const n50 = stats.meh ?? stats.count_50 ?? (mode === 'fruits' ? stats.small_tick_hit ?? 0 : 0);
    const misses = stats.miss ?? stats.count_miss ?? 0;
    const nGeki = stats.perfect ?? stats.count_geki ?? 0;
    const nKatu = stats.good ?? stats.count_katu ?? 0;

    const modsInput = score.mods || [];
    const cleanMods = Array.isArray(modsInput)
      ? modsInput.map(m => typeof m === 'string' ? m.toUpperCase() : (m.acronym || '').toUpperCase()).filter(Boolean)
      : [];

    // Check for custom clockRate or speed_change in Lazer mod settings
    let customClockRate = null;
    if (Array.isArray(modsInput)) {
      for (const m of modsInput) {
        if (typeof m === 'object' && m?.settings?.speed_change != null) {
          customClockRate = Number(m.settings.speed_change);
          break;
        }
      }
    }

    const isLazer = detectScoreClient(score) === 'lazer';

    const perfOptions = {
      mods: cleanMods,
      combo: score.max_combo || 0,
      accuracy: (score.accuracy != null ? Number(score.accuracy) : 1) * 100,
      misses: misses,
      n300: n300,
      n100: n100,
      n50: n50,
      nGeki: nGeki,
      nKatu: nKatu,
      lazer: isLazer
    };

    if (customClockRate != null && !isNaN(customClockRate)) {
      perfOptions.clockRate = customClockRate;
    }

    if (stats.slider_tail_hit != null) perfOptions.sliderEndHits = stats.slider_tail_hit;
    if (stats.large_tick_hit != null) perfOptions.largeTickHits = stats.large_tick_hit;
    if (stats.small_tick_hit != null) perfOptions.smallTickHits = stats.small_tick_hit;

    if (score.rank === 'F') {
      perfOptions.passedObjects = (n300 + n100 + n50 + misses) || 1;
    }

    const perf = new Performance(perfOptions).calculate(map);
    const calculatedPp = perf.pp;
    const stars = perf.difficulty?.stars || bm.difficulty_rating || 0;

    return {
      pp: calculatedPp,
      stars: stars,
      isUnranked: !isRanked
    };
  } catch (err) {
    console.error(`[ppCalculator] Gagal menghitung PP untuk beatmap ${beatmapId}:`, err.message);
    return null;
  } finally {
    if (map) {
      try { map.free(); } catch (_) {}
    }
  }
}

module.exports = {
  getBeatmapOsuContent,
  calculateScorePp
};
