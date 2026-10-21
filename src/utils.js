/**
 * Utility functions for parsing osu! URLs and formatting data
 */

function parseBeatmapInput(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Pattern 1: https://osu.ppy.sh/beatmapsets/123456#osu/789012 or #taiko/789012 etc.
  const diffMatchWithMode = trimmed.match(/beatmapsets\/\d+#(?:osu|taiko|fruits|mania)\/(\d+)/i);
  if (diffMatchWithMode) {
    return { type: 'beatmap', id: parseInt(diffMatchWithMode[1], 10) };
  }

  // Pattern 1b: https://osu.ppy.sh/beatmapsets/123456#789012 (without mode in hash)
  const diffMatchHash = trimmed.match(/beatmapsets\/\d+#(\d+)/i);
  if (diffMatchHash) {
    return { type: 'beatmap', id: parseInt(diffMatchHash[1], 10) };
  }

  // Pattern 1c: https://osu.ppy.sh/beatmapsets/123456/789012 (slash instead of hash)
  const diffMatchSlash = trimmed.match(/beatmapsets\/\d+\/(\d+)/i);
  if (diffMatchSlash) {
    return { type: 'beatmap', id: parseInt(diffMatchSlash[1], 10) };
  }

  // Pattern 2: https://osu.ppy.sh/b/789012 or https://osu.ppy.sh/beatmaps/789012
  const bMatch = trimmed.match(/(?:beatmaps|b)\/(\d+)/i);
  if (bMatch) {
    return { type: 'beatmap', id: parseInt(bMatch[1], 10) };
  }

  // Pattern 3: https://osu.ppy.sh/beatmapsets/123456 or https://osu.ppy.sh/s/123456 (set without diff)
  const setMatch = trimmed.match(/(?:beatmapsets|s)\/(\d+)/i);
  if (setMatch) {
    return { type: 'beatmapset', id: parseInt(setMatch[1], 10) };
  }

  // Pattern 4: Raw number ID
  if (/^\d+$/.test(trimmed)) {
    return { type: 'beatmap', id: parseInt(trimmed, 10) };
  }

  return null;
}

function extractAllOsuUrls(text) {
  if (!text) return [];
  // Match full osu! URLs including beatmapsets with specific diff, /b/, /s/, /beatmaps/
  const regex = /https?:\/\/osu\.ppy\.sh\/(?:beatmapsets\/\d+(?:#(?:[a-zA-Z0-9_-]+\/)?\d+|\/\d+)?|b\/\d+|s\/\d+|beatmaps\/\d+)(?:[^\s<>'"`]+)?/gi;
  const matches = text.match(regex);
  return matches ? [...new Set(matches)] : [];
}

function parseScoreInput(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Pattern: https://osu.ppy.sh/scores/7265198407 or https://osu.ppy.sh/scores/osu/7265198407
  const match = trimmed.match(/scores\/(?:([a-z]+)\/)?(\d+)/i);
  if (match) {
    return {
      id: parseInt(match[2], 10),
      mode: match[1] ? match[1].toLowerCase() : null
    };
  }

  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) {
    return {
      id: parseInt(trimmed, 10),
      mode: null
    };
  }

  return null;
}

function extractAllScoreUrls(text) {
  if (!text) return [];
  const regex = /https?:\/\/osu\.ppy\.sh\/scores\/(?:(?:osu|taiko|fruits|mania)\/)?\d+/gi;
  const matches = text.match(regex);
  return matches ? [...new Set(matches)] : [];
}

function parseMods(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map(m => (typeof m === 'string' ? m : m?.acronym || '').toUpperCase())
      .filter(m => m && m !== 'NM');
  }
  if (typeof input !== 'string') return [];
  const clean = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const valid = [
    'NF', 'EZ', 'TD', 'HD', 'HR', 'SD', 'DT', 'HT', 'NC', 'FL',
    'SO', 'PF', '4K', '5K', '6K', '7K', '8K', '9K', '1K', '2K', '3K', 'MR', 'V2'
  ];
  const result = [];
  for (let i = 0; i < clean.length; i += 2) {
    const pair = clean.substr(i, 2);
    if (valid.includes(pair)) {
      result.push(pair);
    }
  }
  return result;
}

function extractModsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const match = text.match(/\+([a-zA-Z0-9]+)/);
  if (match) {
    return parseMods(match[1]);
  }
  return [];
}

function calculateModdedStats(beatmap = {}, mods = [], mode = 'osu') {
  const cleanMods = parseMods(mods);

  const hasDT = cleanMods.includes('DT') || cleanMods.includes('NC');
  const hasHT = cleanMods.includes('HT') || cleanMods.includes('DC');
  const hasHR = cleanMods.includes('HR');
  const hasEZ = cleanMods.includes('EZ');
  const hasFL = cleanMods.includes('FL');

  const speed = hasDT ? 1.5 : (hasHT ? 0.75 : 1.0);

  // 1. Circle Size (CS)
  let cs = beatmap.cs ?? 0;
  if (mode !== 'mania') {
    if (hasHR) {
      cs = Math.min(10, cs * 1.3);
    } else if (hasEZ) {
      cs = cs * 0.5;
    }
  }
  cs = Math.min(10, Math.max(0, cs));

  // 2. HP Drain (HP)
  let hp = beatmap.drain ?? 0;
  if (hasHR) {
    hp = Math.min(10, hp * 1.4);
  } else if (hasEZ) {
    hp = hp * 0.5;
  }
  hp = Math.min(10, Math.max(0, hp));

  // 3. Approach Rate (AR)
  let baseAr = beatmap.ar ?? 0;
  if (hasHR) {
    baseAr = Math.min(10, baseAr * 1.4);
  } else if (hasEZ) {
    baseAr = baseAr * 0.5;
  }

  // Calculate base approach window in milliseconds
  let arMs;
  if (baseAr < 5) {
    arMs = 1800 - (120 * baseAr);
  } else if (baseAr === 5) {
    arMs = 1200;
  } else {
    arMs = 1200 - (150 * (baseAr - 5));
  }

  // Scale approach time with clock rate
  arMs = arMs / speed;

  // Convert milliseconds back to effective AR
  let ar;
  if (arMs < 1200) {
    ar = 5 + ((1200 - arMs) / 150);
  } else {
    ar = (1800 - arMs) / 120;
  }

  // 4. Overall Difficulty (OD)
  let baseOd = beatmap.accuracy ?? 0;
  if (hasHR) {
    baseOd = Math.min(10, baseOd * 1.4);
  } else if (hasEZ) {
    baseOd = baseOd * 0.5;
  }

  let odMs;
  if (mode === 'taiko') {
    odMs = 50 - (3 * baseOd);
  } else {
    odMs = 80 - (6 * baseOd);
  }

  odMs = odMs / speed;

  let od;
  if (mode === 'taiko') {
    od = (50 - odMs) / 3;
  } else {
    od = (80 - odMs) / 6;
  }

  // 5. BPM and Length
  const bpm = Math.round((beatmap.bpm || 0) * speed);
  const totalLength = Math.round((beatmap.total_length || 0) / speed);
  const hitLength = Math.round((beatmap.hit_length || 0) / speed);

  // 6. Star Rating fallback approximation
  let sr = beatmap.difficulty_rating || 0;
  if (cleanMods.length > 0) {
    let multiplier = 1.0;
    if (hasDT) multiplier *= 1.38;
    if (hasHT) multiplier *= 0.8;
    if (hasHR) multiplier *= 1.1;
    if (hasEZ) multiplier *= 0.85;
    if (hasFL) multiplier *= 1.15;
    sr = Math.round(sr * multiplier * 100) / 100;
  }

  return {
    cs: Math.round(cs * 10) / 10,
    hp: Math.round(hp * 10) / 10,
    ar: Math.round(ar * 10) / 10,
    od: Math.round(od * 10) / 10,
    bpm,
    total_length: totalLength,
    hit_length: hitLength,
    speed,
    sr
  };
}

function isFullCombo(score, beatmap = {}, mapMaxCombo = null) {
  if (!score) return false;

  // 1. Failed plays can never be an FC
  if (score.rank === 'F') return false;

  const stats = score.statistics || {};
  const missCount = stats.count_miss ?? 0;

  // 2. Any miss means combo was broken
  if (missCount > 0) return false;

  // 3. API explicitly confirmed full/perfect combo
  if (score.perfect === true || score.legacy_perfect === true) {
    return true;
  }

  // 4. Compare with beatmap max combo if known
  const targetMax = mapMaxCombo || beatmap.max_combo || 0;
  if (targetMax > 0) {
    if ((score.max_combo || 0) >= targetMax) {
      return true;
    }
    return false;
  }

  // 5. Fallback: if mapMaxCombo is unknown, only trust score.perfect
  return false;
}

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getStarRatingColor(sr) {
  if (sr < 2.0) return { bg: '#4290fb', text: '#ffffff', glow: 'rgba(66, 144, 251, 0.6)' };
  if (sr < 2.7) return { bg: '#4fffd5', text: '#002621', glow: 'rgba(79, 255, 213, 0.6)' };
  if (sr < 4.0) return { bg: '#7cee4c', text: '#113300', glow: 'rgba(124, 238, 76, 0.6)' };
  if (sr < 5.3) return { bg: '#ffbb33', text: '#3d2500', glow: 'rgba(255, 187, 51, 0.6)' };
  if (sr < 6.5) return { bg: '#ff506e', text: '#ffffff', glow: 'rgba(255, 80, 110, 0.6)' };
  if (sr < 8.0) return { bg: '#a347eb', text: '#ffffff', glow: 'rgba(163, 71, 235, 0.6)' };
  return { bg: '#1c1724', text: '#ff3366', glow: 'rgba(255, 51, 102, 0.8)', border: '#ff3366' };
}

function getStatusBadge(status) {
  const map = {
    ranked: { label: 'RANKED', color: '#44d7b6', bg: 'rgba(68, 215, 182, 0.2)' },
    approved: { label: 'APPROVED', color: '#44d7b6', bg: 'rgba(68, 215, 182, 0.2)' },
    qualified: { label: 'QUALIFIED', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.2)' },
    loved: { label: 'LOVED', color: '#ff66aa', bg: 'rgba(255, 102, 170, 0.2)' },
    pending: { label: 'PENDING', color: '#facc15', bg: 'rgba(250, 204, 21, 0.2)' },
    wip: { label: 'WIP', color: '#facc15', bg: 'rgba(250, 204, 21, 0.2)' },
    graveyard: { label: 'GRAVEYARD', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' }
  };
  return map[status] || { label: (status || 'UNKNOWN').toUpperCase(), color: '#cbd5e1', bg: 'rgba(203, 213, 225, 0.2)' };
}

function getModeName(mode) {
  const modes = {
    osu: 'osu! Standard',
    taiko: 'osu! Taiko',
    fruits: 'osu! Catch',
    mania: 'osu! Mania'
  };
  return modes[mode] || 'osu!';
}

function getRankGradeStyle(rank) {
  const r = (rank || '').toUpperCase();
  if (r === 'XH' || r === 'SSH') {
    return { label: 'SS', color: '#f1f5f9', glow: 'rgba(255, 255, 255, 0.8)', bg: 'rgba(241, 245, 249, 0.15)' };
  }
  if (r === 'X' || r === 'SS') {
    return { label: 'SS', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.8)', bg: 'rgba(251, 191, 36, 0.15)' };
  }
  if (r === 'SH') {
    return { label: 'S', color: '#cbd5e1', glow: 'rgba(203, 213, 225, 0.8)', bg: 'rgba(203, 213, 225, 0.15)' };
  }
  if (r === 'S') {
    return { label: 'S', color: '#facc15', glow: 'rgba(250, 204, 21, 0.8)', bg: 'rgba(250, 204, 21, 0.15)' };
  }
  if (r === 'A') {
    return { label: 'A', color: '#4ade80', glow: 'rgba(74, 222, 128, 0.8)', bg: 'rgba(74, 222, 128, 0.15)' };
  }
  if (r === 'B') {
    return { label: 'B', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.8)', bg: 'rgba(56, 189, 248, 0.15)' };
  }
  if (r === 'C') {
    return { label: 'C', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.8)', bg: 'rgba(192, 132, 252, 0.15)' };
  }
  if (r === 'D') {
    return { label: 'D', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.8)', bg: 'rgba(244, 63, 94, 0.15)' };
  }
  return { label: 'F', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.8)', bg: 'rgba(239, 68, 68, 0.15)' };
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMods(mods) {
  const cleanMods = parseMods(mods);
  return cleanMods.length > 0 ? `+${cleanMods.join('')}` : '+NM';
}

function getCanonicalBeatmapUrl(beatmap, preferredUrl = null) {
  if (preferredUrl && typeof preferredUrl === 'string' && /^https?:\/\//i.test(preferredUrl.trim())) {
    return preferredUrl.trim();
  }
  if (!beatmap) return 'https://osu.ppy.sh';
  const setId = beatmap.beatmapset_id || beatmap.beatmapset?.id;
  const mode = beatmap.mode || 'osu';
  const id = beatmap.id;
  if (setId && id) {
    return `https://osu.ppy.sh/beatmapsets/${setId}#${mode}/${id}`;
  }
  if (setId && !id) {
    return `https://osu.ppy.sh/beatmapsets/${setId}`;
  }
  if (id) {
    return `https://osu.ppy.sh/b/${id}`;
  }
  return beatmap.url || 'https://osu.ppy.sh';
}

function getCanonicalScoreUrl(score, preferredUrl = null) {
  if (preferredUrl && typeof preferredUrl === 'string' && /^https?:\/\//i.test(preferredUrl.trim())) {
    return preferredUrl.trim();
  }
  if (!score || !score.id) return 'https://osu.ppy.sh';
  const mode = score.mode || (typeof score.ruleset_id === 'string' ? score.ruleset_id : null);
  if (mode) {
    return `https://osu.ppy.sh/scores/${mode}/${score.id}`;
  }
  return `https://osu.ppy.sh/scores/${score.id}`;
}

function detectScoreClient(score) {
  if (!score) return 'stable';

  // 1. Explicit build_id
  if (score.build_id != null && Number(score.build_id) > 0) {
    return 'lazer';
  }

  // 2. Lazer-exclusive mods
  const lazerOnlyMods = [
    'CL', 'DA', 'AC', 'BL', 'MR', 'TP', 'MU', 'NS', 'MG', 'RP',
    'AT', 'DF', 'WU', 'WD', 'TC', 'BR', 'SG', 'ST', 'RD', 'AL', 'FF'
  ];
  const mods = score.mods || [];
  const hasLazerMod = mods.some(m => {
    const acronym = (typeof m === 'string' ? m : m?.acronym || '').toUpperCase();
    return lazerOnlyMods.includes(acronym) || (typeof m === 'object' && m?.settings != null);
  });
  if (hasLazerMod) {
    return 'lazer';
  }

  // 3. Lazer-specific slider/tick statistics
  const stats = score.statistics || {};
  if (
    stats.slider_tail_hit != null ||
    stats.large_tick_hit != null ||
    stats.small_tick_hit != null ||
    stats.legacy_combo_increase != null
  ) {
    return 'lazer';
  }

  // 4. legacy_score_id explicitly null while score id exists
  if (score.legacy_score_id === null && score.id != null) {
    return 'lazer';
  }

  // 5. Standardized 1M score scale
  const rawScore = Number(score.total_score ?? score.score ?? 0);
  if (score.total_score != null && rawScore > 0 && rawScore <= 1250000 && (score.classic_total_score || 0) > 1500000) {
    return 'lazer';
  }

  return 'stable';
}

function calculateLazerScore(score, mapMaxCombo = null, cleanMods = []) {
  if (!score) return 0;

  // If already given a standardized total_score (<= 1.25M), use it
  if (score.total_score != null && Number(score.total_score) > 0 && Number(score.total_score) <= 1250000) {
    return Math.round(Number(score.total_score));
  }

  const acc = Math.max(0, Math.min(1, score.accuracy || 0));
  const combo = score.max_combo || 0;
  const maxCombo = mapMaxCombo || score.beatmap?.max_combo || combo || 1;

  // 1. Accuracy portion (500,000 max, acc^5)
  const accPortion = 500000 * Math.pow(acc, 5);

  // 2. Combo portion (500,000 max, sqrt curve scaled by acc)
  const comboRatio = maxCombo > 0 ? Math.min(1, Math.sqrt(combo) / Math.sqrt(maxCombo)) : 1;
  const comboPortion = 500000 * comboRatio * acc;

  // 3. Mod multiplier in Lazer
  let modMultiplier = 1.0;
  const mods = Array.isArray(cleanMods) && cleanMods.length > 0 ? cleanMods : parseMods(score.mods);
  const hasDT = mods.includes('DT') || mods.includes('NC');
  const hasHR = mods.includes('HR');
  const hasHD = mods.includes('HD');
  const hasFL = mods.includes('FL');
  const hasEZ = mods.includes('EZ');
  const hasHT = mods.includes('HT') || mods.includes('DC');
  const hasNF = mods.includes('NF');
  const hasSO = mods.includes('SO');

  if (hasDT) modMultiplier *= 1.20;
  if (hasHR) modMultiplier *= 1.06;
  if (hasHD) modMultiplier *= 1.06;
  if (hasFL) modMultiplier *= 1.12;
  if (hasEZ) modMultiplier *= 0.50;
  if (hasHT) modMultiplier *= 0.30;
  if (hasNF) modMultiplier *= 0.50;
  if (hasSO) modMultiplier *= 0.90;

  return Math.round((accPortion + comboPortion) * modMultiplier);
}

function calculateStandardScore(score, beatmap = {}, cleanMods = []) {
  if (!score) return 0;

  // If already given a legacy Score V1, use it
  if (score.legacy_total_score != null && Number(score.legacy_total_score) > 0) {
    return Math.round(Number(score.legacy_total_score));
  }
  if (score.classic_total_score != null && Number(score.classic_total_score) > 0) {
    return Math.round(Number(score.classic_total_score));
  }
  if (score.classic_score != null && Number(score.classic_score) > 0) {
    return Math.round(Number(score.classic_score));
  }
  if (score.score != null && Number(score.score) > 1250000) {
    return Math.round(Number(score.score));
  }
  if (score.score != null && Number(score.score) > 0 && detectScoreClient(score) === 'stable') {
    return Math.round(Number(score.score));
  }

  // Fallback approximation of Score V1
  const bm = score.beatmap || beatmap || {};
  const hp = bm.drain ?? 5;
  const cs = bm.cs ?? 4;
  const od = bm.accuracy ?? 8;
  const countObjects = (bm.count_circles || 0) + (bm.count_sliders || 0) + (bm.count_spinners || 0) || 500;
  const diffMultiplier = Math.max(1, Math.round((hp + cs + od + Math.min(Math.max(countObjects, 0), 1000)) / 10));

  let modMultiplier = 1.0;
  const mods = Array.isArray(cleanMods) && cleanMods.length > 0 ? cleanMods : parseMods(score.mods);
  const hasDT = mods.includes('DT') || mods.includes('NC');
  const hasHR = mods.includes('HR');
  const hasHD = mods.includes('HD');
  const hasFL = mods.includes('FL');
  const hasEZ = mods.includes('EZ');
  const hasHT = mods.includes('HT') || mods.includes('DC');
  const hasNF = mods.includes('NF');
  const hasSO = mods.includes('SO');

  if (hasDT) modMultiplier *= 1.12;
  if (hasHR) modMultiplier *= 1.06;
  if (hasHD) modMultiplier *= 1.06;
  if (hasFL) modMultiplier *= 1.12;
  if (hasEZ) modMultiplier *= 0.50;
  if (hasHT) modMultiplier *= 0.30;
  if (hasNF) modMultiplier *= 0.50;
  if (hasSO) modMultiplier *= 0.90;

  const maxCombo = score.max_combo || bm.max_combo || 100;
  const acc = score.accuracy || 1.0;
  const estimatedComboPart = ((maxCombo * (maxCombo + 1)) / 2) * diffMultiplier * modMultiplier * 12;
  const estimatedHitPart = maxCombo * 300 * acc;

  return Math.round(estimatedHitPart + estimatedComboPart);
}

module.exports = {
  parseBeatmapInput,
  extractAllOsuUrls,
  parseScoreInput,
  extractAllScoreUrls,
  parseMods,
  extractModsFromText,
  calculateModdedStats,
  isFullCombo,
  formatDuration,
  getStarRatingColor,
  getStatusBadge,
  getModeName,
  getRankGradeStyle,
  formatRelativeTime,
  formatMods,
  getCanonicalBeatmapUrl,
  getCanonicalScoreUrl,
  detectScoreClient,
  calculateLazerScore,
  calculateStandardScore
};

