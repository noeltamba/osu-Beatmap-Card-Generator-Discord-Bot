const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const {
  formatRelativeTime,
  getRankGradeStyle,
  getStarRatingColor,
  getLazerModStyle,
  getStatusBadge,
  parseMods,
  calculateModdedStats,
  isFullCombo
} = require('./utils');

// Register Torus Font family
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Regular.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-SemiBold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Bold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Heavy.otf'), 'Torus');
} catch (e) {}

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

function truncate(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = String(text);
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

function getEffectiveStarRating(score, beatmap) {
  const bm = beatmap || score.beatmap || {};
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
 * Generate Recent Plays List visual card (up to 15 recent plays).
 *
 * @param {object} user - osu! user object
 * @param {Array<object>} scores - Array of recent osu! score objects
 * @param {object} options - { lang }
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateRecentListCard(user, scores, options = {}) {
  const lang = options.lang || 'en';
  const count = Math.min(scores.length, 15);
  const width = 1180;
  const outerMargin = 28;

  const headerH = 88;
  const tableHeaderH = 30;
  const rowH = 50;
  const innerPad = 24;

  const contentW = width - (outerMargin * 2);
  const contentH = 20 + headerH + 16 + tableHeaderH + (count * rowH) + 16;
  const height = contentH + (outerMargin * 2);
  const contentX = outerMargin;
  const contentY = outerMargin;
  const contentRadius = 18;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clip to outer card rectangle
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 24);
  ctx.clip();

  // Dark fallback base
  ctx.fillStyle = '#070a12';
  ctx.fillRect(0, 0, width, height);

  // 1. Get Most Recent #1 Beatmap Cover URL
  const recentScore = scores[0];
  const recentBm = recentScore?.beatmap || {};
  const recentSet = recentScore?.beatmapset || recentBm.beatmapset || {};
  const coverUrl = (recentSet.covers && (recentSet.covers['cover@2x'] || recentSet.covers.cover || recentSet.covers['card@2x'])) ||
    (recentBm.beatmapset_id ? `https://assets.ppy.sh/beatmaps/${recentBm.beatmapset_id}/covers/cover@2x.jpg` : null) ||
    (recentSet.id ? `https://assets.ppy.sh/beatmaps/${recentSet.id}/covers/cover@2x.jpg` : null) ||
    user.cover?.url ||
    user.cover_url;

  let bgImage = null;
  if (coverUrl) {
    try {
      bgImage = await loadImage(coverUrl);
    } catch (_) {}
  }

  // 2. LAYER 1: Draw Crisp Background on outer area (unblurred outside content)
  if (bgImage) {
    const aspect = bgImage.width / bgImage.height;
    let drawW = width;
    let drawH = width / aspect;
    if (drawH < height) {
      drawH = height;
      drawW = height * aspect;
    }
    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2;

    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);

    // Subtle dark outer vignette so card borders look elegant
    ctx.fillStyle = 'rgba(4, 6, 12, 0.42)';
    ctx.fillRect(0, 0, width, height);

    // 3. LAYER 2: Frosted Glass / Glossy effect ONLY inside Content Area
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, contentW, contentH, contentRadius);
    ctx.clip();

    // Blurred background inside content
    ctx.filter = 'blur(20px)';
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';

    // Dark glass overlay for maximum text legibility
    ctx.fillStyle = 'rgba(8, 12, 22, 0.85)';
    ctx.fillRect(contentX, contentY, contentW, contentH);

    // Glossy shine gradient (specular reflection)
    const glossGrad = ctx.createLinearGradient(contentX, contentY, contentX, contentY + contentH);
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.10)');
    glossGrad.addColorStop(0.15, 'rgba(255, 255, 255, 0.03)');
    glossGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.00)');
    glossGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = glossGrad;
    ctx.fillRect(contentX, contentY, contentW, contentH);
    ctx.restore();
  } else {
    // Fallback dark gradient
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#05070c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(8, 12, 22, 0.90)';
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, contentW, contentH, contentRadius);
    ctx.fill();
  }

  // 4. Content Area Glass Border
  ctx.save();
  const glassBorder = ctx.createLinearGradient(contentX, contentY, contentX, contentY + contentH);
  glassBorder.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
  glassBorder.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  glassBorder.addColorStop(1, 'rgba(255, 255, 255, 0.16)');
  ctx.strokeStyle = glassBorder;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(contentX, contentY, contentW, contentH, contentRadius);
  ctx.stroke();
  ctx.restore();

  // 5. INNER CONTENT LAYOUT
  const tableX = contentX + innerPad;
  const tableW = contentW - (innerPad * 2);

  // 5A. Player Profile Header
  const headerY = contentY + 20;
  const avatarSize = 64;
  const avatarX = tableX;
  const avatarY = headerY + 6;
  const avatarUrl = user.avatar_url || `https://a.ppy.sh/${user.id || 1}`;

  try {
    const avImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (_) {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Username & Profile Rank Badges
  const userTextX = avatarX + avatarSize + 16;
  ctx.textAlign = 'left';
  ctx.font = `bold 24px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(user.username || 'Player', userTextX, headerY + 30);

  const uStats = user.statistics || {};
  const globalRank = uStats.global_rank ? `#${uStats.global_rank.toLocaleString()}` : '-';
  const countryRank = uStats.country_rank ? `#${uStats.country_rank.toLocaleString()} ${user.country?.code || ''}` : '';
  const totalPp = uStats.pp ? `${Math.round(uStats.pp).toLocaleString()}pp` : '-';
  const hitAcc = uStats.hit_accuracy ? `${Number(uStats.hit_accuracy).toFixed(2)}%` : '-';

  ctx.font = `600 13px ${FONT_STACK}`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(globalRank, userTextX, headerY + 56);
  const grW = ctx.measureText(globalRank).width;

  if (countryRank) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(` (${countryRank})`, userTextX + grW, headerY + 56);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  const crFullW = grW + (countryRank ? ctx.measureText(` (${countryRank})`).width : 0);
  ctx.fillText('  •  ', userTextX + crFullW, headerY + 56);
  const sepW = ctx.measureText('  •  ').width;

  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Total: `, userTextX + crFullW + sepW, headerY + 56);
  const totW = ctx.measureText(`Total: `).width;
  ctx.fillStyle = '#4ade80';
  ctx.fillText(totalPp, userTextX + crFullW + sepW + totW, headerY + 56);
  const ppW = ctx.measureText(totalPp).width;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillText('  •  ', userTextX + crFullW + sepW + totW + ppW, headerY + 56);
  const sep2W = ctx.measureText('  •  ').width;

  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Acc: `, userTextX + crFullW + sepW + totW + ppW + sep2W, headerY + 56);
  const accLblW = ctx.measureText(`Acc: `).width;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(hitAcc, userTextX + crFullW + sepW + totW + ppW + sep2W + accLblW, headerY + 56);

  // Top Right Header: Title, Filter Pills & Session Summary
  const passCount = scores.slice(0, count).filter(s => s.passed !== false && String(s.rank || '').toUpperCase() !== 'F').length;
  const failCount = count - passCount;
  const filterTags = Array.isArray(options.filterTags) ? options.filterTags : [];

  ctx.textAlign = 'right';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillStyle = '#38bdf8';
  const headerTitle = lang === 'id'
    ? `DAFTAR ${count} SKOR TERBARU`
    : `RECENT ${count} PLAYS`;
  ctx.fillText(headerTitle, tableX + tableW, headerY + 28);

  // Draw active filter badges right next to the left of headerTitle if any
  if (filterTags.length > 0) {
    const titleW = ctx.measureText(headerTitle).width;
    let pillRightX = tableX + tableW - titleW - 12;
    ctx.font = `bold 10px ${FONT_STACK}`;

    for (let tIdx = filterTags.length - 1; tIdx >= 0; tIdx--) {
      const tag = filterTags[tIdx];
      const tagW = ctx.measureText(tag).width + 12;
      const pillX = pillRightX - tagW;
      if (pillX < userTextX + 220) break;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.beginPath();
      ctx.roundRect(pillX, headerY + 13, tagW, 20, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.40)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(tag, pillX + (tagW / 2), headerY + 27);

      pillRightX = pillX - 6;
    }
  }

  ctx.textAlign = 'right';
  ctx.font = `600 12px ${FONT_STACK}`;
  const modeStr = `Mode: ${(options.mode || scores[0]?.mode || 'osu').toUpperCase()}`;
  const summaryStr = lang === 'id'
    ? `${passCount} Lulus • ${failCount} Gagal  |  ${modeStr}`
    : `${passCount} Pass • ${failCount} Fail  |  ${modeStr}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(summaryStr, tableX + tableW, headerY + 54);

  // 5B. TABLE HEADER ROW
  const tblHeaderY = headerY + 84;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(tableX, tblHeaderY, tableW, tableHeaderH, 6);
  ctx.fill();

  ctx.font = `bold 11px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';

  // Table Column Positions
  const colRankX = tableX + 24; // Center
  const colGradeX = tableX + 66; // Center
  const colMapX = tableX + 104; // Left
  const colModsX = tableX + 620; // Center
  const colAccX = tableX + 710; // Center
  const colComboX = tableX + 805; // Center
  const colPpX = tableX + 945; // Right
  const colTimeX = tableX + tableW - 14; // Right

  ctx.textAlign = 'center';
  ctx.fillText('#', colRankX, tblHeaderY + 19);
  ctx.fillText('GRADE', colGradeX, tblHeaderY + 19);
  ctx.textAlign = 'left';
  ctx.fillText('BEATMAP', colMapX, tblHeaderY + 19);
  ctx.textAlign = 'center';
  ctx.fillText('MODS', colModsX, tblHeaderY + 19);
  ctx.fillText(lang === 'id' ? 'AKURASI' : 'ACC', colAccX, tblHeaderY + 19);
  ctx.fillText(lang === 'id' ? 'KOMBO' : 'COMBO', colComboX, tblHeaderY + 19);
  ctx.textAlign = 'right';
  ctx.fillText(lang === 'id' ? 'PERFORMA' : 'PERFORMANCE', colPpX, tblHeaderY + 19);
  ctx.fillText(lang === 'id' ? 'WAKTU' : 'TIME', colTimeX, tblHeaderY + 19);

  // 5C. TABLE DATA ROWS
  const rowsStartY = tblHeaderY + tableHeaderH + 4;

  for (let i = 0; i < count; i++) {
    const score = scores[i];
    const rowY = rowsStartY + (i * rowH);
    const bm = score.beatmap || {};
    const set = score.beatmapset || bm.beatmapset || {};

    const isLatest = i === 0;
    const isFailed = score.passed === false || String(score.rank || '').toUpperCase() === 'F';
    const mapStatus = String(bm.status || '').toLowerCase();
    const isRanked = mapStatus === 'ranked' || mapStatus === 'approved';

    // Row Background (Latest play highlight, failed subtle red tint, alternating otherwise)
    if (isFailed) {
      ctx.fillStyle = isLatest ? 'rgba(244, 63, 94, 0.11)' : 'rgba(244, 63, 94, 0.05)';
    } else if (isLatest) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.09)';
    } else {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)';
    }

    ctx.beginPath();
    ctx.roundRect(tableX, rowY, tableW, rowH - 2, 6);
    ctx.fill();

    // Left Accent Indicator for #1 Most Recent or Failed
    if (isLatest) {
      ctx.fillStyle = isFailed ? '#f43f5e' : '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(tableX, rowY, 3.5, rowH - 2, [6, 0, 0, 6]);
      ctx.fill();
    } else if (isFailed) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.beginPath();
      ctx.roundRect(tableX, rowY, 2.5, rowH - 2, [6, 0, 0, 6]);
      ctx.fill();
    }

    // Divider line between rows
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tableX, rowY + rowH - 2);
    ctx.lineTo(tableX + tableW, rowY + rowH - 2);
    ctx.stroke();

    // 1. Column: Index (#1 - #15)
    const rankNum = `#${i + 1}`;
    ctx.textAlign = 'center';
    ctx.font = `bold 14px ${FONT_STACK}`;
    ctx.fillStyle = isLatest ? (isFailed ? '#fb7185' : '#38bdf8') : '#64748b';
    ctx.fillText(rankNum, colRankX, rowY + 30);

    // 2. Column: Grade Badge
    const grade = getRankGradeStyle(isFailed ? 'F' : score.rank);
    const gradeW = 32;
    const gradeH = 24;
    const gradeBoxX = colGradeX - (gradeW / 2);
    const gradeBoxY = rowY + 12;

    ctx.fillStyle = grade.bg;
    ctx.beginPath();
    ctx.roundRect(gradeBoxX, gradeBoxY, gradeW, gradeH, 6);
    ctx.fill();
    ctx.strokeStyle = grade.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = grade.color;
    ctx.fillText(grade.label, colGradeX, gradeBoxY + 17);

    // 3. Column: Beatmap Title & Difficulty (with Star Rating + Status if unranked)
    const songTitle = `${set.title || bm.title || 'Unknown Beatmap'}`;
    const artist = `${set.artist || bm.artist || ''}`;
    const fullSongText = artist ? `${artist} - ${songTitle}` : songTitle;

    const maxTitleW = 430;
    ctx.textAlign = 'left';
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = isFailed ? '#e2e8f0' : '#ffffff';
    ctx.fillText(truncate(ctx, fullSongText, maxTitleW), colMapX, rowY + 20);

    // Line 2: Modded Star Rating Pill + Status Pill (if not ranked) + Difficulty Name
    const sr = getEffectiveStarRating(score, bm);
    const srInfo = getStarRatingColor(sr);
    const diffName = bm.version || 'Normal';

    let subX = colMapX;
    const srText = `★ ${sr.toFixed(2)}`;
    ctx.font = `bold 10px ${FONT_STACK}`;
    const srPillW = ctx.measureText(srText).width + 8;
    ctx.fillStyle = srInfo.bg;
    ctx.beginPath();
    ctx.roundRect(subX, rowY + 28, srPillW, 16, 4);
    ctx.fill();
    if (srInfo.border) {
      ctx.strokeStyle = srInfo.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = srInfo.text;
    ctx.fillText(srText, subX + 4, rowY + 40);
    subX += srPillW + 6;

    // Optional Non-Ranked Status Mini Pill (Loved / Graveyard / Qualified / Pending)
    if (!isRanked && bm.status) {
      const stBadge = getStatusBadge(bm.status);
      ctx.font = `bold 9px ${FONT_STACK}`;
      const stW = ctx.measureText(stBadge.label).width + 8;
      ctx.fillStyle = stBadge.bg;
      ctx.beginPath();
      ctx.roundRect(subX, rowY + 28, stW, 16, 4);
      ctx.fill();
      ctx.fillStyle = stBadge.color;
      ctx.fillText(stBadge.label, subX + 4, rowY + 40);
      subX += stW + 6;
    }

    // Difficulty name
    const usedSubW = subX - colMapX;
    const maxDiffW = Math.max(90, maxTitleW - usedSubW);
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`[${truncate(ctx, diffName, maxDiffW)}]`, subX, rowY + 40);

    // 4. Column: Mods (Separated Lazer style badges)
    const rawMods = parseMods(score.mods);
    if (rawMods.length > 0) {
      ctx.font = `bold 10px ${FONT_STACK}`;
      const badgeH = 18;
      const badgeGap = 4;

      const badgeList = rawMods.map(m => {
        const style = getLazerModStyle(m);
        const textW = ctx.measureText(m).width;
        const w = Math.max(20, Math.ceil(textW + 6));
        return { mod: m, width: w, style };
      });

      const totalModsW = badgeList.reduce((acc, b) => acc + b.width, 0) + (badgeList.length - 1) * badgeGap;
      let currX = colModsX - (totalModsW / 2);
      const badgeY = rowY + 15;

      for (const b of badgeList) {
        ctx.fillStyle = b.style.bg;
        ctx.beginPath();
        ctx.roundRect(currX, badgeY, b.width, badgeH, 4);
        ctx.fill();

        ctx.strokeStyle = b.style.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = b.style.color;
        ctx.fillText(b.mod, currX + (b.width / 2), badgeY + 13);

        currX += b.width + badgeGap;
      }
    } else {
      ctx.textAlign = 'center';
      ctx.font = `600 11px ${FONT_STACK}`;
      ctx.fillStyle = '#64748b';
      ctx.fillText('NM', colModsX, rowY + 29);
    }

    // 5. Column: Accuracy
    const accText = `${((score.accuracy || 0) * 100).toFixed(2)}%`;
    ctx.textAlign = 'center';
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = isFailed ? '#cbd5e1' : '#38bdf8';
    ctx.fillText(accText, colAccX, rowY + 30);

    // 6. Column: Combo & Misses
    const userCombo = (score.max_combo || 0).toLocaleString();
    const mapMax = bm.max_combo || bm.count_max_combo || 0;
    const misses = score.statistics?.miss ?? score.statistics?.count_miss ?? 0;

    const isFc = !isFailed && (
      isFullCombo(score, bm, mapMax) ||
      (misses === 0 && mapMax > 0 && (score.max_combo || 0) >= mapMax - 2)
    );

    const comboText = isFc
      ? `${userCombo}x`
      : (mapMax > 0 ? `${userCombo} / ${mapMax.toLocaleString()}x` : `${userCombo}x`);
    const comboColor = isFc ? '#4ade80' : (isFailed ? '#cbd5e1' : '#ffffff');

    ctx.font = `600 12px ${FONT_STACK}`;
    const comboTextW = ctx.measureText(comboText).width;

    const hasMissBadge = misses > 0;
    let missBadgeW = 0;
    const missBadgeText = `${misses}x`;
    const badgeH = 17;
    const gap = 6;

    if (hasMissBadge) {
      ctx.font = `bold 10px ${FONT_STACK}`;
      missBadgeW = Math.max(20, Math.ceil(ctx.measureText(missBadgeText).width + 8));
    }

    const totalComboW = comboTextW + (hasMissBadge ? gap + missBadgeW : 0);
    const startComboX = colComboX - (totalComboW / 2);

    ctx.textAlign = 'left';
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = comboColor;
    ctx.fillText(comboText, startComboX, rowY + 30);

    if (hasMissBadge) {
      const badgeX = startComboX + comboTextW + gap;
      const badgeY = rowY + 16;

      ctx.fillStyle = 'rgba(244, 63, 94, 0.16)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, missBadgeW, badgeH, 4);
      ctx.fill();

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = `bold 10px ${FONT_STACK}`;
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(missBadgeText, badgeX + (missBadgeW / 2), badgeY + 12);
    }

    // 7. Column: Performance Points / Fail Progress
    ctx.textAlign = 'right';
    if (isFailed) {
      const failText = score.fail_percent
        ? `FAIL (${score.fail_percent}%)`
        : 'FAILED';
      const hasFailSub = score.fail_pp != null && Math.round(score.fail_pp) > 0;
      ctx.font = `bold 13px ${FONT_STACK}`;
      ctx.fillStyle = '#f87171';
      ctx.fillText(failText, colPpX, rowY + (hasFailSub ? 24 : 30));

      if (hasFailSub) {
        const failPpVal = Math.round(score.fail_pp);
        ctx.font = `600 10px ${FONT_STACK}`;
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`(~${failPpVal}pp)`, colPpX, rowY + 39);
      }
    } else {
      const pp = Math.round(score.pp || 0);
      const isUnrankedPp = Boolean(score.is_unranked_pp || (!isRanked && score.pp));
      const ppText = `${pp.toLocaleString()}pp${isUnrankedPp ? '*' : ''}`;
      const hasIfFc = !isFc && score.if_fc_pp && Math.round(score.if_fc_pp) > pp;

      ctx.font = `bold 15px ${FONT_STACK}`;
      ctx.fillStyle = isUnrankedPp ? '#cbd5e1' : (isLatest ? '#38bdf8' : '#ffffff');
      ctx.fillText(ppText, colPpX, rowY + (hasIfFc ? 24 : 30));

      if (hasIfFc) {
        const ifFcVal = Math.round(score.if_fc_pp);
        ctx.font = `600 10px ${FONT_STACK}`;
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`(~${ifFcVal}pp FC)`, colPpX, rowY + 39);
      }
    }

    // 8. Column: Relative Time
    const timeText = formatRelativeTime(score.ended_at || score.created_at || score.date, lang);
    ctx.textAlign = 'right';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(timeText, colTimeX, rowY + 30);
  }

  ctx.restore();
  return canvas.toBuffer('image/png');
}

module.exports = {
  generateRecentListCard
};
