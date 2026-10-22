const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const {
  formatRelativeTime,
  getRankGradeStyle,
  getStarRatingColor,
  parseMods
} = require('./utils');

const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Regular.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-SemiBold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Bold.otf'), 'Torus');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Torus-Heavy.otf'), 'Torus');
} catch (e) {}

const FONT_STACK = '"Torus", "Yu Gothic", "MS Gothic", "Microsoft YaHei", "Segoe UI", sans-serif';

function truncate(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '...').width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '...';
}

async function generateTopPlaysCard(user, scores) {
  const count = Math.min(scores.length, 10);
  const width = 1100;
  const headerH = 120;
  const rowH = 64;
  const rowGap = 8;
  const topPad = 28;
  const bottomPad = 28;
  const height = topPad + headerH + 20 + (count * (rowH + rowGap)) + bottomPad;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Rounded card clip
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 24);
  ctx.clip();

  // Dark Base Background
  ctx.fillStyle = '#0a0d16';
  ctx.fillRect(0, 0, width, height);

  // Background subtle gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#0b0f19');
  bgGrad.addColorStop(1, '#05070c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Frosted Glass Outer Container
  const pad = 24;
  const glassW = width - (pad * 2);
  const glassH = height - (pad * 2);

  ctx.fillStyle = 'rgba(15, 20, 32, 0.55)';
  ctx.beginPath();
  ctx.roundRect(pad, pad, glassW, glassH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 1. HEADER SECTION (Player profile)
  const headerX = pad + 18;
  const headerY = pad + 18;
  const headerW = glassW - 36;
  const avatarSize = 64;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.roundRect(headerX, headerY, headerW, 88, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw Avatar
  const avatarX = headerX + 16;
  const avatarY = headerY + 12;
  const avatarUrl = user.avatar_url || `https://a.ppy.sh/${user.id || 1}`;

  try {
    const avImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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

  // Username & Profile Rank
  const userTextX = avatarX + avatarSize + 16;
  ctx.textAlign = 'left';
  ctx.font = `bold 24px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(user.username || 'Player', userTextX, headerY + 36);

  const uStats = user.statistics || {};
  const globalRank = uStats.global_rank ? `#${uStats.global_rank.toLocaleString()}` : '-';
  const countryRank = uStats.country_rank ? `#${uStats.country_rank.toLocaleString()} ${user.country?.code || ''}` : '';
  const totalPp = uStats.pp ? `${Math.round(uStats.pp).toLocaleString()}pp` : '-';
  const hitAcc = uStats.hit_accuracy ? `${Number(uStats.hit_accuracy).toFixed(2)}%` : '-';

  ctx.font = `600 13px ${FONT_STACK}`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(globalRank, userTextX, headerY + 62);
  const grW = ctx.measureText(globalRank).width;

  if (countryRank) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(` (${countryRank})`, userTextX + grW, headerY + 62);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  const crFullW = grW + (countryRank ? ctx.measureText(` (${countryRank})`).width : 0);
  ctx.fillText('  •  ', userTextX + crFullW, headerY + 62);
  const sepW = ctx.measureText('  •  ').width;

  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Total: `, userTextX + crFullW + sepW, headerY + 62);
  const totW = ctx.measureText(`Total: `).width;
  ctx.fillStyle = '#4ade80';
  ctx.fillText(totalPp, userTextX + crFullW + sepW + totW, headerY + 62);
  const ppW = ctx.measureText(totalPp).width;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillText('  •  ', userTextX + crFullW + sepW + totW + ppW, headerY + 62);
  const sep2W = ctx.measureText('  •  ').width;

  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Acc: `, userTextX + crFullW + sepW + totW + ppW + sep2W, headerY + 62);
  const accLblW = ctx.measureText(`Acc: `).width;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(hitAcc, userTextX + crFullW + sepW + totW + ppW + sep2W + accLblW, headerY + 62);

  // Title on Header Right
  ctx.textAlign = 'right';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillStyle = '#facc15';
  ctx.fillText('TOP 10 PERFORMANCES', headerX + headerW - 16, headerY + 36);

  ctx.font = `600 12px ${FONT_STACK}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Mode: ${(scores[0]?.mode || 'osu').toUpperCase()}`, headerX + headerW - 16, headerY + 58);

  // 2. SCORE ROWS
  const startY = headerY + 104;
  const rowW = headerW;

  for (let i = 0; i < count; i++) {
    const score = scores[i];
    const rowY = startY + (i * (rowH + rowGap));
    const bm = score.beatmap || {};
    const set = score.beatmapset || bm.beatmapset || {};

    const isTop1 = i === 0;
    const isTop2 = i === 1;
    const isTop3 = i === 2;

    // Row Container
    ctx.fillStyle = isTop1 ? 'rgba(234, 179, 8, 0.08)' : 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.roundRect(headerX, rowY, rowW, rowH, 10);
    ctx.fill();

    ctx.strokeStyle = isTop1 ? 'rgba(234, 179, 8, 0.35)' : (isTop2 ? 'rgba(203, 213, 225, 0.2)' : (isTop3 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.05)'));
    ctx.lineWidth = 1;
    ctx.stroke();

    // Col 1: Rank Position (#1, #2, etc.)
    const rankNum = `#${i + 1}`;
    ctx.textAlign = 'center';
    ctx.font = `bold 16px ${FONT_STACK}`;
    ctx.fillStyle = isTop1 ? '#facc15' : (isTop2 ? '#cbd5e1' : (isTop3 ? '#fb923c' : '#64748b'));
    ctx.fillText(rankNum, headerX + 24, rowY + 38);

    // Col 2: Grade Badge
    const grade = getRankGradeStyle(score.rank);
    const gradeW = 34;
    const gradeH = 26;
    const gradeX = headerX + 48;
    const gradeY = rowY + 19;

    ctx.fillStyle = grade.bg;
    ctx.beginPath();
    ctx.roundRect(gradeX, gradeY, gradeW, gradeH, 6);
    ctx.fill();
    ctx.strokeStyle = grade.color;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `bold 14px ${FONT_STACK}`;
    ctx.fillStyle = grade.color;
    ctx.fillText(grade.label, gradeX + (gradeW / 2), gradeY + 18);

    // Col 3: Beatmap Info (Title, Diff, Mods, SR)
    const titleX = headerX + 96;
    const songTitle = `${set.title || bm.title || 'Unknown Beatmap'}`;
    const artist = `${set.artist || bm.artist || ''}`;
    const fullSongText = artist ? `${artist} - ${songTitle}` : songTitle;

    ctx.textAlign = 'left';
    ctx.font = `bold 14px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncate(ctx, fullSongText, 450), titleX, rowY + 28);

    // Diff + SR + Mods line
    const sr = Number(bm.difficulty_rating || 0);
    const srInfo = getStarRatingColor(sr);
    const diffName = bm.version || 'Normal';

    // SR Pill
    const srText = `★ ${sr.toFixed(2)}`;
    ctx.font = `bold 11px ${FONT_STACK}`;
    const srW = ctx.measureText(srText).width + 10;
    ctx.fillStyle = srInfo.bg;
    ctx.beginPath();
    ctx.roundRect(titleX, rowY + 38, srW, 18, 5);
    ctx.fill();
    ctx.fillStyle = srInfo.text;
    ctx.fillText(srText, titleX + 5, rowY + 51);

    // Diff text
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    const diffX = titleX + srW + 8;
    ctx.fillText(`[${truncate(ctx, diffName, 260)}]`, diffX, rowY + 51);
    const diffW = ctx.measureText(`[${truncate(ctx, diffName, 260)}]`).width;

    // Mods
    const mods = parseMods(score.mods);
    if (mods.length > 0) {
      const modsText = `+${mods.join('')}`;
      ctx.font = `bold 11px ${FONT_STACK}`;
      const modsW = ctx.measureText(modsText).width + 10;
      const modX = diffX + diffW + 8;

      ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
      ctx.beginPath();
      ctx.roundRect(modX, rowY + 38, modsW, 18, 5);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.fillText(modsText, modX + 5, rowY + 51);
    }

    // Col 4: Score, Combo, Acc, Misses (Right column)
    const rightColX = headerX + rowW - 18;

    // PP Value
    const pp = Math.round(score.pp || 0);
    const ppText = `${pp.toLocaleString()}pp`;
    ctx.textAlign = 'right';
    ctx.font = `bold 18px ${FONT_STACK}`;
    ctx.fillStyle = isTop1 ? '#facc15' : '#ffffff';
    ctx.fillText(ppText, rightColX, rowY + 28);
    const ppTextW = ctx.measureText(ppText).width;

    // If FC PP if choked
    if (score.if_fc_pp && Math.round(score.if_fc_pp) > pp) {
      const ifFcVal = Math.round(score.if_fc_pp);
      ctx.font = `600 12px ${FONT_STACK}`;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`(~${ifFcVal}pp FC) `, rightColX - ppTextW - 6, rowY + 28);
    }

    // Bottom Right Line: Acc • Combo • Time
    const acc = `${((score.accuracy || 0) * 100).toFixed(2)}%`;
    const combo = `${(score.max_combo || 0).toLocaleString()}x`;
    const mapMax = bm.max_combo || bm.count_max_combo || 0;
    const misses = score.statistics?.miss ?? score.statistics?.count_miss ?? 0;
    const timeText = formatRelativeTime(score.created_at);

    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(timeText, rightColX, rowY + 50);
    const timeW = ctx.measureText(timeText).width;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillText(' • ', rightColX - timeW, rowY + 50);
    const dotW = ctx.measureText(' • ').width;

    let comboText = combo;
    let comboColor = '#ffffff';
    if (misses === 0 && mapMax > 0 && (score.max_combo || 0) >= mapMax - 1) {
      comboText = `${combo} FC`;
      comboColor = '#4ade80';
    } else if (misses > 0) {
      comboText = `${combo} (${misses}x miss)`;
      comboColor = '#f43f5e';
    }

    ctx.fillStyle = comboColor;
    ctx.fillText(comboText, rightColX - timeW - dotW, rowY + 50);
    const comboW2 = ctx.measureText(comboText).width;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillText(' • ', rightColX - timeW - dotW - comboW2, rowY + 50);
    const dot2W = ctx.measureText(' • ').width;

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(acc, rightColX - timeW - dotW - comboW2 - dot2W, rowY + 50);
  }

  ctx.restore();
  return canvas.toBuffer('image/png');
}

module.exports = {
  generateTopPlaysCard
};

