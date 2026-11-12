const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { calculateScorePp } = require('./ppCalculator');
const { getIcon, getBanchoLogoImage } = require('./iconHelper');
const {
  getStarRatingColor,
  getStatusBadge,
  getModeName,
  getRankGradeStyle,
  formatDuration,
  parseMods,
  formatMods,
  calculateModdedStats
} = require('./utils');
const { calculatePlayerSkills } = require('./profileCardGenerator');
const { t } = require('./i18n');

// Register Torus Font family
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Regular.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-SemiBold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Bold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Heavy.otf'), 'Torus');
} catch (e) {}

// Register CJK Fallback Fonts
try {
  const winFonts = [
    { path: 'C:\\Windows\\Fonts\\YuGothB.ttc', name: 'Yu Gothic' },
    { path: 'C:\\Windows\\Fonts\\msgothic.ttc', name: 'MS Gothic' },
    { path: 'C:\\Windows\\Fonts\\msyh.ttc', name: 'Microsoft YaHei' },
    { path: 'C:\\Windows\\Fonts\\malgun.ttf', name: 'Malgun Gothic' }
  ];
  for (const f of winFonts) {
    try {
      GlobalFonts.registerFromPath(f.path, f.name);
    } catch (_) {}
  }
} catch (_) {}

const FONT_STACK = '"Torus", "Yu Gothic", "MS Gothic", "Microsoft YaHei", "Malgun Gothic", "Segoe UI", sans-serif';

function truncate(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

function formatCompactNumber(num) {
  if (!num || isNaN(num)) return '0';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return Number(num).toLocaleString();
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/**
 * Cozy Red & Blue Duel Palettes (Warm, comfortable, and easy on the eyes)
 */
const COZY_PALETTES = {
  p1: {
    name: 'Cozy Rose Red',
    accent: '#f43f5e', // Warm rose red / soft crimson (calm, cozy, non-glare)
    glow: 'rgba(244, 63, 94, 0.22)',
    bgTint: 'rgba(244, 63, 94, 0.12)',
    subtle: 'rgba(244, 63, 94, 0.05)',
    border: 'rgba(244, 63, 94, 0.35)',
    badgeBg: 'rgba(244, 63, 94, 0.18)',
    text: '#ffe4e6',
    contrastText: '#ffffff'
  },
  p2: {
    name: 'Cozy Sky Blue',
    accent: '#38bdf8', // Calm sky blue / soft cyan azure (serene, readable, eye-pleasing)
    glow: 'rgba(56, 189, 248, 0.22)',
    bgTint: 'rgba(56, 189, 248, 0.12)',
    subtle: 'rgba(56, 189, 248, 0.05)',
    border: 'rgba(56, 189, 248, 0.35)',
    badgeBg: 'rgba(56, 189, 248, 0.18)',
    text: '#e0f2fe',
    contrastText: '#090d16'
  }
};

/**
 * Archetype Palettes (Supports custom overrides or PP archetype mapping)
 */
const ARCHETYPE_PALETTES = {
  red: COZY_PALETTES.p1,
  blue: COZY_PALETTES.p2,
  all_rounder: {
    name: 'All-Rounder',
    accent: '#fbbf24', // Cozy warm gold / amber
    glow: 'rgba(251, 191, 36, 0.25)',
    bgTint: 'rgba(251, 191, 36, 0.12)',
    subtle: 'rgba(251, 191, 36, 0.05)',
    border: 'rgba(251, 191, 36, 0.35)',
    badgeBg: 'rgba(251, 191, 36, 0.16)',
    text: '#fef3c7',
    contrastText: '#0f172a'
  },
  speed: {
    name: 'Speed Demon',
    accent: '#c084fc', // Cozy soft purple / violet
    glow: 'rgba(192, 132, 252, 0.25)',
    bgTint: 'rgba(192, 132, 252, 0.12)',
    subtle: 'rgba(192, 132, 252, 0.05)',
    border: 'rgba(192, 132, 252, 0.35)',
    badgeBg: 'rgba(192, 132, 252, 0.16)',
    text: '#f3e8ff',
    contrastText: '#ffffff'
  },
  aim: {
    name: 'Aim Specialist',
    accent: '#f43f5e', // Cozy warm coral / rose
    glow: 'rgba(244, 63, 94, 0.25)',
    bgTint: 'rgba(244, 63, 94, 0.12)',
    subtle: 'rgba(244, 63, 94, 0.05)',
    border: 'rgba(244, 63, 94, 0.35)',
    badgeBg: 'rgba(244, 63, 94, 0.16)',
    text: '#ffe4e6',
    contrastText: '#ffffff'
  },
  clean_sheet: {
    name: 'Clean Sheet',
    accent: '#34d399', // Cozy soft emerald / mint
    glow: 'rgba(52, 211, 153, 0.25)',
    bgTint: 'rgba(52, 211, 153, 0.12)',
    subtle: 'rgba(52, 211, 153, 0.05)',
    border: 'rgba(52, 211, 153, 0.35)',
    badgeBg: 'rgba(52, 211, 153, 0.16)',
    text: '#d1fae5',
    contrastText: '#0f172a'
  },
  hybrid: {
    name: 'Hybrid',
    accent: '#38bdf8', // Cozy calm sky blue
    glow: 'rgba(56, 189, 248, 0.25)',
    bgTint: 'rgba(56, 189, 248, 0.12)',
    subtle: 'rgba(56, 189, 248, 0.05)',
    border: 'rgba(56, 189, 248, 0.35)',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    text: '#e0f2fe',
    contrastText: '#0f172a'
  }
};

/**
 * Draw player avatar with rounded border and pinned country flag (supports right-aligned layout)
 */
async function drawPlayerAvatar(ctx, user, x, y, size, accentColor, isRightAligned = false) {
  const avatarUrl = user?.avatar_url || `https://a.ppy.sh/${user?.id || 1}`;

  try {
    const avImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avImg, x, y, size, size);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } catch (_) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const countryCode = user?.country?.code || user?.country_code;
  if (countryCode) {
    try {
      const flagUrl = `https://osu.ppy.sh/images/flags/${countryCode.toUpperCase()}.png`;
      const flagImg = await loadImage(flagUrl);
      const flagW = 24;
      const flagH = 16;
      // For right-aligned avatar, pin flag on bottom-left for symmetrical aesthetic
      const flagX = isRightAligned ? (x - 2) : (x + size - flagW + 2);
      const flagY = y + size - flagH + 2;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(flagX, flagY, flagW, flagH, 3);
      ctx.clip();
      ctx.drawImage(flagImg, flagX, flagY, flagW, flagH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    } catch (_) {}
  }
}

/**
 * Draw Winner Crown Badge
 */
function drawWinnerBadge(ctx, x, y, text = 'WINNER', icoCrown = null) {
  ctx.save();
  const badgeW = 96;
  const badgeH = 24;
  const bgGrad = ctx.createLinearGradient(x, y, x + badgeW, y);
  bgGrad.addColorStop(0, '#f59e0b');
  bgGrad.addColorStop(1, '#fbbf24');

  ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, badgeW, badgeH, 12);
  ctx.fill();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `bold 12px ${FONT_STACK}`;
  ctx.fillStyle = '#1e1b4b';

  if (icoCrown) {
    ctx.drawImage(icoCrown, x + 8, y + 5, 14, 14);
    ctx.textAlign = 'left';
    ctx.fillText(text, x + 26, y + 16);
  } else {
    ctx.textAlign = 'center';
    ctx.fillText(text, x + (badgeW / 2), y + 16);
  }
  ctx.restore();
}

/**
 * Generate Head-to-Head Versus Card (3:4 Ratio, 900x1200 px)
 * Follows the wireframe layout:
 * - Top: Clean Title
 * - Upper: Two distinct player cards with [Nama], #Rank, #Rank(Country), #PP, #Acc
 * - Middle: ONE BIG UNIFIED CONTAINER with 2 central vertical divider lines
 * - Bottom: ONE CONTAINER with 7 round blocks
 * - Footer: Columbina Boba circular icon beside credit
 */
async function generateVersusCard({
  user1,
  user2,
  score1 = null,
  score2 = null,
  beatmap = null,
  topScores1 = [],
  topScores2 = [],
  p1ArchetypeOverride = null,
  p2ArchetypeOverride = null
}, options = {}) {
  const lang = options.lang || 'en';
  const isId = lang === 'id';
  const isBeatmapMode = Boolean(beatmap && (score1 || score2));

  // Determine dominant PP archetypes for both players
  const [skills1, skills2] = await Promise.all([
    calculatePlayerSkills(topScores1, lang).catch(() => ({ archetype: 'all_rounder' })),
    calculatePlayerSkills(topScores2, lang).catch(() => ({ archetype: 'speed' }))
  ]);

  // Color Palette: Player 1 = Cozy Red (#f43f5e), Player 2 = Cozy Blue (#38bdf8)
  const p1Theme = (p1ArchetypeOverride && ARCHETYPE_PALETTES[p1ArchetypeOverride]) 
    ? ARCHETYPE_PALETTES[p1ArchetypeOverride] 
    : COZY_PALETTES.p1;
  const p2Theme = (p2ArchetypeOverride && ARCHETYPE_PALETTES[p2ArchetypeOverride]) 
    ? ARCHETYPE_PALETTES[p2ArchetypeOverride] 
    : COZY_PALETTES.p2;

  // Preload clean vector icons and Columbina Boba credit image
  const bobaPath = path.join(__dirname, '..', 'assets', 'images', 'Columbina Boba.jpg');
  const [icoCrown, icoSwords, icoTrophy, bobaImg] = await Promise.all([
    getIcon('crown', '#1e1b4b', 14, { fill: '#1e1b4b', strokeWidth: 1.5 }),
    getIcon('swords', '#cbd5e1', 24, { strokeWidth: 2.2 }),
    getIcon('trophy', '#fbbf24', 20, { strokeWidth: 2 }),
    loadImage(bobaPath).catch(() => null)
  ]);

  // Card Aspect Ratio: 3:4 (900 x 1200 px)
  const width = 900;
  const height = 1200;
  const radius = 32;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Outer clip
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.clip();

  // 1. Cozy Deep Midnight Slate Base
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // 2. Soft Ambient Radial Glows (Player 1 on Top-Left, Player 2 on Top-Right)
  const glow1 = ctx.createRadialGradient(200, 200, 20, 200, 200, 420);
  glow1.addColorStop(0, p1Theme.glow);
  glow1.addColorStop(1, 'rgba(9, 13, 22, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  const glow2 = ctx.createRadialGradient(700, 200, 20, 700, 200, 420);
  glow2.addColorStop(0, p2Theme.glow);
  glow2.addColorStop(1, 'rgba(9, 13, 22, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // Soft bottom ambient illumination
  const glowBottom = ctx.createLinearGradient(0, height - 260, 0, height);
  glowBottom.addColorStop(0, 'rgba(9, 13, 22, 0)');
  glowBottom.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, height - 260, width, 260);

  // Outer Frosted Border
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.stroke();
  ctx.restore();

  const headerX = 36;
  const headerW = width - (headerX * 2); // 828px
  const centerX = width / 2; // 450px

  // =========================================================================
  // MODE A: BEATMAP VERSUS (Comparing scores on the same beatmap)
  // =========================================================================
  if (isBeatmapMode) {
    const set = beatmap.beatmapset || {};
    const title = set.title || set.title_unicode || beatmap.title || 'Untitled';
    const artist = set.artist || set.artist_unicode || beatmap.artist || 'Unknown Artist';
    const version = beatmap.version || 'Normal';
    const sr = Number(beatmap.modded_difficulty_rating || beatmap.difficulty_rating || 0);
    const srInfo = getStarRatingColor(sr);

    // 1. TOP TITLE / BEATMAP HEADER (Y: 28)
    const headerY = 28;
    const headerH = 110;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(headerX, headerY, headerW, headerH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.font = `bold 22px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncate(ctx, `${title} [${version}]`, headerW - 160), headerX + 22, headerY + 36);

    ctx.font = `500 14px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    const mapper = set.creator || beatmap.creator || 'Unknown';
    ctx.fillText(truncate(ctx, `${artist} • mapped by ${mapper}`, headerW - 160), headerX + 22, headerY + 62);

    const bpm = Math.round(beatmap.bpm || 0);
    const len = formatDuration(beatmap.hit_length || beatmap.total_length || 0);
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${len}   •   ${bpm} BPM   •   CS ${beatmap.cs || 4}   AR ${beatmap.ar || 9}   OD ${beatmap.accuracy || 8}`, headerX + 22, headerY + 90);

    const srPillW = 96;
    const srPillH = 34;
    const srPillX = headerX + headerW - srPillW - 20;
    const srPillY = headerY + 22;

    ctx.save();
    ctx.fillStyle = srInfo.bg;
    ctx.beginPath();
    ctx.roundRect(srPillX, srPillY, srPillW, srPillH, 17);
    ctx.fill();
    ctx.strokeStyle = srInfo.color;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawStar(ctx, srPillX + 18, srPillY + (srPillH / 2), 5, 8, 4, srInfo.color);
    ctx.textAlign = 'center';
    ctx.font = `bold 16px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${sr.toFixed(2)}★`, srPillX + 56, srPillY + 23);
    ctx.restore();

    // Determine Winner
    let winner = null;
    const s1Score = Number(score1?.total_score ?? score1?.score ?? 0);
    const s2Score = Number(score2?.total_score ?? score2?.score ?? 0);
    const s1Pp = Math.round(Number(score1?.pp || 0));
    const s2Pp = Math.round(Number(score2?.pp || 0));
    const s1Acc = (Number(score1?.accuracy || 0) * 100).toFixed(2);
    const s2Acc = (Number(score2?.accuracy || 0) * 100).toFixed(2);

    if (score1 && !score2) winner = 1;
    else if (!score1 && score2) winner = 2;
    else if (score1 && score2) {
      if (s1Score > s2Score) winner = 1;
      else if (s2Score > s1Score) winner = 2;
      else {
        if (s1Pp > s2Pp) winner = 1;
        else if (s2Pp > s1Pp) winner = 2;
        else winner = 'tie';
      }
    }

    // 2. TOP PLAYER CARDS (Wireframe Style: [Nama], #Rank, #Rank(Country), #PP, #Acc)
    const topCardY = headerY + headerH + 18; // 156
    const topCardH = 136;
    const topCardW = 390;
    const p1X = headerX;
    const p2X = headerX + headerW - topCardW; // 474

    const p1RankStr = user1.statistics?.global_rank ? `#${user1.statistics.global_rank.toLocaleString()}` : '#-';
    const p2RankStr = user2.statistics?.global_rank ? `#${user2.statistics.global_rank.toLocaleString()}` : '#-';
    const p1CountryRank = user1.statistics?.country_rank ? `#${user1.statistics.country_rank.toLocaleString()}` : '#-';
    const p2CountryRank = user2.statistics?.country_rank ? `#${user2.statistics.country_rank.toLocaleString()}` : '#-';
    const p1CountryCode = user1.country?.code || '';
    const p2CountryCode = user2.country?.code || '';
    const p1PpTotal = Math.round(Number(user1.statistics?.pp || 0));
    const p2PpTotal = Math.round(Number(user2.statistics?.pp || 0));
    const p1HitAcc = Number(user1.statistics?.hit_accuracy || 0).toFixed(2);
    const p2HitAcc = Number(user2.statistics?.hit_accuracy || 0).toFixed(2);

    // Player 1 Card (Left)
    ctx.save();
    ctx.fillStyle = winner === 1 ? p1Theme.bgTint : 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.roundRect(p1X, topCardY, topCardW, topCardH, 18);
    ctx.fill();
    ctx.strokeStyle = winner === 1 ? p1Theme.border : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = winner === 1 ? 1.8 : 1;
    if (winner === 1) {
      ctx.shadowColor = p1Theme.glow;
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    const avSize = 78;
    const p1AvX = p1X + 18;
    const p1AvY = topCardY + 28;
    await drawPlayerAvatar(ctx, user1, p1AvX, p1AvY, avSize, p1Theme.accent, false);

    const p1TextX = p1AvX + avSize + 16;
    ctx.textAlign = 'left';
    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncate(ctx, user1.username, winner === 1 ? 140 : 210), p1TextX, topCardY + 30);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(p1RankStr, p1TextX, topCardY + 52);
    ctx.fillText(`${p1CountryRank} (${p1CountryCode})`, p1TextX, topCardY + 72);

    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = p1Theme.accent;
    ctx.fillText(`${p1PpTotal.toLocaleString()} pp`, p1TextX, topCardY + 94);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${p1HitAcc}% Acc`, p1TextX, topCardY + 114);

    if (winner === 1) {
      drawWinnerBadge(ctx, p1X + topCardW - 104, topCardY + 12, 'WINNER', icoCrown);
    }

    // Player 2 Card (Right - RATA KANAN)
    ctx.save();
    ctx.fillStyle = winner === 2 ? p2Theme.bgTint : 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.roundRect(p2X, topCardY, topCardW, topCardH, 18);
    ctx.fill();
    ctx.strokeStyle = winner === 2 ? p2Theme.border : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = winner === 2 ? 1.8 : 1;
    if (winner === 2) {
      ctx.shadowColor = p2Theme.glow;
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    const p2AvX = p2X + topCardW - 18 - avSize;
    const p2AvY = topCardY + 28;
    await drawPlayerAvatar(ctx, user2, p2AvX, p2AvY, avSize, p2Theme.accent, true);

    const p2TextX = p2AvX - 16;
    ctx.textAlign = 'right';
    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncate(ctx, user2.username, winner === 2 ? 140 : 210), p2TextX, topCardY + 30);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(p2RankStr, p2TextX, topCardY + 52);
    ctx.fillText(`${p2CountryRank} (${p2CountryCode})`, p2TextX, topCardY + 72);

    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = p2Theme.accent;
    ctx.fillText(`${p2PpTotal.toLocaleString()} pp`, p2TextX, topCardY + 94);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${p2HitAcc}% Acc`, p2TextX, topCardY + 114);

    if (winner === 2) {
      drawWinnerBadge(ctx, p2X + 16, topCardY + 12, 'WINNER', icoCrown);
    }

    // 3. MIDDLE CARD: ONE BIG UNIFIED CONTAINER WITH 2 VERTICAL DIVIDER LINES
    const midCardY = topCardY + topCardH + 18; // 310
    const midCardH = 556;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(headerX, midCardY, headerW, midCardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Two vertical lines down the middle
    const colW = 210;
    const lineX1 = centerX - (colW / 2); // 345
    const lineX2 = centerX + (colW / 2); // 555
    const lineStartY = midCardY + 16;
    const lineEndY = midCardY + midCardH - 16;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lineX1, lineStartY);
    ctx.lineTo(lineX1, lineEndY);
    ctx.moveTo(lineX2, lineStartY);
    ctx.lineTo(lineX2, lineEndY);
    ctx.stroke();
    ctx.restore();

    const s1Mods = formatMods(Array.isArray(score1?.mods) ? score1.mods : parseMods(score1?.mods));
    const s2Mods = formatMods(Array.isArray(score2?.mods) ? score2.mods : parseMods(score2?.mods));
    const s1Grade = getRankGradeStyle(score1?.rank || 'F');
    const s2Grade = getRankGradeStyle(score2?.rank || 'F');

    const scoreMetrics = [
      {
        name: isId ? 'Total Skor' : 'Total Score',
        short: 'SCORE',
        v1: s1Score,
        v2: s2Score,
        fmt: (v) => v ? v.toLocaleString() : '-',
        isP1Win: s1Score > s2Score,
        isP2Win: s2Score > s1Score
      },
      {
        name: 'Performance',
        short: 'PP',
        v1: s1Pp,
        v2: s2Pp,
        fmt: (v) => `${v.toLocaleString()} pp`,
        isP1Win: s1Pp > s2Pp,
        isP2Win: s2Pp > s1Pp
      },
      {
        name: isId ? 'Akurasi' : 'Hit Accuracy',
        short: 'ACC',
        v1: Number(s1Acc),
        v2: Number(s2Acc),
        fmt: (v) => `${v.toFixed(2)}%`,
        isP1Win: Number(s1Acc) > Number(s2Acc),
        isP2Win: Number(s2Acc) > Number(s1Acc)
      },
      {
        name: 'Max Combo',
        short: 'COMBO',
        v1: score1?.max_combo || 0,
        v2: score2?.max_combo || 0,
        fmt: (v) => `${v.toLocaleString()}x`,
        isP1Win: (score1?.max_combo || 0) > (score2?.max_combo || 0),
        isP2Win: (score2?.max_combo || 0) > (score1?.max_combo || 0)
      },
      {
        name: isId ? 'Grade & Mod' : 'Grade & Mods',
        short: 'MODS',
        v1: score1 ? `[${s1Grade.label}] ${s1Mods}` : '-',
        v2: score2 ? `[${s2Grade.label}] ${s2Mods}` : '-',
        raw: true,
        isP1Win: winner === 1,
        isP2Win: winner === 2
      },
      {
        name: 'Miss Count',
        short: 'MISS',
        v1: score1?.statistics?.count_miss || 0,
        v2: score2?.statistics?.count_miss || 0,
        fmt: (v) => `${v} miss`,
        isP1Win: (score1?.statistics?.count_miss || 0) < (score2?.statistics?.count_miss || 0),
        isP2Win: (score2?.statistics?.count_miss || 0) < (score1?.statistics?.count_miss || 0)
      },
      {
        name: '300 / 100 / 50',
        short: 'HITS',
        v1: score1 ? `${score1.statistics?.count_300 || 0} / ${score1.statistics?.count_100 || 0} / ${score1.statistics?.count_50 || 0}` : '-',
        v2: score2 ? `${score2.statistics?.count_300 || 0} / ${score2.statistics?.count_100 || 0} / ${score2.statistics?.count_50 || 0}` : '-',
        raw: true,
        isP1Win: false,
        isP2Win: false
      }
    ];

    const rowH = (midCardH - 32) / scoreMetrics.length; // ~74.8px

    for (let i = 0; i < scoreMetrics.length; i++) {
      const item = scoreMetrics[i];
      const rowCenterY = midCardY + 16 + (i * rowH) + (rowH / 2);
      const isP1Win = item.isP1Win;
      const isP2Win = item.isP2Win;
      const isTie = !isP1Win && !isP2Win;

      // Soft row highlight
      if (isP1Win) {
        const leftGrad = ctx.createLinearGradient(headerX, rowCenterY - (rowH / 2), lineX1, rowCenterY - (rowH / 2));
        leftGrad.addColorStop(0, p1Theme.bgTint);
        leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(headerX + 2, rowCenterY - (rowH / 2), lineX1 - headerX - 2, rowH);
      } else if (isP2Win) {
        const rightGrad = ctx.createLinearGradient(lineX2, rowCenterY - (rowH / 2), headerX + headerW, rowCenterY - (rowH / 2));
        rightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rightGrad.addColorStop(1, p2Theme.bgTint);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(lineX2, rowCenterY - (rowH / 2), (headerX + headerW) - lineX2 - 2, rowH);
      }

      // Center Metric Label
      ctx.textAlign = 'center';
      ctx.font = `bold 14px ${FONT_STACK}`;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(item.name, centerX, rowCenterY + 5);

      // Player 1 Value (Left)
      const p1ValStr = item.raw ? String(item.v1) : item.fmt(item.v1);
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = `bold 19px ${FONT_STACK}`;
      ctx.fillStyle = isP1Win ? p1Theme.accent : (isTie ? '#cbd5e1' : '#94a3b8');
      if (isP1Win) {
        ctx.shadowColor = p1Theme.glow;
        ctx.shadowBlur = 8;
        ctx.fillText(`${p1ValStr}   ▲`, headerX + 28, rowCenterY + 6);
      } else {
        ctx.fillText(p1ValStr, headerX + 28, rowCenterY + 6);
      }
      ctx.restore();

      // Player 2 Value (Right - Rata Kanan)
      const p2ValStr = item.raw ? String(item.v2) : item.fmt(item.v2);
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = `bold 19px ${FONT_STACK}`;
      ctx.fillStyle = isP2Win ? p2Theme.accent : (isTie ? '#cbd5e1' : '#94a3b8');
      if (isP2Win) {
        ctx.shadowColor = p2Theme.glow;
        ctx.shadowBlur = 8;
        ctx.fillText(`▲   ${p2ValStr}`, headerX + headerW - 28, rowCenterY + 6);
      } else {
        ctx.fillText(p2ValStr, headerX + headerW - 28, rowCenterY + 6);
      }
      ctx.restore();

      // Subtle horizontal divider guide
      if (i < scoreMetrics.length - 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(headerX + 16, rowCenterY + (rowH / 2));
        ctx.lineTo(headerX + headerW - 16, rowCenterY + (rowH / 2));
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. BOTTOM ROUNDED RECTANGLE CARD WITH 7 BLOCKS
    const bottomCardY = midCardY + midCardH + 18; // 884
    const bottomCardH = 176;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(headerX, bottomCardY, headerW, bottomCardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Winner Headline
    let verdictTitle = '';
    let verdictColor = '#ffffff';
    let verdictIcon = icoTrophy;
    if (winner === 1) {
      verdictTitle = isId ? `${user1.username} MEMENANGKAN DUEL BEATMAP` : `${user1.username} WON THIS BEATMAP DUEL`;
      verdictColor = p1Theme.accent;
    } else if (winner === 2) {
      verdictTitle = isId ? `${user2.username} MEMENANGKAN DUEL BEATMAP` : `${user2.username} WON THIS BEATMAP DUEL`;
      verdictColor = p2Theme.accent;
    } else {
      verdictTitle = isId ? 'DUEL BEATMAP SERI' : 'BEATMAP DUEL TIED';
      verdictColor = '#facc15';
      verdictIcon = icoSwords;
    }

    ctx.font = `bold 18px ${FONT_STACK}`;
    const vTitleW = ctx.measureText(verdictTitle).width;
    const vIconW = verdictIcon ? 28 : 0;
    const vTotalW = vTitleW + vIconW;
    const vStartX = centerX - (vTotalW / 2);

    if (verdictIcon) {
      ctx.drawImage(verdictIcon, vStartX, bottomCardY + 18, 20, 20);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = verdictColor;
    ctx.fillText(verdictTitle, vStartX + vIconW, bottomCardY + 34);

    const scoreDiff = Math.abs(s1Score - s2Score);
    const ppDiff = Math.abs(s1Pp - s2Pp);
    ctx.font = `500 13px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    if (score1 && score2) {
      ctx.fillText(`${isId ? 'Selisih Skor' : 'Score Lead'}: +${scoreDiff.toLocaleString()} pts   •   ${isId ? 'Selisih PP' : 'PP Diff'}: +${ppDiff} pp`, centerX, bottomCardY + 58);
    } else {
      ctx.fillText(isId ? 'Hanya satu pemain yang memiliki skor tercatat' : 'Only one player has a recorded score on this map', centerX, bottomCardY + 58);
    }

    // 7 Blocks
    const blockAreaW = 744;
    const blockGap = 12;
    const blockW = Math.floor((blockAreaW - (blockGap * 6)) / 7); // ~96px
    const blockStartX = centerX - (blockAreaW / 2);
    const blockH = 34;

    for (let k = 0; k < scoreMetrics.length; k++) {
      const item = scoreMetrics[k];
      const bX = blockStartX + k * (blockW + blockGap);

      ctx.font = `bold 11px ${FONT_STACK}`;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(item.short, bX + (blockW / 2), bottomCardY + 88);

      ctx.save();
      let blockBg = 'rgba(255, 255, 255, 0.08)';
      let blockBorder = 'rgba(255, 255, 255, 0.1)';
      let blockText = 'TIE';
      let blockTextColor = '#94a3b8';

      if (item.isP1Win) {
        blockBg = p1Theme.accent;
        blockBorder = p1Theme.border;
        blockText = truncate(ctx, user1.username, 80);
        blockTextColor = p1Theme.contrastText;
        ctx.shadowColor = p1Theme.glow;
        ctx.shadowBlur = 8;
      } else if (item.isP2Win) {
        blockBg = p2Theme.accent;
        blockBorder = p2Theme.border;
        blockText = truncate(ctx, user2.username, 80);
        blockTextColor = p2Theme.contrastText;
        ctx.shadowColor = p2Theme.glow;
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = blockBg;
      ctx.beginPath();
      ctx.roundRect(bX, bottomCardY + 98, blockW, blockH, 8);
      ctx.fill();
      ctx.strokeStyle = blockBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${blockText.length > 9 ? 10 : 11}px ${FONT_STACK}`;
      ctx.fillStyle = blockTextColor;
      ctx.fillText(blockText, bX + (blockW / 2), bottomCardY + 98 + (blockH / 2));
      ctx.restore();
    }

    ctx.textAlign = 'right';
    ctx.font = `bold 12px ${FONT_STACK}`;
    ctx.fillStyle = p1Theme.accent;
    ctx.fillText(`${user1.username} (${s1Score > s2Score ? 'LEAD' : 'SCORE'})`, centerX - 18, bottomCardY + 154);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('•', centerX, bottomCardY + 154);
    ctx.textAlign = 'left';
    ctx.fillStyle = p2Theme.accent;
    ctx.fillText(`${user2.username} (${s2Score > s1Score ? 'LEAD' : 'SCORE'})`, centerX + 18, bottomCardY + 154);

    // 5. FOOTER WITH CIRCULAR COLUMBINA BOBA ICON BESIDE CREDIT
    const footerY = 1118;
    const footerText = 'Columbina Bot • osu! Head-to-Head Versus Duel';
    ctx.font = `500 13px ${FONT_STACK}`;
    const fTextW = ctx.measureText(footerText).width;
    const bobaSize = 28;
    const fTotalW = bobaSize + 12 + fTextW;
    const fStartX = centerX - (fTotalW / 2);

    if (bobaImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(fStartX + (bobaSize / 2), footerY + (bobaSize / 2), bobaSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(bobaImg, fStartX, footerY, bobaSize, bobaSize);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fStartX + (bobaSize / 2), footerY + (bobaSize / 2), bobaSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `500 13px ${FONT_STACK}`;
    const textStartX = bobaImg ? (fStartX + bobaSize + 12) : fStartX;
    ctx.fillText(footerText, textStartX, footerY + 18);

  // =========================================================================
  // MODE B: PROFILE VERSUS (Comparing general user profiles - Exactly matching user wireframe)
  // =========================================================================
  } else {
    // 1. TOP TITLE (Wireframe: Head-To-Head Osu! Profile Showdown)
    const headerY = 32;

    const titleText = isId ? 'Head-To-Head Osu! Profile Showdown' : 'Head-To-Head Osu! Profile Showdown';
    ctx.font = `bold 24px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(titleText, centerX, headerY + 28);

    ctx.font = `500 13px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(isId ? 'Perbandingan Statistik Bancho & Performa' : 'Comparing Bancho Statistics & Performance Metrics', centerX, headerY + 52);

    // Metrics array to compare
    const metrics = [
      {
        name: isId ? 'Global Rank' : 'Global Rank',
        short: 'RANK',
        v1: user1.statistics?.global_rank || 9999999,
        v2: user2.statistics?.global_rank || 9999999,
        invert: true,
        fmt: (v) => v ? `#${v.toLocaleString()}` : '#-'
      },
      {
        name: 'Total PP',
        short: 'PP',
        v1: Math.round(user1.statistics?.pp || 0),
        v2: Math.round(user2.statistics?.pp || 0),
        fmt: (v) => `${v.toLocaleString()} pp`
      },
      {
        name: isId ? 'Hit Accuracy' : 'Hit Accuracy',
        short: 'ACC',
        v1: Number(user1.statistics?.hit_accuracy || 0),
        v2: Number(user2.statistics?.hit_accuracy || 0),
        fmt: (v) => `${v.toFixed(2)}%`
      },
      {
        name: isId ? 'Play Time' : 'Play Time',
        short: 'TIME',
        v1: user1.statistics?.play_time || 0,
        v2: user2.statistics?.play_time || 0,
        fmt: (v) => `${Math.floor(v / 3600)}h`
      },
      {
        name: 'Play Count',
        short: 'PLAYS',
        v1: user1.statistics?.play_count || 0,
        v2: user2.statistics?.play_count || 0,
        fmt: (v) => v.toLocaleString()
      },
      {
        name: isId ? 'Ranked Score' : 'Ranked Score',
        short: 'SCORE',
        v1: user1.statistics?.ranked_score || 0,
        v2: user2.statistics?.ranked_score || 0,
        fmt: (v) => formatCompactNumber(v)
      },
      {
        name: isId ? 'Total SS & S grades' : 'Total SS & S grades',
        short: 'GRADES',
        v1: (user1.statistics?.grade_counts?.ss || 0) + (user1.statistics?.grade_counts?.ssh || 0) + (user1.statistics?.grade_counts?.s || 0) + (user1.statistics?.grade_counts?.sh || 0),
        v2: (user2.statistics?.grade_counts?.ss || 0) + (user2.statistics?.grade_counts?.ssh || 0) + (user2.statistics?.grade_counts?.s || 0) + (user2.statistics?.grade_counts?.sh || 0),
        fmt: (v) => `${v.toLocaleString()}`
      }
    ];

    let p1Wins = 0;
    let p2Wins = 0;
    for (const m of metrics) {
      if (m.invert) {
        if (m.v1 < m.v2) p1Wins++;
        else if (m.v2 < m.v1) p2Wins++;
      } else {
        if (m.v1 > m.v2) p1Wins++;
        else if (m.v2 > m.v1) p2Wins++;
      }
    }

    const overallWinner = p1Wins > p2Wins ? 1 : p2Wins > p1Wins ? 2 : 'tie';

    // 2. TOP PLAYER CARDS (Wireframe: [Nama], #Rank, #Rank(Country), #PP, #Acc)
    const topCardY = headerY + 68; // 100
    const topCardH = 136;
    const topCardW = 390;
    const p1X = headerX;
    const p2X = headerX + headerW - topCardW; // 474

    const p1RankStr = user1.statistics?.global_rank ? `#${user1.statistics.global_rank.toLocaleString()}` : '#-';
    const p2RankStr = user2.statistics?.global_rank ? `#${user2.statistics.global_rank.toLocaleString()}` : '#-';
    const p1CountryRank = user1.statistics?.country_rank ? `#${user1.statistics.country_rank.toLocaleString()}` : '#-';
    const p2CountryRank = user2.statistics?.country_rank ? `#${user2.statistics.country_rank.toLocaleString()}` : '#-';
    const p1CountryCode = user1.country?.code || '';
    const p2CountryCode = user2.country?.code || '';
    const p1PpTotal = Math.round(Number(user1.statistics?.pp || 0));
    const p2PpTotal = Math.round(Number(user2.statistics?.pp || 0));
    const p1HitAcc = Number(user1.statistics?.hit_accuracy || 0).toFixed(2);
    const p2HitAcc = Number(user2.statistics?.hit_accuracy || 0).toFixed(2);

    // Player 1 Card (Left - Avatar on Left, Text on Right)
    ctx.save();
    ctx.fillStyle = overallWinner === 1 ? p1Theme.bgTint : 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.roundRect(p1X, topCardY, topCardW, topCardH, 18);
    ctx.fill();
    ctx.strokeStyle = overallWinner === 1 ? p1Theme.border : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = overallWinner === 1 ? 1.8 : 1;
    if (overallWinner === 1) {
      ctx.shadowColor = p1Theme.glow;
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    const avSize = 78;
    const p1AvX = p1X + 18;
    const p1AvY = topCardY + 28;
    await drawPlayerAvatar(ctx, user1, p1AvX, p1AvY, avSize, p1Theme.accent, false);

    const p1TextX = p1AvX + avSize + 16;
    ctx.textAlign = 'left';
    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncate(ctx, user1.username, overallWinner === 1 ? 140 : 210), p1TextX, topCardY + 30);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(p1RankStr, p1TextX, topCardY + 52);
    ctx.fillText(`${p1CountryRank} (${p1CountryCode})`, p1TextX, topCardY + 72);

    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = p1Theme.accent;
    ctx.fillText(`${p1PpTotal.toLocaleString()} pp`, p1TextX, topCardY + 94);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${p1HitAcc}% Acc`, p1TextX, topCardY + 114);

    if (overallWinner === 1) {
      drawWinnerBadge(ctx, p1X + topCardW - 104, topCardY + 12, `${p1Wins} WINS`, icoCrown);
    }

    // Player 2 Card (Right - Text on Left, Avatar on Right - RATA KANAN)
    ctx.save();
    ctx.fillStyle = overallWinner === 2 ? p2Theme.bgTint : 'rgba(15, 23, 42, 0.6)';
    ctx.beginPath();
    ctx.roundRect(p2X, topCardY, topCardW, topCardH, 18);
    ctx.fill();
    ctx.strokeStyle = overallWinner === 2 ? p2Theme.border : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = overallWinner === 2 ? 1.8 : 1;
    if (overallWinner === 2) {
      ctx.shadowColor = p2Theme.glow;
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.restore();

    const p2AvX = p2X + topCardW - 18 - avSize;
    const p2AvY = topCardY + 28;
    await drawPlayerAvatar(ctx, user2, p2AvX, p2AvY, avSize, p2Theme.accent, true);

    const p2TextX = p2AvX - 16;
    ctx.textAlign = 'right';
    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncate(ctx, user2.username, overallWinner === 2 ? 140 : 210), p2TextX, topCardY + 30);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(p2RankStr, p2TextX, topCardY + 52);
    ctx.fillText(`${p2CountryRank} (${p2CountryCode})`, p2TextX, topCardY + 72);

    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = p2Theme.accent;
    ctx.fillText(`${p2PpTotal.toLocaleString()} pp`, p2TextX, topCardY + 94);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`${p2HitAcc}% Acc`, p2TextX, topCardY + 114);

    if (overallWinner === 2) {
      drawWinnerBadge(ctx, p2X + 16, topCardY + 12, `${p2Wins} WINS`, icoCrown);
    }

    // 3. MIDDLE CARD: ONE BIG UNIFIED CONTAINER WITH 2 VERTICAL DIVIDER LINES
    const midCardY = topCardY + topCardH + 18; // 254
    const midCardH = 580;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(headerX, midCardY, headerW, midCardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Two vertical lines down the middle
    const colW = 210;
    const lineX1 = centerX - (colW / 2); // 345
    const lineX2 = centerX + (colW / 2); // 555
    const lineStartY = midCardY + 16;
    const lineEndY = midCardY + midCardH - 16;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lineX1, lineStartY);
    ctx.lineTo(lineX1, lineEndY);
    ctx.moveTo(lineX2, lineStartY);
    ctx.lineTo(lineX2, lineEndY);
    ctx.stroke();
    ctx.restore();

    const rowH = (midCardH - 32) / metrics.length; // ~78.2px

    for (let i = 0; i < metrics.length; i++) {
      const item = metrics[i];
      const v1 = item.v1;
      const v2 = item.v2;
      const isP1Win = item.invert ? v1 < v2 : v1 > v2;
      const isP2Win = item.invert ? v2 < v1 : v2 > v1;
      const isTie = !isP1Win && !isP2Win;
      const rowCenterY = midCardY + 16 + (i * rowH) + (rowH / 2);

      // Soft row highlight
      if (isP1Win) {
        const leftGrad = ctx.createLinearGradient(headerX, rowCenterY - (rowH / 2), lineX1, rowCenterY - (rowH / 2));
        leftGrad.addColorStop(0, p1Theme.bgTint);
        leftGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(headerX + 2, rowCenterY - (rowH / 2), lineX1 - headerX - 2, rowH);
      } else if (isP2Win) {
        const rightGrad = ctx.createLinearGradient(lineX2, rowCenterY - (rowH / 2), headerX + headerW, rowCenterY - (rowH / 2));
        rightGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        rightGrad.addColorStop(1, p2Theme.bgTint);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(lineX2, rowCenterY - (rowH / 2), (headerX + headerW) - lineX2 - 2, rowH);
      }

      // Center Metric Label (Centered between lineX1 and lineX2)
      ctx.textAlign = 'center';
      ctx.font = `bold 14px ${FONT_STACK}`;
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(item.name, centerX, rowCenterY + 5);

      // Player 1 Value (Left)
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = `bold 19px ${FONT_STACK}`;
      ctx.fillStyle = isP1Win ? p1Theme.accent : (isTie ? '#cbd5e1' : '#94a3b8');
      if (isP1Win) {
        ctx.shadowColor = p1Theme.glow;
        ctx.shadowBlur = 8;
        ctx.fillText(`${item.fmt(v1)}   ▲`, headerX + 28, rowCenterY + 6);
      } else {
        ctx.fillText(item.fmt(v1), headerX + 28, rowCenterY + 6);
      }
      ctx.restore();

      // Player 2 Value (Right - Rata Kanan)
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = `bold 19px ${FONT_STACK}`;
      ctx.fillStyle = isP2Win ? p2Theme.accent : (isTie ? '#cbd5e1' : '#94a3b8');
      if (isP2Win) {
        ctx.shadowColor = p2Theme.glow;
        ctx.shadowBlur = 8;
        ctx.fillText(`▲   ${item.fmt(v2)}`, headerX + headerW - 28, rowCenterY + 6);
      } else {
        ctx.fillText(item.fmt(v2), headerX + headerW - 28, rowCenterY + 6);
      }
      ctx.restore();

      // Subtle horizontal divider guide
      if (i < metrics.length - 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(headerX + 16, rowCenterY + (rowH / 2));
        ctx.lineTo(headerX + headerW - 16, rowCenterY + (rowH / 2));
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. BOTTOM ROUNDED RECTANGLE CARD WITH 7 BLOCKS (Wireframe: One Rounded Card with 7 Blocks)
    const bottomCardY = midCardY + midCardH + 18; // 852
    const bottomCardH = 176;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(headerX, bottomCardY, headerW, bottomCardH, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Winner Headline
    let verdictTitle = '';
    let verdictColor = '#ffffff';
    let verdictIcon = icoTrophy;
    if (overallWinner === 1) {
      verdictTitle = isId ? `${user1.username} MEMENANGKAN DUEL PROFIL (${p1Wins} - ${p2Wins})` : `${user1.username} WINS THE PROFILE DUEL (${p1Wins} - ${p2Wins})`;
      verdictColor = p1Theme.accent;
    } else if (overallWinner === 2) {
      verdictTitle = isId ? `${user2.username} MEMENANGKAN DUEL PROFIL (${p2Wins} - ${p1Wins})` : `${user2.username} WINS THE PROFILE DUEL (${p2Wins} - ${p1Wins})`;
      verdictColor = p2Theme.accent;
    } else {
      verdictTitle = isId ? `HASIL DUEL SERI (${p1Wins} - ${p2Wins})` : `DUEL TIED IN A DRAW (${p1Wins} - ${p2Wins})`;
      verdictColor = '#facc15';
      verdictIcon = icoSwords;
    }

    ctx.font = `bold 18px ${FONT_STACK}`;
    const vTitleW = ctx.measureText(verdictTitle).width;
    const vIconW = verdictIcon ? 28 : 0;
    const vTotalW = vTitleW + vIconW;
    const vStartX = centerX - (vTotalW / 2);

    if (verdictIcon) {
      ctx.drawImage(verdictIcon, vStartX, bottomCardY + 18, 20, 20);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = verdictColor;
    ctx.fillText(verdictTitle, vStartX + vIconW, bottomCardY + 34);

    // Subtitle
    const leadCount = Math.max(p1Wins, p2Wins);
    const leaderName = overallWinner === 1 ? user1.username : user2.username;
    ctx.font = `500 13px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    if (overallWinner !== 'tie') {
      ctx.fillText(isId ? `${leaderName} unggul dalam ${leadCount} dari ${metrics.length} metrik statistik Bancho` : `${leaderName} leads in ${leadCount} out of ${metrics.length} Bancho performance metrics`, centerX, bottomCardY + 58);
    } else {
      ctx.fillText(isId ? `Kedua pemain seimbang dengan ${p1Wins} kemenangan metrik masing-masing` : `Both players tied with ${p1Wins} category wins each`, centerX, bottomCardY + 58);
    }

    // 7 Blocks
    const blockAreaW = 744;
    const blockGap = 12;
    const blockW = Math.floor((blockAreaW - (blockGap * 6)) / 7); // ~96px
    const blockStartX = centerX - (blockAreaW / 2);
    const blockH = 34;

    for (let k = 0; k < metrics.length; k++) {
      const item = metrics[k];
      const isP1Win = item.invert ? item.v1 < item.v2 : item.v1 > item.v2;
      const isP2Win = item.invert ? item.v2 < item.v1 : item.v2 > item.v1;
      const bX = blockStartX + k * (blockW + blockGap);

      // Label above block
      ctx.font = `bold 11px ${FONT_STACK}`;
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(item.short, bX + (blockW / 2), bottomCardY + 88);

      // Block Pill
      ctx.save();
      let blockBg = 'rgba(255, 255, 255, 0.08)';
      let blockBorder = 'rgba(255, 255, 255, 0.1)';
      let blockText = 'TIE';
      let blockTextColor = '#94a3b8';

      if (isP1Win) {
        blockBg = p1Theme.accent;
        blockBorder = p1Theme.border;
        blockText = truncate(ctx, user1.username, 80);
        blockTextColor = p1Theme.contrastText;
        ctx.shadowColor = p1Theme.glow;
        ctx.shadowBlur = 8;
      } else if (isP2Win) {
        blockBg = p2Theme.accent;
        blockBorder = p2Theme.border;
        blockText = truncate(ctx, user2.username, 80);
        blockTextColor = p2Theme.contrastText;
        ctx.shadowColor = p2Theme.glow;
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = blockBg;
      ctx.beginPath();
      ctx.roundRect(bX, bottomCardY + 98, blockW, blockH, 8);
      ctx.fill();
      ctx.strokeStyle = blockBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${blockText.length > 9 ? 10 : 11}px ${FONT_STACK}`;
      ctx.fillStyle = blockTextColor;
      ctx.fillText(blockText, bX + (blockW / 2), bottomCardY + 98 + (blockH / 2));
      ctx.restore();
    }

    // Score comparison summary pill under the blocks
    ctx.textAlign = 'right';
    ctx.font = `bold 12px ${FONT_STACK}`;
    ctx.fillStyle = p1Theme.accent;
    ctx.fillText(`${user1.username} (${p1Wins} WINS)`, centerX - 18, bottomCardY + 154);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('•', centerX, bottomCardY + 154);
    ctx.textAlign = 'left';
    ctx.fillStyle = p2Theme.accent;
    ctx.fillText(`${user2.username} (${p2Wins} WINS)`, centerX + 18, bottomCardY + 154);

    // 5. FOOTER WITH CIRCULAR COLUMBINA BOBA ICON BESIDE CREDIT
    const footerY = 1118;
    const footerText = 'Columbina Bot • osu! Head-to-Head Versus Duel';
    ctx.font = `500 13px ${FONT_STACK}`;
    const fTextW = ctx.measureText(footerText).width;
    const bobaSize = 28;
    const fTotalW = bobaSize + 12 + fTextW;
    const fStartX = centerX - (fTotalW / 2);

    if (bobaImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(fStartX + (bobaSize / 2), footerY + (bobaSize / 2), bobaSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(bobaImg, fStartX, footerY, bobaSize, bobaSize);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fStartX + (bobaSize / 2), footerY + (bobaSize / 2), bobaSize / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `500 13px ${FONT_STACK}`;
    const textStartX = bobaImg ? (fStartX + bobaSize + 12) : fStartX;
    ctx.fillText(footerText, textStartX, footerY + 18);
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateVersusCard
};
