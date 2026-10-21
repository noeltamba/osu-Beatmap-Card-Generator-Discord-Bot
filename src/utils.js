/**
 * Utility functions for parsing osu! URLs and formatting data
 */

function parseBeatmapInput(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  // Pattern 1: https://osu.ppy.sh/beatmapsets/123456#osu/789012 or #mania/789012 etc.
  const diffMatch = trimmed.match(/beatmapsets\/\d+#(?:osu|taiko|fruits|mania)\/(\d+)/i);
  if (diffMatch) {
    return { type: 'beatmap', id: parseInt(diffMatch[1], 10) };
  }

  // Pattern 2: https://osu.ppy.sh/b/789012 or https://osu.ppy.sh/beatmaps/789012
  const bMatch = trimmed.match(/(?:beatmaps|b)\/(\d+)/i);
  if (bMatch) {
    return { type: 'beatmap', id: parseInt(bMatch[1], 10) };
  }

  // Pattern 3: https://osu.ppy.sh/beatmapsets/123456 (tanpa diff tertentu)
  const setMatch = trimmed.match(/beatmapsets\/(\d+)/i);
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
  const regex = /https?:\/\/osu\.ppy\.sh\/(?:beatmapsets\/\d+(?:#(?:osu|taiko|fruits|mania)\/\d+)?|b\/\d+|beatmaps\/\d+)/gi;
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
  formatMods
};
