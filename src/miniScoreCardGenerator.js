const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const {
  formatDuration,
  getStarRatingColor,
  getStatusBadge,
  getModeName,
  getRankGradeStyle,
  formatRelativeTime,
  parseMods,
  calculateModdedStats,
  isFullCombo,
  getLazerModBadges
} = require('./utils');
const { calculateScorePp } = require('./ppCalculator');

// Register Torus Font family
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Regular.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-SemiBold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Bold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Heavy.otf'), 'Torus');
} catch (e) {
  console.warn('Gagal memuat font Torus dari assets/fonts, menggunakan fallback.', e.message);
}

// Register CJK Fallback Fonts from Windows if available
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

function truncateText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = String(text);
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

function formatComboNumber(num) {
  if (num == null) return '0';
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function drawVectorStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
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
 * Generate a compact, modern Mini Score Card widget (640 x 360 px).
 * Perfectly centered layout, zero dead space, aesthetic glassmorphism.
 * 
 * @param {object} score - osu! score object
 * @param {object} user - osu! user profile object
 * @param {object} options - { lang, topRank, customFooter }
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateMiniScoreCard(score, user = {}, options = {}) {
  const lang = options.lang || 'en';
  // Compact true mini card dimensions
  const width = 640;
  const height = 360;
  const cardRadius = 18;
  const centerX = width / 2; // Exact center axis = 320

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clip to card rounded rectangle
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, cardRadius);
  ctx.clip();

  // 1. Dark Base Background
  ctx.fillStyle = '#06080e';
  ctx.fillRect(0, 0, width, height);

  const beatmap = score.beatmap || {};
  const set = score.beatmapset || beatmap.beatmapset || {};
  const mapStatus = String(beatmap.status || score.beatmap?.status || '').toLowerCase();
  const isRanked = mapStatus === 'ranked' || mapStatus === 'approved';

  // Calculate local PP if missing
  if (beatmap.id && (!score.pp || score.if_fc_pp == null)) {
    try {
      const calc = await calculateScorePp(score, beatmap);
      if (calc) {
        if (calc.pp != null && (!score.pp || !isRanked)) {
          score.pp = calc.pp;
        }
        score.is_unranked_pp = calc.isUnranked;
        if (calc.ifFcPp != null) {
          score.if_fc_pp = calc.ifFcPp;
        }
        if (calc.breakdown) {
          score.pp_breakdown = calc.breakdown;
        }
        if (calc.stars && !score.beatmap.modded_difficulty_rating) {
          score.beatmap.modded_difficulty_rating = calc.stars;
        }
      }
    } catch (_) {}
  }

  // Modded stats calculation
  const cleanMods = parseMods(score.mods);
  const modStats = calculateModdedStats(beatmap, score.mods, score.mode || beatmap.mode);
  const sr = Number(score.beatmap?.modded_difficulty_rating || modStats.sr || beatmap.difficulty_rating || 0);
  const srColor = getStarRatingColor(sr);

  // Full Combo determination
  const mapMaxCombo = beatmap.max_combo || beatmap.count_max_combo || 0;
  const isFc = isFullCombo(score, beatmap, mapMaxCombo);
  const stats = score.statistics || {};
  const missCount = stats.miss ?? stats.count_miss ?? 0;
  const scoreMaxCombo = score.max_combo || 0;
  // If 0 miss and within 2 combo of map max combo (dropped sliderend), treat as FC
  const isSliderendDrop = missCount === 0 && mapMaxCombo > 0 && scoreMaxCombo >= mapMaxCombo - 2;
  const isEffectiveFc = isFc || isSliderendDrop;

  // Load Beatmap Cover
  const coverUrl = (set.covers && (set.covers['cover@2x'] || set.covers.cover || set.covers['card@2x'])) ||
    (beatmap.beatmapset_id ? `https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover@2x.jpg` : null) ||
    (set.id ? `https://assets.ppy.sh/beatmaps/${set.id}/covers/cover@2x.jpg` : null);

  let coverImg = null;
  if (coverUrl) {
    try {
      coverImg = await loadImage(coverUrl);
    } catch (_) {}
  }

  // 2. AMBIENT BLURRED BACKGROUND (Full card depth)
  if (coverImg) {
    ctx.save();
    ctx.filter = 'blur(22px)';
    const aspect = coverImg.width / coverImg.height;
    let drawW = width + 40;
    let drawH = (width + 40) / aspect;
    if (drawH < height + 40) {
      drawH = height + 40;
      drawW = (height + 40) * aspect;
    }
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';
    ctx.restore();

    // Dark tint overlay over blurred background
    ctx.fillStyle = 'rgba(7, 9, 16, 0.80)';
    ctx.fillRect(0, 0, width, height);
  }

  // 3. TOP COVER BANNER (Upper 145px)
  const bannerH = 145;
  if (coverImg) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, bannerH);
    ctx.clip();

    const aspect = coverImg.width / coverImg.height;
    let drawW = width;
    let drawH = width / aspect;
    if (drawH < bannerH + 30) {
      drawH = bannerH + 30;
      drawW = (bannerH + 30) * aspect;
    }
    const drawX = (width - drawW) / 2;
    const drawY = (bannerH - drawH) / 2;
    ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);

    // Deep smooth gradient fade from cover to body
    const bannerFade = ctx.createLinearGradient(0, 0, 0, bannerH);
    bannerFade.addColorStop(0, 'rgba(6, 8, 14, 0.35)');
    bannerFade.addColorStop(0.35, 'rgba(6, 8, 14, 0.50)');
    bannerFade.addColorStop(0.75, 'rgba(7, 9, 16, 0.85)');
    bannerFade.addColorStop(1, 'rgba(7, 9, 16, 1.00)');
    ctx.fillStyle = bannerFade;
    ctx.fillRect(0, 0, width, bannerH);
    ctx.restore();
  }

  // 4. TOP BANNER ELEMENTS
  // 4A. Left: Combo Status ("FC" / "1x MISS" / "FAIL" / "PASS")
  ctx.save();
  let fcStatusText = 'FC';
  let fcStatusColor = '#fbbf24';
  let fcGlowColor = 'rgba(251, 191, 36, 0.65)';

  if (score.rank === 'F') {
    fcStatusText = 'FAIL';
    fcStatusColor = '#f87171';
    fcGlowColor = 'rgba(248, 113, 113, 0.55)';
  } else if (isEffectiveFc) {
    fcStatusText = 'FC';
    fcStatusColor = '#f59e0b';
    fcGlowColor = 'rgba(245, 158, 11, 0.75)';
  } else if (missCount > 0 && missCount <= 2) {
    fcStatusText = `${missCount}x MISS`;
    fcStatusColor = '#fb923c';
    fcGlowColor = 'rgba(251, 146, 60, 0.60)';
  } else if (missCount > 2) {
    fcStatusText = `${missCount}x MISS`;
    fcStatusColor = '#f43f5e';
    fcGlowColor = 'rgba(244, 63, 94, 0.60)';
  } else {
    fcStatusText = 'PASS';
    fcStatusColor = '#38bdf8';
    fcGlowColor = 'rgba(56, 189, 248, 0.50)';
  }

  ctx.shadowColor = fcGlowColor;
  ctx.shadowBlur = 16;
  ctx.font = `bold 40px ${FONT_STACK}`;
  ctx.fillStyle = fcStatusColor;
  ctx.textAlign = 'left';
  ctx.fillText(fcStatusText, 32, 80);
  ctx.restore();

  // 4B. Center: Star Rating Pill Badge (▲ 5.83) - Aligned to exact centerX
  const srValStr = sr.toFixed(2);
  ctx.font = `bold 15px ${FONT_STACK}`;
  const srNumW = ctx.measureText(srValStr).width;
  const srBadgeW = 28 + srNumW + 16;
  const srBadgeH = 30;
  const srBadgeX = centerX - (srBadgeW / 2);
  const srBadgeY = 56;

  ctx.save();
  ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
  ctx.beginPath();
  ctx.roundRect(srBadgeX, srBadgeY, srBadgeW, srBadgeH, 15);
  ctx.fill();

  ctx.shadowColor = srColor.glow || 'rgba(56, 189, 248, 0.35)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = srColor.border || 'rgba(56, 189, 248, 0.50)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Upward chevron symbol '▲'
  ctx.fillStyle = srColor.text;
  ctx.font = `bold 11px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('▲', srBadgeX + 14, srBadgeY + 19);

  // Star Rating number
  ctx.font = `bold 15px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(srValStr, srBadgeX + 25, srBadgeY + 21);
  ctx.restore();

  // 4C. Right: PP Value Display
  const isUnrankedPp = Boolean(score.is_unranked_pp || (!isRanked && score.pp));
  let ppText = '-';
  let ppTextColor = '#ffffff';

  if (score.rank === 'F') {
    ppText = 'FAILED';
    ppTextColor = '#f87171';
  } else if (score.pp != null && Number(score.pp) > 0) {
    ppText = `${Math.round(score.pp)}pp`;
    ppTextColor = isUnrankedPp ? 'rgba(203, 213, 225, 0.75)' : '#ffffff';
  }

  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = `bold ${ppText === 'FAILED' ? '28px' : '38px'} ${FONT_STACK}`;
  ctx.fillStyle = ppTextColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 12;
  ctx.fillText(ppText, width - 32, 80);
  ctx.shadowBlur = 0;

  // Subtitle under PP if choked/non-FC or unranked
  if (isUnrankedPp && ppText !== 'FAILED' && ppText !== '-') {
    ctx.font = `bold 10px ${FONT_STACK}`;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.fillText('UNRANKED', width - 32, 98);
  } else if (!isEffectiveFc && score.if_fc_pp && score.rank !== 'F') {
    const ifFcVal = Math.round(score.if_fc_pp);
    if (ifFcVal > Math.round(score.pp || 0)) {
      ctx.font = `600 11px ${FONT_STACK}`;
      ctx.fillStyle = '#38bdf8';
      const ifFcLabel = `if FC: ~${ifFcVal}pp`;
      ctx.fillText(ifFcLabel, width - 32, 98);
    }
  }
  ctx.restore();

  // 5. FLOATING PILLS ROW (Separator Bridge right at boundary y = 128 - 160)
  const pillY = 128;
  const pillH = 32;
  const pillRadius = 16;

  // Capsule 1: Combo (Left)
  let comboText;
  if (!isEffectiveFc && mapMaxCombo > 0) {
    comboText = `${formatComboNumber(scoreMaxCombo)} / ${formatComboNumber(mapMaxCombo)}x`;
  } else {
    comboText = `${formatComboNumber(scoreMaxCombo)}x`;
  }

  // Capsule 2: Difficulty [Version] (Center)
  const diffVersionText = `[${beatmap.version || 'Normal'}]`;

  // Capsule 3: BPM (Right)
  const displayBpm = modStats.bpm || Math.round(beatmap.bpm || set.bpm || 0);
  const bpmText = `${displayBpm}bpm`;

  ctx.font = `bold 12px ${FONT_STACK}`;
  const comboW = Math.max(90, ctx.measureText(comboText).width + 26);
  const bpmW = Math.max(80, ctx.measureText(bpmText).width + 26);

  // Maximum allowed center pill width to avoid overlapping left and right pills
  const maxCenterW = width - (comboW + bpmW) - 100;
  const truncatedDiff = truncateText(ctx, diffVersionText, maxCenterW);
  const diffW = ctx.measureText(truncatedDiff).width + 26;

  const leftPillX = 32;
  const centerPillX = centerX - (diffW / 2); // Exact horizontal center
  const rightPillX = width - 32 - bpmW;

  const pills = [
    { x: leftPillX, w: comboW, text: comboText, color: isEffectiveFc ? '#4ade80' : '#f8fafc', isCenter: false },
    { x: centerPillX, w: diffW, text: truncatedDiff, color: '#f1f5f9', isCenter: true },
    { x: rightPillX, w: bpmW, text: bpmText, color: '#38bdf8', isCenter: false }
  ];

  for (const p of pills) {
    ctx.save();
    const pillGrad = ctx.createLinearGradient(p.x, pillY, p.x, pillY + pillH);
    pillGrad.addColorStop(0, 'rgba(15, 20, 34, 0.94)');
    pillGrad.addColorStop(1, 'rgba(8, 11, 20, 0.96)');
    ctx.fillStyle = pillGrad;
    ctx.beginPath();
    ctx.roundRect(p.x, pillY, p.w, pillH, pillRadius);
    ctx.fill();

    ctx.strokeStyle = p.isCenter ? 'rgba(168, 85, 247, 0.50)' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = `bold 12px ${FONT_STACK}`;
    ctx.fillStyle = p.color;
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x + (p.w / 2), pillY + 20);
    ctx.restore();
  }

  // 6. LOWER BODY SECTION
  // 6A. Left Side: Grade Letter (SS, S, A, B, etc.)
  const gradeInfo = getRankGradeStyle(score.rank);
  const gradeCenterX = 85;
  const gradeCenterY = 252;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `bold 78px ${FONT_STACK}`;

  ctx.shadowColor = gradeInfo.glow;
  ctx.shadowBlur = 20;
  ctx.fillStyle = gradeInfo.color;
  ctx.fillText(gradeInfo.label, gradeCenterX, gradeCenterY);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
  ctx.lineWidth = 1.3;
  ctx.strokeText(gradeInfo.label, gradeCenterX, gradeCenterY);
  ctx.restore();

  // 6B. Center Section: Beatmap Title & Artist (Directly below center pill at centerX)
  const titleY = 190;
  const mapTitle = set.title || set.title_unicode || 'Untitled';
  const mapArtist = set.artist || set.artist_unicode || 'Unknown Artist';

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `bold 22px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 8;
  const maxTitleW = 420;
  ctx.fillText(truncateText(ctx, mapTitle, maxTitleW), centerX, titleY);
  ctx.shadowBlur = 0;

  ctx.font = `500 12px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(truncateText(ctx, `by ${mapArtist}`, maxTitleW), centerX, titleY + 18);
  ctx.restore();

  // 6C. Player & Performance Stats Cluster (Acc + Rank | Avatar + Flag | User + Mods)
  // Aligned on exact centerX
  const clusterY = 224;
  const avatarSize = 54;
  const avatarX = centerX - (avatarSize / 2);
  const avatarY = clusterY;

  // Draw Player Avatar
  const playerUser = score.user || user || {};
  const avatarUrl = playerUser.avatar_url || `https://a.ppy.sh/${playerUser.id || 1}`;

  let avImg = null;
  try {
    avImg = await loadImage(avatarUrl);
  } catch (_) {}

  ctx.save();
  if (avImg) {
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 13);
    ctx.clip();
    ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 13);
    ctx.fill();
  }
  ctx.restore();

  // Avatar Border Ring
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 13);
  ctx.stroke();
  ctx.restore();

  // Overlaid Country Flag at the bottom-center of the Avatar (Pin badge)
  const countryCode = playerUser.country?.code || playerUser.country_code || user.country?.code || user.country_code;
  if (countryCode && typeof countryCode === 'string') {
    const flagW = 25;
    const flagH = 16;
    const flagX = centerX - (flagW / 2);
    const flagY = avatarY + avatarSize - (flagH / 2) + 2;

    try {
      const flagUrl = `https://osu.ppy.sh/images/flags/${countryCode.toUpperCase()}.png`;
      const flagImg = await loadImage(flagUrl);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect(flagX, flagY, flagW, flagH, 3);
      ctx.clip();
      ctx.drawImage(flagImg, flagX, flagY, flagW, flagH);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    } catch (_) {}
  }

  // Left of Avatar: Accuracy & Leaderboard/Top Rank
  const accVal = `${((score.accuracy || 0) * 100).toFixed(2)}%`;
  const leftClusterX = avatarX - 16; // Aligned right towards avatar

  const topRank = options.topRank ?? score.topRank ?? score.top_rank;
  const mapRank = score.rank_on_map || score.leaderboard_rank;
  const hasSubText = topRank != null || mapRank != null || missCount > 0;

  ctx.save();
  ctx.textAlign = 'right';

  // Accuracy (vertically centered if standalone, or top line if rank/miss exists)
  ctx.font = `bold 19px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(accVal, leftClusterX, hasSubText ? avatarY + 23 : avatarY + 34);

  // Rank / Placement / Miss count below accuracy (Only show if rank exists OR missCount > 0)
  if (topRank != null) {
    ctx.font = `bold 17px ${FONT_STACK}`;
    ctx.fillStyle = topRank === 1 ? '#facc15' : '#c084fc';
    ctx.fillText(`#${topRank}`, leftClusterX, avatarY + 45);
  } else if (mapRank != null) {
    ctx.font = `bold 17px ${FONT_STACK}`;
    ctx.fillStyle = '#facc15';
    ctx.fillText(`#${mapRank}`, leftClusterX, avatarY + 45);
  } else if (missCount > 0) {
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${missCount}x miss`, leftClusterX, avatarY + 45);
  }
  ctx.restore();

  // Right of Avatar: Username & Mod Badges
  const rightClusterX = avatarX + avatarSize + 16; // Aligned left away from avatar

  ctx.save();
  ctx.textAlign = 'left';

  // Username
  ctx.font = `bold 18px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncateText(ctx, playerUser.username || 'Player', 160), rightClusterX, avatarY + 23);

  // Mod Badges below username
  const modBadges = getLazerModBadges(score.mods);
  const badgeY = avatarY + 31;
  const badgeH = 20;
  let modX = rightClusterX;

  if (modBadges.length === 0) {
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText('No Mod', modX, badgeY + 14);
  } else {
    ctx.font = `bold 10px ${FONT_STACK}`;
    for (const b of modBadges) {
      const labelW = ctx.measureText(b.label).width;
      const pillW = labelW + 10;

      ctx.fillStyle = b.bg;
      ctx.beginPath();
      ctx.roundRect(modX, badgeY, pillW, badgeH, 5);
      ctx.fill();

      ctx.strokeStyle = b.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      ctx.fillText(b.label, modX + (pillW / 2), badgeY + 14);

      modX += pillW + 5;
      if (modX > width - 40) break;
    }
  }
  ctx.restore();

  // 6D. Bottom Highlight Banner ("His New Top Play" / "Skor Terbaik #...")
  let footerText = options.customFooter;
  if (!footerText) {
    if (topRank === 1) {
      footerText = lang === 'id' ? 'Top Play Baru #1' : 'His New Top Play';
    } else if (topRank != null && topRank <= 100) {
      footerText = lang === 'id' ? `Skor Terbaik #${topRank}` : `Top Play #${topRank}`;
    } else if (mapRank === 1) {
      footerText = lang === 'id' ? '#1 di Leaderboard Map' : '#1 on Map Leaderboard';
    } else {
      const timeAgo = formatRelativeTime(score.ended_at || score.created_at || score.date, lang);
      footerText = timeAgo || (lang === 'id' ? 'Skor Terbaru' : 'Recent Score');
    }
  }

  const footerY = 322;
  ctx.save();
  ctx.font = `bold 17px ${FONT_STACK}`;
  ctx.textAlign = 'center';

  // Soft purple/indigo neon glow
  ctx.shadowColor = 'rgba(168, 85, 247, 0.75)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#c084fc';
  ctx.fillText(footerText, centerX, footerY); // Centered on exact centerX
  ctx.restore();

  // 7. Finishing Polish: Glass Border & Ambient Accent
  ctx.save();
  const outerBorder = ctx.createLinearGradient(0, 0, width, height);
  outerBorder.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  outerBorder.addColorStop(0.3, 'rgba(255, 255, 255, 0.10)');
  outerBorder.addColorStop(0.7, 'rgba(168, 85, 247, 0.18)');
  outerBorder.addColorStop(1, 'rgba(56, 189, 248, 0.28)');
  ctx.strokeStyle = outerBorder;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, cardRadius);
  ctx.stroke();

  // Subtle bottom accent glow strip
  const accentStrip = ctx.createLinearGradient(0, height - 2.5, width, height - 2.5);
  accentStrip.addColorStop(0, '#f59e0b');
  accentStrip.addColorStop(0.3, '#ec4899');
  accentStrip.addColorStop(0.7, '#a855f7');
  accentStrip.addColorStop(1, '#38bdf8');
  ctx.fillStyle = accentStrip;
  ctx.fillRect(0, height - 2.5, width, 2.5);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateMiniScoreCard
};
