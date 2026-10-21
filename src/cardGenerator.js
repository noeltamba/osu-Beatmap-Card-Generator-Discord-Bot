const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { formatDuration, getStarRatingColor, getStatusBadge, getModeName } = require('./utils');

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

// Register CJK Fallback Fonts from Windows for Japanese, Chinese, Korean characters
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
} catch (e) {
  console.warn('Tidak dapat memuat CJK font Windows:', e.message);
}

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

function formatNumber(num) {
  if (num === undefined || num === null) return '-';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
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

function drawVectorHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(0, 0, -8, -5, -12, 0);
  ctx.bezierCurveTo(-16, 5, -15, 12, 0, 20);
  ctx.bezierCurveTo(15, 12, 16, 5, 12, 0);
  ctx.bezierCurveTo(8, -5, 0, 0, 0, 5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawVectorCrown(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  const w = size;
  const h = size * 0.7;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w / 2, h / 2);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(w / 2, -h / 2 + 2);
  ctx.lineTo(w / 4, 0);
  ctx.lineTo(0, -h / 2);
  ctx.lineTo(-w / 4, 0);
  ctx.lineTo(-w / 2, -h / 2 + 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

async function generateBeatmapCard(beatmap, options = {}) {
  const isShowcase = Boolean(options.showcase);
  const playerName = options.player ? String(options.player).trim() : null;
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

  // 2. Load and Render Blurred Cover Image (Real Frosted Glass Aesthetic)
  const set = beatmap.beatmapset || {};
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

  // 3. Frosted Glass Tint Overlay (Translucent to let vibrant colors shine)
  const overlay = ctx.createRadialGradient(centerX, height / 2, 100, centerX, height / 2, width * 0.75);
  overlay.addColorStop(0, 'rgba(8, 10, 18, 0.48)');
  overlay.addColorStop(0.65, 'rgba(6, 8, 15, 0.68)');
  overlay.addColorStop(1, 'rgba(4, 5, 10, 0.88)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // Subtle glass highlight reflection from top
  const sheen = ctx.createLinearGradient(0, 0, 0, height);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  sheen.addColorStop(0.2, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  // 4. Center Floating Glass Container (Translucent acrylic frosted panel)
  const glassMargin = 32;
  const glassW = width - (glassMargin * 2);
  const glassH = height - (glassMargin * 2);
  const glassRadius = 22;

  ctx.save();
  ctx.fillStyle = 'rgba(14, 18, 28, 0.42)';
  ctx.beginPath();
  ctx.roundRect(glassMargin, glassMargin, glassW, glassH, glassRadius);
  ctx.fill();

  // Glass card border with subtle specular reflection
  const glassBorder = ctx.createLinearGradient(glassMargin, glassMargin, glassMargin, glassMargin + glassH);
  glassBorder.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  glassBorder.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  glassBorder.addColorStop(1, 'rgba(255, 255, 255, 0.12)');
  ctx.strokeStyle = glassBorder;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // 5. TOP ROW BADGES (Centered)
  const modeText = getModeName(beatmap.mode).toUpperCase();
  const statusInfo = getStatusBadge(beatmap.status);
  const idText = `b/${beatmap.id || '-'} • s/${beatmap.beatmapset_id || '-'}`;

  ctx.font = `bold 12px ${FONT_STACK}`;
  const modeW = ctx.measureText(modeText).width + 24;
  const statusW = ctx.measureText(statusInfo.label).width + 24;
  const showcaseW = isShowcase ? (ctx.measureText('SHOWCASE').width + 24) : 0;
  ctx.font = `600 12px ${FONT_STACK}`;
  const idW = ctx.measureText(idText).width + 22;

  const gap = 12;
  const totalTopW = modeW + statusW + (isShowcase ? (showcaseW + gap) : 0) + idW + (gap * 2);
  let badgeX = centerX - (totalTopW / 2);
  const topY = 62;

  // Mode badge
  ctx.fillStyle = 'rgba(255, 102, 170, 0.25)';
  ctx.beginPath();
  ctx.roundRect(badgeX, topY, modeW, 26, 13);
  ctx.fill();
  ctx.strokeStyle = '#ff66aa';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ff94c2';
  ctx.textAlign = 'center';
  ctx.font = `bold 12px ${FONT_STACK}`;
  ctx.fillText(modeText, badgeX + (modeW / 2), topY + 17);
  badgeX += modeW + gap;

  // Status badge
  ctx.fillStyle = statusInfo.bg;
  ctx.beginPath();
  ctx.roundRect(badgeX, topY, statusW, 26, 13);
  ctx.fill();
  ctx.strokeStyle = statusInfo.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = statusInfo.color;
  ctx.fillText(statusInfo.label, badgeX + (statusW / 2), topY + 17);
  badgeX += statusW + gap;

  // Showcase badge (if showcase mode)
  if (isShowcase) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.beginPath();
    ctx.roundRect(badgeX, topY, showcaseW, 26, 13);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = `bold 12px ${FONT_STACK}`;
    ctx.fillText('SHOWCASE', badgeX + (showcaseW / 2), topY + 17);
    badgeX += showcaseW + gap;
  }

  // ID badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.roundRect(badgeX, topY, idW, 26, 13);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `600 12px ${FONT_STACK}`;
  ctx.fillText(idText, badgeX + (idW / 2), topY + 17);

  // 6. TITLE & ARTIST SECTION (Centered)
  // Use Romanized title/artist first (matching osu! standard and discord embeds)
  // with fallback to unicode
  const title = set.title || set.title_unicode || 'Untitled';
  const artist = set.artist || set.artist_unicode || 'Unknown Artist';
  const creator = set.creator || 'Unknown';

  // Title
  const titleY = 145;
  ctx.textAlign = 'center';
  ctx.font = `bold 36px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 12;
  const truncatedTitle = truncateText(ctx, title, glassW - 80);
  ctx.fillText(truncatedTitle, centerX, titleY);
  ctx.shadowBlur = 0;

  // Artist & Mapper
  const artistY = 184;
  ctx.font = `600 19px ${FONT_STACK}`;

  const artistText = `${artist}   •   mapped by `;
  const fullSubW = ctx.measureText(artistText).width + ctx.measureText(creator).width;
  const subStartX = centerX - (fullSubW / 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(artistText, subStartX, artistY);

  const artistW = ctx.measureText(artistText).width;
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold 19px ${FONT_STACK}`;
  ctx.fillText(creator, subStartX + artistW, artistY);

  // 7. STAR RATING, DIFFICULTY, & PLAYER ROW (Centered)
  const diffY = 222;
  const sr = beatmap.difficulty_rating || 0;
  const srColor = getStarRatingColor(sr);
  const version = beatmap.version || 'Normal';

  // Measure SR Pill
  const srValText = sr.toFixed(2);
  ctx.font = `bold 18px ${FONT_STACK}`;
  const srValW = ctx.measureText(srValText).width;
  const srPillW = 32 + srValW + 16;

  // Measure Player Pill if showcase and player provided
  let playerPillW = 0;
  let playerLabel = '';
  if (isShowcase && playerName) {
    ctx.font = `bold 16px ${FONT_STACK}`;
    playerLabel = `Played by ${playerName}`;
    const playerTextW = ctx.measureText(playerLabel).width;
    playerPillW = 34 + playerTextW + 18;
  }

  // Measure Diff Name Pill (adjust max width to prevent overflow)
  ctx.font = `bold 17px ${FONT_STACK}`;
  const maxDiffW = playerPillW > 0 ? 340 : 460;
  const diffText = truncateText(ctx, version, maxDiffW);
  const diffPillW = ctx.measureText(diffText).width + 28;

  const diffRowGap = 12;
  const hasPlayerPill = isShowcase && playerName && playerPillW > 0;
  const totalDiffRowW = srPillW + diffPillW + (hasPlayerPill ? (playerPillW + diffRowGap) : 0) + diffRowGap;
  const srPillX = centerX - (totalDiffRowW / 2);
  const diffPillX = srPillX + srPillW + diffRowGap;
  const playerPillX = diffPillX + diffPillW + diffRowGap;

  // Render SR Pill
  ctx.save();
  ctx.shadowColor = srColor.glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = srColor.bg;
  ctx.beginPath();
  ctx.roundRect(srPillX, diffY, srPillW, 34, 17);
  ctx.fill();
  if (srColor.border) {
    ctx.strokeStyle = srColor.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // Draw Star & Number
  drawVectorStar(ctx, srPillX + 17, diffY + 17, 5, 7.5, 3.8, srColor.text);
  ctx.fillStyle = srColor.text;
  ctx.font = `bold 18px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(srValText, srPillX + 31, diffY + 23);

  // Render Diff Name Pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(diffPillX, diffY, diffPillW, 34, 17);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold 17px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(diffText, diffPillX + (diffPillW / 2), diffY + 23);

  // Render Player Pill with Crown (Showcase Mode)
  if (hasPlayerPill) {
    ctx.save();
    ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
    ctx.beginPath();
    ctx.roundRect(playerPillX, diffY, playerPillW, 34, 17);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Draw Vector Crown
    drawVectorCrown(ctx, playerPillX + 18, diffY + 17, 16, '#fbbf24');

    // Draw Player Label
    ctx.fillStyle = '#fef08a';
    ctx.font = `bold 16px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillText(playerLabel, playerPillX + 32, diffY + 23);
  }

  // 8. SIMPLE & CLEAN CS, AR, OD, HP SYSTEM (Centered Compact Cards)
  const statsY = 285;
  const stats = [
    { label: 'CS', name: 'Circle Size', val: beatmap.cs ?? 0, color: '#38bdf8' },
    { label: 'AR', name: 'Approach Rate', val: beatmap.ar ?? 0, color: '#fb923c' },
    { label: 'OD', name: 'Overall Diff', val: beatmap.accuracy ?? 0, color: '#4ade80' },
    { label: 'HP', name: 'HP Drain', val: beatmap.drain ?? 0, color: '#f43f5e' }
  ];

  const chipW = 152;
  const chipH = 82;
  const chipGap = 16;
  const totalChipsW = (stats.length * chipW) + ((stats.length - 1) * chipGap);
  const chipsStartX = centerX - (totalChipsW / 2);

  stats.forEach((stat, i) => {
    const chipX = chipsStartX + (i * (chipW + chipGap));

    // Glass chip background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(chipX, statsY, chipW, chipH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Small colored dot + label
    ctx.fillStyle = stat.color;
    ctx.beginPath();
    ctx.arc(chipX + 22, statsY + 24, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = `bold 14px ${FONT_STACK}`;
    ctx.fillStyle = stat.color;
    ctx.fillText(stat.label, chipX + 32, statsY + 28);

    // Large clean value
    ctx.textAlign = 'center';
    ctx.font = `bold 30px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stat.val.toFixed(1), chipX + (chipW / 2), statsY + 64);

    // Mini accent bar at the bottom of each chip
    const barPad = 20;
    const barW = chipW - (barPad * 2);
    const fillW = Math.max(4, Math.min(barW, (stat.val / 10) * barW));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(chipX + barPad, statsY + chipH - 8, barW, 3, 1.5);
    ctx.fill();

    ctx.fillStyle = stat.color;
    ctx.beginPath();
    ctx.roundRect(chipX + barPad, statsY + chipH - 8, fillW, 3, 1.5);
    ctx.fill();
  });

  // 9. CLEAN SECONDARY METADATA PILL (Centered)
  const metaY = 398;
  const metaPillW = isShowcase ? 680 : Math.min(840, glassW - 60);
  const metaPillH = 50;
  const metaPillX = centerX - (metaPillW / 2);

  // Background glass pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.roundRect(metaPillX, metaY, metaPillW, metaPillH, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Metadata items: in showcase mode, Plays & Favorites are removed
  const metaItems = isShowcase
    ? [
        { title: 'LENGTH', val: `${formatDuration(beatmap.total_length)} (${formatDuration(beatmap.hit_length)})` },
        { title: 'BPM', val: `${Math.round(beatmap.bpm || set.bpm || 0)}` },
        { title: 'MAX COMBO', val: beatmap.max_combo ? `${beatmap.max_combo.toLocaleString()}x` : '-' }
      ]
    : [
        { title: 'LENGTH', val: `${formatDuration(beatmap.total_length)} (${formatDuration(beatmap.hit_length)})` },
        { title: 'BPM', val: `${Math.round(beatmap.bpm || set.bpm || 0)}` },
        { title: 'COMBO', val: beatmap.max_combo ? `${beatmap.max_combo.toLocaleString()}x` : '-' },
        { title: 'PLAYS', val: `${formatNumber(beatmap.playcount)}` },
        { title: 'FAVORITES', val: `${formatNumber(set.favourite_count)}`, hasHeart: true }
      ];

  const itemSlotW = metaPillW / metaItems.length;

  metaItems.forEach((item, i) => {
    const itemCenterX = metaPillX + (i * itemSlotW) + (itemSlotW / 2);

    ctx.textAlign = 'center';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(item.title, itemCenterX, metaY + 21);

    ctx.font = `bold 15px ${FONT_STACK}`;
    ctx.fillStyle = '#f8fafc';

    if (item.hasHeart) {
      const valW = ctx.measureText(item.val).width;
      const heartX = itemCenterX - (valW / 2) - 8;
      drawVectorHeart(ctx, heartX, metaY + 30, 10, '#f43f5e');
      ctx.textAlign = 'center';
      ctx.fillText(item.val, itemCenterX + 6, metaY + 39);
    } else {
      ctx.fillText(item.val, itemCenterX, metaY + 39);
    }

    // Divider line between items
    if (i < metaItems.length - 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(metaPillX + ((i + 1) * itemSlotW), metaY + 12);
      ctx.lineTo(metaPillX + ((i + 1) * itemSlotW), metaY + metaPillH - 12);
      ctx.stroke();
    }
  });

  // 10. Bottom Glow Accent Line (Star Rating Colored)
  const accentGrad = ctx.createLinearGradient(0, height - 5, width, height - 5);
  accentGrad.addColorStop(0, '#ff66aa');
  accentGrad.addColorStop(0.3, srColor.bg);
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
  generateBeatmapCard
};
