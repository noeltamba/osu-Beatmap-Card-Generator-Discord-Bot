const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const {
  formatDuration,
  getStarRatingColor,
  getStatusBadge,
  getModeName,
  getRankGradeStyle,
  formatRelativeTime,
  formatMods,
  parseMods,
  calculateModdedStats,
  isFullCombo,
  getLazerModBadges,
  calculateLazerScore
} = require('./utils');

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
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
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

async function generateScoreCard(score, user) {
  const width = 1080;
  const height = 580;
  const radius = 28;
  const centerX = width / 2;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clip to card rounded rectangle
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.clip();

  // 1. Dark Base Background
  ctx.fillStyle = '#090a10';
  ctx.fillRect(0, 0, width, height);

  // 2. Load Blurred Beatmap Cover
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || beatmap.beatmapset || {};
  const coverUrl = (set.covers && (set.covers['cover@2x'] || set.covers.cover || set.covers['card@2x'])) ||
    `https://assets.ppy.sh/beatmaps/${beatmap.beatmapset_id}/covers/cover@2x.jpg`;

  try {
    const bgImage = await loadImage(coverUrl);
    ctx.save();
    ctx.filter = 'blur(16px)';
    const pad = 40;
    const aspect = bgImage.width / bgImage.height;
    let drawW = width + pad * 2;
    let drawH = (width + pad * 2) / aspect;
    if (drawH < height + pad * 2) {
      drawH = height + pad * 2;
      drawW = (height + pad * 2) * aspect;
    }
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
    ctx.restore();
  } catch (err) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Frosted Tint Overlay & Vignette
  const overlay = ctx.createRadialGradient(centerX, height / 2, 100, centerX, height / 2, width * 0.75);
  overlay.addColorStop(0, 'rgba(8, 10, 18, 0.52)');
  overlay.addColorStop(0.65, 'rgba(6, 8, 15, 0.72)');
  overlay.addColorStop(1, 'rgba(4, 5, 10, 0.90)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // 4. Center Floating Glass Container
  const glassMargin = 32;
  const glassW = width - (glassMargin * 2);
  const glassH = height - (glassMargin * 2);
  const glassRadius = 22;

  ctx.save();
  ctx.fillStyle = 'rgba(14, 18, 28, 0.46)';
  ctx.beginPath();
  ctx.roundRect(glassMargin, glassMargin, glassW, glassH, glassRadius);
  ctx.fill();

  const glassBorder = ctx.createLinearGradient(glassMargin, glassMargin, glassMargin, glassMargin + glassH);
  glassBorder.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  glassBorder.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  glassBorder.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.strokeStyle = glassBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // 5. TOP ROW: Mode, Status, Beatmap ID, and Time Played
  const topY = 62;
  const modeText = getModeName(score.mode || beatmap.mode).toUpperCase();
  const statusInfo = getStatusBadge(beatmap.status);
  const timeText = formatRelativeTime(score.created_at);

  let currentBadgeX = glassMargin + 24;

  // Mode badge
  ctx.font = `bold 12px ${FONT_STACK}`;
  const modeW = ctx.measureText(modeText).width + 24;
  ctx.fillStyle = 'rgba(255, 102, 170, 0.25)';
  ctx.beginPath();
  ctx.roundRect(currentBadgeX, topY, modeW, 26, 13);
  ctx.fill();
  ctx.strokeStyle = '#ff66aa';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ff94c2';
  ctx.textAlign = 'center';
  ctx.fillText(modeText, currentBadgeX + (modeW / 2), topY + 17);
  currentBadgeX += modeW + 10;

  // Status badge
  const statusW = ctx.measureText(statusInfo.label).width + 24;
  ctx.fillStyle = statusInfo.bg;
  ctx.beginPath();
  ctx.roundRect(currentBadgeX, topY, statusW, 26, 13);
  ctx.fill();
  ctx.strokeStyle = statusInfo.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = statusInfo.color;
  ctx.fillText(statusInfo.label, currentBadgeX + (statusW / 2), topY + 17);
  currentBadgeX += statusW + 10;

  // ID badge
  const idText = `b/${beatmap.id || '-'}`;
  ctx.font = `600 12px ${FONT_STACK}`;
  const idW = ctx.measureText(idText).width + 20;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(currentBadgeX, topY, idW, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(idText, currentBadgeX + (idW / 2), topY + 17);
  currentBadgeX += idW + 10;

  // Time played on right top
  if (timeText) {
    ctx.textAlign = 'right';
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(timeText, width - glassMargin - 24, topY + 17);
  }

  // 6. BEATMAP INFO (Title & Artist)
  const title = set.title || set.title_unicode || 'Untitled';
  const artist = set.artist || set.artist_unicode || 'Unknown Artist';
  const version = beatmap.version || 'Normal';

  // Calculate modded statistics (CS, AR, OD, HP, BPM, Length, and fallback SR)
  const modStats = calculateModdedStats(beatmap, score.mods, score.mode || beatmap.mode);
  const sr = score.beatmap?.modded_difficulty_rating || modStats.sr || beatmap.difficulty_rating || 0;
  const srColor = getStarRatingColor(sr);

  const titleY = 130;
  ctx.textAlign = 'left';
  ctx.font = `bold 28px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 10;
  const maxTitleW = glassW - 60;
  ctx.fillText(truncateText(ctx, title, maxTitleW), glassMargin + 24, titleY);
  ctx.shadowBlur = 0;

  // Artist & Difficulty Row
  const artistY = 162;
  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  const artistPrefix = `${artist}  •  `;
  ctx.fillText(artistPrefix, glassMargin + 24, artistY);
  const artistW = ctx.measureText(artistPrefix).width;

  // SR Pill
  const srValText = sr.toFixed(2);
  ctx.font = `bold 15px ${FONT_STACK}`;
  const srValW = ctx.measureText(srValText).width;
  const srPillW = 28 + srValW + 12;
  const srPillX = glassMargin + 24 + artistW;
  const srPillY = artistY - 18;

  ctx.save();
  ctx.shadowColor = srColor.glow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = srColor.bg;
  ctx.beginPath();
  ctx.roundRect(srPillX, srPillY, srPillW, 24, 12);
  ctx.fill();
  ctx.restore();

  drawVectorStar(ctx, srPillX + 13, srPillY + 12, 5, 6, 3, srColor.text);
  ctx.fillStyle = srColor.text;
  ctx.font = `bold 15px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(srValText, srPillX + 24, srPillY + 17);

  // Difficulty name
  const diffNameX = srPillX + srPillW + 10;
  ctx.font = `bold 17px ${FONT_STACK}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`[${truncateText(ctx, version, 340)}]`, diffNameX, artistY);

  // 7. SCORE HERO CONTAINER (Two-Section Dashboard)
  const heroY = 195;
  const heroH = 245;
  const heroW = glassW - 48;
  const heroX = glassMargin + 24;

  ctx.fillStyle = 'rgba(15, 18, 30, 0.65)';
  ctx.beginPath();
  ctx.roundRect(heroX, heroY, heroW, heroH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 7A. PLAYER SECTION (Top inside hero)
  const playerY = heroY + 20;
  const avatarSize = 44;
  const avatarX = heroX + 22;

  // Draw Avatar
  const playerUser = score.user || user || {};
  const avatarUrl = playerUser.avatar_url || `https://a.ppy.sh/${playerUser.id || 1}`;
  try {
    const avatarImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), playerY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, playerY, avatarSize, avatarSize);
    ctx.restore();

    // Avatar ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), playerY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (_) {
    // Avatar placeholder circle
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), playerY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Username & Rank
  const playerTextX = avatarX + avatarSize + 14;
  ctx.textAlign = 'left';
  ctx.font = `bold 22px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(playerUser.username || 'Player', playerTextX, playerY + 24);

  const globalRank = playerUser.statistics?.global_rank;
  ctx.font = `600 14px ${FONT_STACK}`;
  ctx.fillStyle = '#38bdf8';
  const rankText = globalRank ? `#${globalRank.toLocaleString()} Global` : 'osu! player';
  ctx.fillText(rankText, playerTextX, playerY + 44);

  // Lazer Mod Badges on the right of player header
  const modBadges = getLazerModBadges(score.mods);
  const modsY = playerY + 8;
  const badgeH = 28;
  let currentBadgeRightX = heroX + heroW - 22;

  if (modBadges.length === 0) {
    ctx.font = `bold 14px ${FONT_STACK}`;
    const nmW = ctx.measureText('+NM').width + 22;
    const nmX = currentBadgeRightX - nmW;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(nmX, modsY, nmW, badgeH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('+NM', nmX + (nmW / 2), modsY + 19);
  } else {
    // Render each mod badge from right to left
    for (let i = modBadges.length - 1; i >= 0; i--) {
      const b = modBadges[i];
      ctx.font = `bold 14px ${FONT_STACK}`;
      const labelW = ctx.measureText(b.label).width;

      let detailW = 0;
      if (b.detail) {
        ctx.font = `600 12px ${FONT_STACK}`;
        detailW = ctx.measureText(` • ${b.detail}`).width;
      }

      const totalPillW = labelW + detailW + 22;
      const pillX = currentBadgeRightX - totalPillW;

      ctx.fillStyle = b.bg;
      ctx.beginPath();
      ctx.roundRect(pillX, modsY, totalPillW, badgeH, 14);
      ctx.fill();
      ctx.strokeStyle = b.border;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Text inside pill
      ctx.textAlign = 'left';
      ctx.font = `bold 14px ${FONT_STACK}`;
      ctx.fillStyle = b.color;
      ctx.fillText(b.label, pillX + 11, modsY + 19);

      if (b.detail) {
        ctx.font = `600 12px ${FONT_STACK}`;
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(` • ${b.detail}`, pillX + 11 + labelW, modsY + 19);
      }

      currentBadgeRightX = pillX - 8;
    }
  }

  // Subtle separator line inside hero
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(heroX + 20, playerY + avatarSize + 16);
  ctx.lineTo(heroX + heroW - 20, playerY + avatarSize + 16);
  ctx.stroke();

  // 7B. SCORE DETAILS SECTION
  const scoreStatsY = playerY + avatarSize + 30;

  // Grade Badge (Big stylized SS / S / A / B / C / D / F)
  const gradeInfo = getRankGradeStyle(score.rank);
  const gradeBoxX = heroX + 22;
  const gradeBoxY = scoreStatsY;
  const gradeBoxW = 110;
  const gradeBoxH = 115;

  ctx.save();
  ctx.fillStyle = gradeInfo.bg;
  ctx.beginPath();
  ctx.roundRect(gradeBoxX, gradeBoxY, gradeBoxW, gradeBoxH, 16);
  ctx.fill();
  ctx.strokeStyle = gradeInfo.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.shadowColor = gradeInfo.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradeInfo.color;
  ctx.font = `bold 64px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(gradeInfo.label, gradeBoxX + (gradeBoxW / 2), gradeBoxY + 76);
  ctx.restore();

  // PP & Core Numbers (Middle Column)
  const midColX = gradeBoxX + gradeBoxW + 28;
  let ppVal = '-';
  let ppColor = '#f8fafc';
  if (score.pp) {
    ppVal = `${Math.round(score.pp)}pp`;
    ppColor = '#f8fafc';
  } else if (score.rank === 'F') {
    ppVal = 'FAILED';
    ppColor = '#f87171';
  }

  const accVal = `${((score.accuracy || 0) * 100).toFixed(2)}%`;

  const mapMaxCombo = beatmap.max_combo || beatmap.count_max_combo || 0;
  const isFc = isFullCombo(score, beatmap, mapMaxCombo);

  const scoreComboNum = score.max_combo || 0;
  let comboDisplayText;
  if (!isFc && mapMaxCombo > 0) {
    comboDisplayText = `${scoreComboNum.toLocaleString()}x / ${mapMaxCombo.toLocaleString()}x`;
  } else {
    comboDisplayText = `${scoreComboNum.toLocaleString()}x`;
  }

  const cleanMods = parseMods(score.mods);
  const rawScore = (score.total_score != null && Number(score.total_score) > 0)
    ? Number(score.total_score)
    : (score.score != null && Number(score.score) > 0
        ? Number(score.score)
        : calculateLazerScore(score, mapMaxCombo, cleanMods));

  // Big PP
  ctx.textAlign = 'left';
  ctx.font = `bold ${ppVal === 'FAILED' ? '28px' : '38px'} ${FONT_STACK}`;
  ctx.fillStyle = ppColor;
  ctx.fillText(ppVal, midColX, scoreStatsY + 36);

  // Total Score below PP (Lazer standardized format matching osu! web)
  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Score: ', midColX, scoreStatsY + 68);
  const scoreLabelW = ctx.measureText('Score: ').width;

  const scoreFormatted = rawScore.toLocaleString();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 17px ${FONT_STACK}`;
  ctx.fillText(scoreFormatted, midColX + scoreLabelW, scoreStatsY + 68);
  const scoreFormattedW = ctx.measureText(scoreFormatted).width;

  // Classic score reference if available and distinct
  const classicScoreVal = score.classic_total_score ?? score.classic_score ?? score.legacy_total_score;
  if (classicScoreVal != null && Number(classicScoreVal) > 0 && Number(classicScoreVal) !== rawScore) {
    const classicLabel = '  • Classic: ';
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(classicLabel, midColX + scoreLabelW + scoreFormattedW, scoreStatsY + 68);
    const classicLabelW = ctx.measureText(classicLabel).width;

    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillText(Number(classicScoreVal).toLocaleString(), midColX + scoreLabelW + scoreFormattedW + classicLabelW, scoreStatsY + 68);
  }

  // Accuracy & Combo row
  ctx.font = `600 16px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Acc: `, midColX, scoreStatsY + 100);
  const accLabelW = ctx.measureText('Acc: ').width;
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillText(accVal, midColX + accLabelW, scoreStatsY + 100);

  const accFullW = accLabelW + ctx.measureText(accVal).width;
  const comboStartX = midColX + accFullW + 20;

  ctx.font = `600 16px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Combo: `, comboStartX, scoreStatsY + 100);
  const comboLabelW = ctx.measureText('Combo: ').width;
  ctx.fillStyle = isFc ? '#4ade80' : '#ffffff';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillText(comboDisplayText, comboStartX + comboLabelW, scoreStatsY + 100);

  // FC Badge ONLY if full combo
  if (isFc) {
    const comboW = comboLabelW + ctx.measureText(comboDisplayText).width;
    const fcX = comboStartX + comboW + 10;
    ctx.fillStyle = 'rgba(74, 222, 128, 0.2)';
    ctx.beginPath();
    ctx.roundRect(fcX, scoreStatsY + 84, 38, 20, 10);
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.font = `bold 12px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('FC', fcX + 19, scoreStatsY + 98);
  }

  // 7C. HIT JUDGEMENTS (300 / 100 / 50 / Miss) (Right Column)
  const stats = score.statistics || {};
  const c300 = stats.great ?? stats.count_300 ?? (score.mode === 'mania' ? stats.perfect ?? 0 : 0);
  const c100 = stats.ok ?? stats.count_100 ?? (score.mode === 'fruits' ? stats.large_tick_hit ?? 0 : 0);
  const c50 = stats.meh ?? stats.count_50 ?? (score.mode === 'fruits' ? stats.small_tick_hit ?? 0 : 0);
  const cMiss = stats.miss ?? stats.count_miss ?? 0;

  const hits = [
    { label: '300', val: c300.toLocaleString(), color: '#38bdf8' },
    { label: '100', val: c100.toLocaleString(), color: '#4ade80' },
    { label: '50', val: c50.toLocaleString(), color: '#fb923c' },
    { label: 'MISS', val: `${cMiss}x`, color: cMiss > 0 ? '#f43f5e' : '#64748b' }
  ];

  const hitsBoxW = 320;
  const hitsStartX = heroX + heroW - hitsBoxW - 20;
  const hitItemW = (hitsBoxW - (10 * 3)) / 4;

  hits.forEach((h, i) => {
    const boxX = hitsStartX + (i * (hitItemW + 10));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(boxX, scoreStatsY + 15, hitItemW, 85, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = h.color;
    ctx.fillText(h.label, boxX + (hitItemW / 2), scoreStatsY + 40);

    ctx.font = `bold 18px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(h.val, boxX + (hitItemW / 2), scoreStatsY + 74);
  });

  // 8. BOTTOM BEATMAP STATS STRIP
  const bottomY = 460;
  const bottomW = glassW - 48;
  const bottomH = 50;
  const bottomX = glassMargin + 24;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(bottomX, bottomY, bottomW, bottomH, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const mapStats = [
    { title: 'CS', val: modStats.cs != null ? modStats.cs.toFixed(1) : (beatmap.cs?.toFixed(1) ?? '-') },
    { title: 'AR', val: modStats.ar != null ? modStats.ar.toFixed(1) : (beatmap.ar?.toFixed(1) ?? '-') },
    { title: 'OD', val: modStats.od != null ? modStats.od.toFixed(1) : (beatmap.accuracy?.toFixed(1) ?? '-') },
    { title: 'HP', val: modStats.hp != null ? modStats.hp.toFixed(1) : (beatmap.drain?.toFixed(1) ?? '-') },
    { title: 'BPM', val: `${modStats.bpm || Math.round(beatmap.bpm || set.bpm || 0)}` },
    { title: 'LENGTH', val: formatDuration(modStats.total_length || beatmap.total_length) }
  ];

  const colW = bottomW / mapStats.length;
  mapStats.forEach((st, i) => {
    const colCenterX = bottomX + (i * colW) + (colW / 2);
    ctx.textAlign = 'center';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(st.title, colCenterX, bottomY + 21);

    ctx.font = `bold 15px ${FONT_STACK}`;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(st.val, colCenterX, bottomY + 39);

    if (i < mapStats.length - 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bottomX + ((i + 1) * colW), bottomY + 12);
      ctx.lineTo(bottomX + ((i + 1) * colW), bottomY + bottomH - 12);
      ctx.stroke();
    }
  });

  // 9. Bottom Glow Accent Line
  const accentGrad = ctx.createLinearGradient(0, height - 5, width, height - 5);
  accentGrad.addColorStop(0, '#ff66aa');
  accentGrad.addColorStop(0.3, gradeInfo.color);
  accentGrad.addColorStop(0.7, '#38bdf8');
  accentGrad.addColorStop(1, '#a855f7');

  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, height - 5, width, 5);

  ctx.restore();

  // Outer border with subtle glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

module.exports = {
  generateScoreCard
};
