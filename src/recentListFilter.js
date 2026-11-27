const {
  parseMods,
  calculateModdedStats,
  isFullCombo
} = require('./utils');

const MODE_ALIASES = {
  osu: 'osu',
  std: 'osu',
  standard: 'osu',
  '0': 'osu',
  taiko: 'taiko',
  tko: 'taiko',
  '1': 'taiko',
  fruits: 'fruits',
  catch: 'fruits',
  ctb: 'fruits',
  '2': 'fruits',
  mania: 'mania',
  mna: 'mania',
  '3': 'mania'
};

const GRADE_ORDER = {
  SS: 7,
  X: 7,
  XH: 7,
  SSH: 7,
  S: 6,
  SH: 6,
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1
};

function parseBool(val) {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return null;
}

/**
 * Parse prefix arguments for `;rl` into structured options + player username.
 * Supports:
 * - pass=true|false
 * - fail=true|false
 * - fc=true|false
 * - choke=true|false
 * - ranked=true|false
 * - status=ranked|loved|qualified|graveyard|pending
 * - mods=HDDT / mods=NM / +HDDT
 * - exact_mods=true (when mods=...!)
 * - grade=S / min_grade=A
 * - sort=pp|acc|combo|sr|score|miss|recent
 * - mode=osu|taiko|catch|mania
 * - count=1..15 or standalone number 1..15
 */
function parseRecentListArgs(args = []) {
  const opts = {
    player: null,
    count: 15,
    pass: null,
    fail: null,
    fc: null,
    choke: null,
    ranked: null,
    status: null,
    mods: null,
    modsExact: false,
    grade: null,
    minGrade: null,
    sort: 'recent',
    mode: null
  };

  const playerTokens = [];

  for (const rawToken of args) {
    const token = rawToken.trim();
    if (!token) continue;

    // 1. +MODS shorthand (e.g. +HDDT, +NM)
    if (token.startsWith('+') && token.length >= 3) {
      const modStr = token.slice(1).toUpperCase();
      const isExact = modStr.endsWith('!');
      const cleaned = isExact ? modStr.slice(0, -1) : modStr;
      if (cleaned === 'NM' || cleaned === 'NOMOD') {
        opts.mods = ['NM'];
        opts.modsExact = true;
        continue;
      }
      const parsed = parseMods(cleaned);
      if (parsed.length > 0) {
        opts.mods = parsed;
        opts.modsExact = isExact;
        continue;
      }
    }

    // 2. key=value pairs
    const eqIdx = token.indexOf('=');
    if (eqIdx > 0) {
      const key = token.slice(0, eqIdx).trim().toLowerCase();
      const val = token.slice(eqIdx + 1).trim();
      const valLower = val.toLowerCase();

      if (key === 'pass' || key === 'passed') {
        const b = parseBool(val);
        if (b !== null) opts.pass = b;
        continue;
      }
      if (key === 'fail' || key === 'failed') {
        const b = parseBool(val);
        if (b !== null) opts.fail = b;
        continue;
      }
      if (key === 'fc' || key === 'perfect') {
        const b = parseBool(val);
        if (b !== null) opts.fc = b;
        continue;
      }
      if (key === 'choke') {
        const b = parseBool(val);
        if (b !== null) opts.choke = b;
        continue;
      }
      if (key === 'ranked') {
        const b = parseBool(val);
        if (b !== null) opts.ranked = b;
        continue;
      }
      if (key === 'status') {
        if (['ranked', 'approved', 'loved', 'qualified', 'pending', 'wip', 'graveyard', 'unranked'].includes(valLower)) {
          opts.status = valLower;
        }
        continue;
      }
      if (key === 'mods' || key === 'mod') {
        const upper = val.toUpperCase();
        const isExact = upper.endsWith('!');
        const cleaned = isExact ? upper.slice(0, -1) : upper;
        if (cleaned === 'NM' || cleaned === 'NOMOD' || cleaned === 'NONE') {
          opts.mods = ['NM'];
          opts.modsExact = true;
        } else {
          const parsed = parseMods(cleaned);
          if (parsed.length > 0) {
            opts.mods = parsed;
            opts.modsExact = isExact;
          }
        }
        continue;
      }
      if (key === 'grade' || key === 'rank') {
        const g = val.toUpperCase();
        if (GRADE_ORDER[g]) {
          opts.grade = g;
        }
        continue;
      }
      if (key === 'min_grade' || key === 'mingrade') {
        const g = val.toUpperCase();
        if (GRADE_ORDER[g]) {
          opts.minGrade = g;
        }
        continue;
      }
      if (key === 'sort' || key === 'order') {
        const sortAliases = {
          pp: 'pp',
          acc: 'acc',
          accuracy: 'acc',
          combo: 'combo',
          sr: 'sr',
          star: 'sr',
          stars: 'sr',
          score: 'score',
          miss: 'miss',
          misses: 'miss',
          recent: 'recent',
          time: 'recent',
          date: 'recent'
        };
        if (sortAliases[valLower]) {
          opts.sort = sortAliases[valLower];
        }
        continue;
      }
      if (key === 'mode' || key === 'ruleset') {
        if (MODE_ALIASES[valLower]) {
          opts.mode = MODE_ALIASES[valLower];
        }
        continue;
      }
      if (key === 'count' || key === 'limit' || key === 'n') {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 1 && num <= 15) {
          opts.count = num;
        }
        continue;
      }
      if (key === 'player' || key === 'user' || key === 'u') {
        if (val) playerTokens.push(val);
        continue;
      }
    }

    // 3. Standalone number 1..15 treated as count if not part of username
    if (/^\d+$/.test(token)) {
      const num = parseInt(token, 10);
      if (num >= 1 && num <= 15 && playerTokens.length <= 1) {
        opts.count = num;
        continue;
      }
    }

    playerTokens.push(token);
  }

  if (playerTokens.length > 0) {
    opts.player = playerTokens.join(' ');
  }

  return normalizeRecentListOptions(opts);
}

function normalizeRecentListOptions(opts = {}) {
  const normalized = {
    player: opts.player || null,
    count: Math.min(15, Math.max(1, Number(opts.count) || 15)),
    pass: opts.pass ?? null,
    fail: opts.fail ?? null,
    fc: opts.fc ?? null,
    choke: opts.choke ?? null,
    ranked: opts.ranked ?? null,
    status: opts.status ? String(opts.status).toLowerCase() : null,
    mods: Array.isArray(opts.mods) ? opts.mods : (opts.mods ? parseMods(opts.mods) : null),
    modsExact: Boolean(opts.modsExact),
    grade: opts.grade ? String(opts.grade).toUpperCase() : null,
    minGrade: opts.minGrade ? String(opts.minGrade).toUpperCase() : null,
    sort: opts.sort || 'recent',
    mode: opts.mode ? (MODE_ALIASES[String(opts.mode).toLowerCase()] || null) : null
  };

  if (typeof opts.mods === 'string' && ['NM', 'NOMOD', 'NONE'].includes(opts.mods.trim().toUpperCase())) {
    normalized.mods = ['NM'];
    normalized.modsExact = true;
  }

  // Reconcile pass=false -> fail=true, fail=false -> pass=true
  if (normalized.pass === false && normalized.fail === null) {
    normalized.fail = true;
  }
  if (normalized.fail === false && normalized.pass === null) {
    normalized.pass = true;
  }
  // FC or Choke inherently requires passed scores (or at least non-failed for FC)
  if (normalized.fc === true && normalized.pass === null && normalized.fail !== true) {
    normalized.pass = true;
  }
  if (normalized.choke === true && normalized.pass === null && normalized.fail !== true) {
    normalized.pass = true;
  }

  return normalized;
}

function hasActiveFilters(opts = {}) {
  return Boolean(
    opts.pass !== null ||
    opts.fail !== null ||
    opts.fc !== null ||
    opts.choke !== null ||
    opts.ranked !== null ||
    opts.status !== null ||
    (opts.mods && opts.mods.length > 0) ||
    opts.grade !== null ||
    opts.minGrade !== null ||
    (opts.sort && opts.sort !== 'recent')
  );
}

function isScorePassed(score) {
  return score.passed !== false && String(score.rank || '').toUpperCase() !== 'F';
}

function isScoreEffectiveFc(score, bm = {}) {
  if (!isScorePassed(score)) return false;
  const mapMax = bm.max_combo || bm.count_max_combo || 0;
  const misses = score.statistics?.miss ?? score.statistics?.count_miss ?? 0;
  return (
    isFullCombo(score, bm, mapMax) ||
    (misses === 0 && mapMax > 0 && (score.max_combo || 0) >= mapMax - 2)
  );
}

function isScoreChoke(score, bm = {}) {
  if (!isScorePassed(score)) return false;
  if (isScoreEffectiveFc(score, bm)) return false;
  const misses = score.statistics?.miss ?? score.statistics?.count_miss ?? 0;
  const mapMax = bm.max_combo || bm.count_max_combo || 0;
  const combo = score.max_combo || 0;
  if (misses >= 1 && misses <= 5) {
    if (mapMax > 0) return combo >= mapMax * 0.55 || misses <= 3;
    return misses <= 3;
  }
  // Sliderbreak choke (0 miss, high combo ratio, not FC)
  if (misses === 0 && mapMax > 0 && combo >= mapMax * 0.70) {
    return true;
  }
  return false;
}

function getScoreEffectiveSr(score) {
  const bm = score.beatmap || {};
  if (score.modded_difficulty_rating) return Number(score.modded_difficulty_rating);
  if (bm.modded_difficulty_rating) return Number(bm.modded_difficulty_rating);
  const mods = score.mods || [];
  if (mods.length > 0) {
    const modded = calculateModdedStats(bm, mods);
    if (modded?.sr) return Number(modded.sr);
  }
  return Number(bm.difficulty_rating || 0);
}

/**
 * Fast pre-enrichment filter (filters out scores that don't need expensive beatmap/PP enrichment).
 */
function preFilterRecentScores(scores = [], opts = {}) {
  return scores.filter(score => {
    const passed = isScorePassed(score);
    const bm = score.beatmap || {};
    const mapStatus = String(bm.status || score.beatmapset?.status || '').toLowerCase();

    if (opts.pass === true && !passed) return false;
    if (opts.fail === true && passed) return false;

    if (opts.fc === true) {
      if (!passed) return false;
      const misses = score.statistics?.miss ?? score.statistics?.count_miss ?? 0;
      if (misses > 0) return false;
    }

    if (opts.choke === true) {
      if (!passed) return false;
      const misses = score.statistics?.miss ?? score.statistics?.count_miss ?? 0;
      if (misses > 5) return false;
    }

    if (opts.ranked === true && mapStatus && !['ranked', 'approved'].includes(mapStatus)) {
      return false;
    }
    if (opts.ranked === false && mapStatus && ['ranked', 'approved'].includes(mapStatus)) {
      return false;
    }

    if (opts.status && mapStatus) {
      if (opts.status === 'unranked') {
        if (['ranked', 'approved'].includes(mapStatus)) return false;
      } else if (opts.status === 'ranked') {
        if (!['ranked', 'approved'].includes(mapStatus)) return false;
      } else if (mapStatus !== opts.status) {
        return false;
      }
    }

    if (opts.mods && opts.mods.length > 0) {
      const scoreMods = parseMods(score.mods);
      if (opts.mods[0] === 'NM') {
        if (scoreMods.length > 0) return false;
      } else {
        // Normalize NC <-> DT equivalence unless exact
        const hasMod = (reqMod) => {
          if (reqMod === 'DT') return scoreMods.includes('DT') || scoreMods.includes('NC');
          return scoreMods.includes(reqMod);
        };
        if (!opts.mods.every(hasMod)) return false;
        if (opts.modsExact && scoreMods.length !== opts.mods.length) return false;
      }
    }

    const rawGrade = passed ? String(score.rank || '').toUpperCase() : 'F';
    if (opts.grade) {
      const target = opts.grade;
      if (target === 'SS' || target === 'X') {
        if (!['X', 'XH', 'SS', 'SSH'].includes(rawGrade)) return false;
      } else if (target === 'S') {
        if (!['S', 'SH'].includes(rawGrade)) return false;
      } else if (rawGrade !== target) {
        return false;
      }
    }

    if (opts.minGrade) {
      const minVal = GRADE_ORDER[opts.minGrade] || 0;
      const curVal = GRADE_ORDER[rawGrade] || 0;
      if (curVal < minVal) return false;
    }

    return true;
  });
}

/**
 * Post-enrichment filter (checks exact FC / Choke / Beatmap status once full beatmap is loaded) + sorting.
 */
function postFilterAndSortScores(scores = [], opts = {}) {
  const filtered = scores.filter(score => {
    const bm = score.beatmap || {};
    const mapStatus = String(bm.status || score.beatmapset?.status || '').toLowerCase();

    if (opts.ranked === true && !['ranked', 'approved'].includes(mapStatus)) return false;
    if (opts.ranked === false && ['ranked', 'approved'].includes(mapStatus)) return false;

    if (opts.status) {
      if (opts.status === 'unranked' && ['ranked', 'approved'].includes(mapStatus)) return false;
      if (opts.status === 'ranked' && !['ranked', 'approved'].includes(mapStatus)) return false;
      if (!['unranked', 'ranked'].includes(opts.status) && mapStatus !== opts.status) return false;
    }

    if (opts.fc === true && !isScoreEffectiveFc(score, bm)) return false;
    if (opts.fc === false && isScoreEffectiveFc(score, bm)) return false;

    if (opts.choke === true && !isScoreChoke(score, bm)) return false;
    if (opts.choke === false && isScoreChoke(score, bm)) return false;

    return true;
  });

  const sorted = [...filtered];
  const sortMode = opts.sort || 'recent';

  if (sortMode === 'pp') {
    sorted.sort((a, b) => (Number(b.pp ?? b.fail_pp ?? -1)) - (Number(a.pp ?? a.fail_pp ?? -1)));
  } else if (sortMode === 'acc') {
    sorted.sort((a, b) => (Number(b.accuracy || 0)) - (Number(a.accuracy || 0)));
  } else if (sortMode === 'combo') {
    sorted.sort((a, b) => (Number(b.max_combo || 0)) - (Number(a.max_combo || 0)));
  } else if (sortMode === 'sr') {
    sorted.sort((a, b) => getScoreEffectiveSr(b) - getScoreEffectiveSr(a));
  } else if (sortMode === 'score') {
    sorted.sort((a, b) => Number(b.total_score ?? b.score ?? 0) - Number(a.total_score ?? a.score ?? 0));
  } else if (sortMode === 'miss') {
    sorted.sort((a, b) => {
      const ma = a.statistics?.miss ?? a.statistics?.count_miss ?? 0;
      const mb = b.statistics?.miss ?? b.statistics?.count_miss ?? 0;
      return ma - mb;
    });
  }

  return sorted.slice(0, opts.count || 15);
}

/**
 * Format active filter tags for displaying in the card header.
 */
function formatFilterSummaryTags(opts = {}, lang = 'en') {
  const tags = [];
  const isId = lang === 'id';

  if (opts.fc === true) tags.push('FC ONLY');
  else if (opts.choke === true) tags.push('CHOKE ONLY');
  else if (opts.fail === true) tags.push(isId ? 'GAGAL SAJA' : 'FAIL ONLY');
  else if (opts.pass === true) tags.push(isId ? 'LULUS SAJA' : 'PASS ONLY');

  if (opts.ranked === true) tags.push('RANKED');
  else if (opts.ranked === false) tags.push('UNRANKED');
  else if (opts.status) tags.push(opts.status.toUpperCase());

  if (opts.mods && opts.mods.length > 0) {
    tags.push(`+${opts.mods.join('')}${opts.modsExact && opts.mods[0] !== 'NM' ? '!' : ''}`);
  }

  if (opts.grade) tags.push(`GRADE ${opts.grade}`);
  else if (opts.minGrade) tags.push(`>=${opts.minGrade}`);

  if (opts.sort && opts.sort !== 'recent') {
    tags.push(`SORT: ${opts.sort.toUpperCase()}`);
  }

  return tags;
}

/**
 * Fetch, filter, enrich, and sort recent scores efficiently.
 */
async function fetchFilteredRecentScores(osuApi, userId, opts = {}) {
  const onlyPassApi = opts.pass === true && opts.fail !== true;
  const includeFails = onlyPassApi ? 0 : 1;

  // Fetch deeper history (up to 100) when filtering or sorting so we can find up to 15 matching plays
  const needsDeepFetch = Boolean(
    opts.fail !== null ||
    opts.fc !== null ||
    opts.choke !== null ||
    opts.ranked !== null ||
    opts.status !== null ||
    (opts.mods && opts.mods.length > 0) ||
    opts.grade !== null ||
    opts.minGrade !== null ||
    (opts.sort && opts.sort !== 'recent')
  );

  const apiLimit = needsDeepFetch ? 100 : opts.count;
  const rawScores = await osuApi.getUserRecentScore(userId, apiLimit, includeFails, opts.mode);
  if (!rawScores || rawScores.length === 0) {
    return { rawCount: 0, scores: [] };
  }

  const preFiltered = preFilterRecentScores(rawScores, opts);
  if (preFiltered.length === 0) {
    return { rawCount: rawScores.length, scores: [] };
  }

  // Cap enrichment batch to keep response snappy:
  // - If sorting by PP/SR, enrich up to 35 candidates to find top ones
  // - If post-filtering by FC/Choke/Ranked, enrich up to 35 candidates until we have enough
  // - Otherwise enrich exact count needed
  const needsPostFilterOrPpSort = Boolean(
    opts.fc !== null ||
    opts.choke !== null ||
    opts.ranked !== null ||
    opts.status !== null ||
    opts.sort === 'pp' ||
    opts.sort === 'sr'
  );
  const candidates = preFiltered.slice(0, needsPostFilterOrPpSort ? 35 : opts.count);

  await Promise.all(candidates.map(s => osuApi.enrichScoreWithBeatmapAndMods(s)));

  const finalScores = postFilterAndSortScores(candidates, opts);
  return {
    rawCount: rawScores.length,
    scores: finalScores
  };
}

module.exports = {
  parseRecentListArgs,
  normalizeRecentListOptions,
  hasActiveFilters,
  preFilterRecentScores,
  postFilterAndSortScores,
  formatFilterSummaryTags,
  fetchFilteredRecentScores
};
