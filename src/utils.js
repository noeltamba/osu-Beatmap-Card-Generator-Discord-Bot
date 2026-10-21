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

module.exports = {
  parseBeatmapInput,
  extractAllOsuUrls,
  formatDuration,
  getStarRatingColor,
  getStatusBadge,
  getModeName
};
