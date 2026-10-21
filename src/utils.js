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
  const match = trimmed.match(/scores\/(?:(?:osu|taiko|fruits|mania)\/)?(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }

  // Raw numeric ID
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  return null;
}

function extractAllScoreUrls(text) {
  if (!text) return [];
  const regex = /https?:\/\/osu\.ppy\.sh\/scores\/(?:(?:osu|taiko|fruits|mania)\/)?\d+/gi;
  const matches = text.match(regex);
  return matches ? [...new Set(matches)] : [];
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
  if (!mods || mods.length === 0) return '+NM';
  const cleanMods = mods.map(m => typeof m === 'string' ? m : m.acronym || '').filter(Boolean);
  return cleanMods.length > 0 ? `+${cleanMods.join('')}` : '+NM';
}

module.exports = {
  parseBeatmapInput,
  extractAllOsuUrls,
  parseScoreInput,
  extractAllScoreUrls,
  formatDuration,
  getStarRatingColor,
  getStatusBadge,
  getModeName,
  getRankGradeStyle,
  formatRelativeTime,
  formatMods
};
