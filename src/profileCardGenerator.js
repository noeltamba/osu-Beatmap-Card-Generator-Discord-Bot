const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { calculateScorePp } = require('./ppCalculator');
const { getIcon, getBathbotLogoImage, getBanchoLogoImage } = require('./iconHelper');

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

function formatPlayTime(seconds, lang = 'en') {
  if (!seconds || seconds <= 0) return '0h';
  const totalHours = Math.floor(seconds / 3600);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) {
    return lang === 'id' ? `${days}h ${hours}j` : `${days}d ${hours}h`;
  }
  return `${totalHours}h`;
}

function formatJoinDate(isoDate, lang = 'en') {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const months = lang === 'id' ? monthsId : monthsEn;
    const prefix = lang === 'id' ? 'Bergabung' : 'Joined';
    return `${prefix} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) {
    return '';
  }
}

const PLAYSTYLE_THEMES = {
  speed: {
    text: '#c084fc', // Ungu / Purple (senada dengan bar Speed)
    bg: 'rgba(192, 132, 252, 0.16)',
    border: 'rgba(192, 132, 252, 0.45)'
  },
  aim: {
    text: '#f43f5e', // Merah-Rose / Coral (senada dengan bar Aim)
    bg: 'rgba(244, 63, 94, 0.16)',
    border: 'rgba(244, 63, 94, 0.45)'
  },
  clean_sheet: {
    text: '#34d399', // Hijau / Emerald
    bg: 'rgba(52, 211, 153, 0.16)',
    border: 'rgba(52, 211, 153, 0.45)'
  },
  hybrid: {
    text: '#38bdf8', // Biru langit / Sky Blue
    bg: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.45)'
  },
  all_rounder: {
    text: '#fbbf24', // Emas / Gold
    bg: 'rgba(251, 191, 36, 0.16)',
    border: 'rgba(251, 191, 36, 0.45)'
  }
};

/**
 * Calculates weighted skill ratings (Aim, Speed, Acc) from user's best scores
 */
async function calculatePlayerSkills(topScores, lang = 'en') {
  if (!topScores || topScores.length === 0) {
    return {
      aim: 0,
      speed: 0,
      acc: 0,
      aimPct: 33.3,
      speedPct: 33.3,
      accPct: 33.3,
      playstyle: lang === 'id' ? 'Serba Bisa' : 'All-Rounder',
      archetype: 'all_rounder'
    };
  }

  let totalAimWeighted = 0;
  let totalSpeedWeighted = 0;
  let totalAccWeighted = 0;

  const count = Math.min(topScores.length, 25);
  for (let i = 0; i < count; i++) {
    const score = topScores[i];
    const weight = Math.pow(0.95, i);
    try {
      const ppRes = await calculateScorePp(score);
      if (ppRes && ppRes.breakdown) {
        totalAimWeighted += (ppRes.breakdown.aim || 0) * weight;
        totalSpeedWeighted += (ppRes.breakdown.speed || 0) * weight;
        totalAccWeighted += (ppRes.breakdown.acc || 0) * weight;
      } else if (score.pp_breakdown) {
        totalAimWeighted += (score.pp_breakdown.aim || 0) * weight;
        totalSpeedWeighted += (score.pp_breakdown.speed || 0) * weight;
        totalAccWeighted += (score.pp_breakdown.acc || 0) * weight;
      }
    } catch (_) {
      if (score.pp_breakdown) {
        totalAimWeighted += (score.pp_breakdown.aim || 0) * weight;
        totalSpeedWeighted += (score.pp_breakdown.speed || 0) * weight;
        totalAccWeighted += (score.pp_breakdown.acc || 0) * weight;
      }
    }
  }

  const totalSkill = totalAimWeighted + totalSpeedWeighted + totalAccWeighted;
  const aimPct = totalSkill > 0 ? (totalAimWeighted / totalSkill) * 100 : 33.3;
  const speedPct = totalSkill > 0 ? (totalSpeedWeighted / totalSkill) * 100 : 33.3;
  const accPct = totalSkill > 0 ? (totalAccWeighted / totalSkill) * 100 : 33.3;

  let playstyle = lang === 'id' ? 'Serba Bisa' : 'All-Rounder';
  let archetype = 'all_rounder';
  if (aimPct >= 52) {
    playstyle = lang === 'id' ? 'Spesialis Aim' : 'Aim Specialist';
    archetype = 'aim';
  } else if (speedPct >= 35) {
    playstyle = lang === 'id' ? 'Spesialis Speed' : 'Speed Demon';
    archetype = 'speed';
  } else if (accPct >= 28) {
    playstyle = 'Clean Sheet';
    archetype = 'clean_sheet';
  } else if (Math.abs(aimPct - speedPct) < 10) {
    playstyle = lang === 'id' ? 'Hibrida / Versatile' : 'Hybrid / Versatile';
    archetype = 'hybrid';
  }

  return {
    aim: Math.round(totalAimWeighted),
    speed: Math.round(totalSpeedWeighted),
    acc: Math.round(totalAccWeighted),
    aimPct,
    speedPct,
    accPct,
    playstyle,
    archetype
  };
}

/**
 * Generate a visual osu! profile card for Discord (Portrait 900x1340 Wireframe Redesign)
 * @param {object} user - osu! API v2 user object
 * @param {Array} topScores - user's top best scores
 * @param {object} options - options (lang, etc.)
 * @returns {Promise<Buffer>}
 */
async function generateProfileCard(user, topScores = [], options = {}) {
  const lang = options.lang || 'en';
  const isId = lang === 'id';

  // Preload skills, clean vector SVG icons, and Columbina Boba watermark in parallel
  const bobaPath = path.join(__dirname, '..', 'assets', 'images', 'Columbina Boba.jpg');
  const [
    skills,
    icoAim,
    icoSpeed,
    icoAcc,
    icoTrophy,
    icoGlobe,
    icoMapPin,
    icoHeart,
    icoMedal,
    icoTotalPp,
    icoHitAcc,
    icoClock,
    icoGamepad,
    banchoLogoImg,
    bathbotLogoImg,
    bobaImg
  ] = await Promise.all([
    calculatePlayerSkills(topScores, lang),
    getIcon('crosshair', '#f43f5e', 16, { strokeWidth: 2.2 }),
    getIcon('zap', '#a855f7', 16, { strokeWidth: 2.2 }),
    getIcon('target', '#10b981', 16, { strokeWidth: 2.2 }),
    getIcon('trophy', '#f59e0b', 14, { strokeWidth: 2 }),
    getIcon('globe', '#38bdf8', 14, { strokeWidth: 2 }),
    getIcon('map-pin', '#94a3b8', 13, { strokeWidth: 2 }),
    getIcon('heart', '#f472b6', 12, { fill: '#f472b6', strokeWidth: 1 }),
    getIcon('medal', '#fbbf24', 28, { strokeWidth: 1.8 }),
    getIcon('award', '#38bdf8', 14, { strokeWidth: 2 }),
    getIcon('target', '#4ade80', 14, { strokeWidth: 2 }),
    getIcon('clock', '#7dd3fc', 14, { strokeWidth: 2 }),
    getIcon('gamepad-2', '#facc15', 14, { strokeWidth: 2 }),
    getBanchoLogoImage(),
    getBathbotLogoImage(),
    loadImage(bobaPath).catch(() => null)
  ]);

  // Card Dimensions (Compact Portrait 900x920 px)
  const width = 900;
  const height = 920;
  const radius = 28;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Outer container clip
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.clip();

  // 1. Dark base
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  // 2. Background Cover Image (The player's own profile banner)
  const coverUrl = user.cover?.custom_url || user.cover?.url || user.cover_url || (topScores[0]?.beatmapset?.covers && (topScores[0].beatmapset.covers['cover@2x'] || topScores[0].beatmapset.covers.cover)) || null;
  let bgImage = null;
  if (coverUrl) {
    try {
      bgImage = await loadImage(coverUrl);
    } catch (_) {}
  }

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

    // Draw the banner artwork clearly with a gentle softening blur
    ctx.save();
    ctx.filter = 'blur(4px)';
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';
    ctx.restore();

    // Dark gradient overlay: lighter at top so banner art shines, smoothly darkening for text contrast
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, 'rgba(9, 13, 22, 0.40)');
    bgGrad.addColorStop(0.35, 'rgba(9, 13, 22, 0.70)');
    bgGrad.addColorStop(1, 'rgba(9, 13, 22, 0.88)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Ambient Cozy Radial Glows
  const theme = PLAYSTYLE_THEMES[skills.archetype] || PLAYSTYLE_THEMES.all_rounder;
  const glowTop = ctx.createRadialGradient(450, 120, 20, 450, 120, 420);
  glowTop.addColorStop(0, theme.bg);
  glowTop.addColorStop(1, 'rgba(9, 13, 22, 0)');
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, width, height);

  // -------------------------------------------------------------
  // TOP-RIGHT CORNER: COLUMBINA CIRCULAR LOGO ONLY
  // -------------------------------------------------------------
  if (bobaImg) {
    const logoSize = 38;
    const logoX = width - 40 - logoSize;
    const logoY = 24;

    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + (logoSize / 2), logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(bobaImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(244, 63, 94, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(logoX + (logoSize / 2), logoY + (logoSize / 2), logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // -------------------------------------------------------------
  // SECTION 1: TOP IDENTITY CARD & CENTERED FLOATING AVATAR
  // -------------------------------------------------------------
  const topCardX = 40;
  const topCardW = 820;
  const topCardY = 76;
  const topCardH = 138;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(topCardX, topCardY, topCardW, topCardH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Avatar (Centered at Top, overlapping top card)
  const avatarSize = 96;
  const avatarX = 450 - (avatarSize / 2);
  const avatarY = 28;
  const avatarUrl = user.avatar_url || `https://a.ppy.sh/${user.id || 1}`;

  try {
    const avImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(450, avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Glowing border around avatar
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2.8;
    ctx.shadowColor = theme.text;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(450, avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } catch (_) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(450, avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Country Flag on avatar corner (bottom-right of avatar circle)
  const countryCode = user.country?.code || user.country_code;
  if (countryCode) {
    try {
      const flagUrl = `https://osu.ppy.sh/images/flags/${countryCode.toUpperCase()}.png`;
      const flagImg = await loadImage(flagUrl);
      const flagW = 26;
      const flagH = 17;
      const flagX = 450 + (avatarSize / 2) - flagW + 2;
      const flagY = avatarY + avatarSize - flagH + 2;

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

  // Username (Centered)
  ctx.textAlign = 'center';
  ctx.font = `bold 23px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncate(ctx, user.username || 'Player', 480), 450, topCardY + 68);

  // Subtitle: Country Name & Joined Date
  const countryName = user.country?.name || countryCode || '';
  const joinText = formatJoinDate(user.join_date, lang);
  const subInfo = [countryName, joinText].filter(Boolean).join('   •   ');

  ctx.font = `500 12px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(subInfo, 450, topCardY + 90);

  // Rank Badges row inside Top Card (Clean Vector SVG Icons - No Unicode Tofu)
  const stats = user.statistics || {};
  const globalRank = stats.global_rank ? `#${stats.global_rank.toLocaleString()}` : '-';
  const countryRank = stats.country_rank ? `#${stats.country_rank.toLocaleString()}` : '-';
  const peakRank = user.rank_highest?.rank ? `#${user.rank_highest.rank.toLocaleString()}` : null;

  const rankPills = [
    { text: `${globalRank} Global`, icon: icoGlobe, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)' },
    { text: `${countryRank} (${countryCode || ''})`, icon: icoMapPin, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' }
  ];
  if (peakRank) {
    rankPills.push({ text: `Peak ${peakRank}`, icon: icoTrophy, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' });
  }
  if (user.is_supporter) {
    rankPills.push({ text: 'Supporter', icon: icoHeart, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.14)' });
  }

  ctx.font = `bold 12px ${FONT_STACK}`;
  const pillH = 20;
  const pillPad = 9;
  const pillGap = 8;

  const pillWidths = rankPills.map(p => ctx.measureText(p.text).width + (p.icon ? 18 : 0) + (pillPad * 2));
  const totalPillsW = pillWidths.reduce((a, b) => a + b, 0) + ((rankPills.length - 1) * pillGap);
  let pStartX = 450 - (totalPillsW / 2);
  const pPillY = topCardY + 106;

  for (let i = 0; i < rankPills.length; i++) {
    const p = rankPills[i];
    const pW = pillWidths[i];

    ctx.save();
    ctx.fillStyle = p.bg;
    ctx.beginPath();
    ctx.roundRect(pStartX, pPillY, pW, pillH, 10);
    ctx.fill();
    ctx.strokeStyle = p.color + '40';
    ctx.lineWidth = 1;
    ctx.stroke();

    let curTextX = pStartX + pillPad;
    if (p.icon) {
      ctx.drawImage(p.icon, curTextX, pPillY + 4, 12, 12);
      curTextX += 16;
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, curTextX, pPillY + 14);
    ctx.restore();

    pStartX += pW + pillGap;
  }

  // -------------------------------------------------------------
  // SECTION 2: BANCHO CARD (Wireframe: 4 Cards in 2x2 Grid + Level)
  // -------------------------------------------------------------
  const banchoCardX = 40;
  const banchoCardW = 820;
  const banchoCardY = 226;
  const banchoCardH = 258;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(banchoCardX, banchoCardY, banchoCardW, banchoCardH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Bancho Header (Bancho Logo + "Bancho" Text Centered)
  const bTitleText = 'Bancho';
  ctx.font = `bold 16px ${FONT_STACK}`;
  const bTitleW = ctx.measureText(bTitleText).width;
  const bLogoSize = 20;
  const bLogoW = banchoLogoImg ? bLogoSize + 8 : 0;
  const bTotalW = bTitleW + bLogoW;
  const bStartX = 450 - (bTotalW / 2);

  if (banchoLogoImg) {
    ctx.drawImage(banchoLogoImg, bStartX, banchoCardY + 13, bLogoSize, bLogoSize);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(bTitleText, bStartX + bLogoW, banchoCardY + 28);

  // 4 Stat Cards in 2x2 Grid (Total PP, Accuracy, Play Time, Play Count)
  const bGridPad = 20;
  const bGridGap = 12;
  const bCardW = (banchoCardW - (bGridPad * 2) - bGridGap) / 2;
  const bCardH = 58;
  const bGridStartY = banchoCardY + 42;

  const totalPpStr = stats.pp ? `${Math.round(stats.pp).toLocaleString()} pp` : '0 pp';
  const hitAccStr = stats.hit_accuracy ? `${Number(stats.hit_accuracy).toFixed(2)}%` : '0.00%';
  const playTimeStr = formatPlayTime(stats.play_time, lang);
  const playCountStr = stats.play_count ? stats.play_count.toLocaleString() : '0';

  const banchoCards = [
    { label: 'Total PP', value: totalPpStr, color: '#38bdf8', icon: icoTotalPp },
    { label: 'Accuracy', value: hitAccStr, color: '#4ade80', icon: icoHitAcc },
    { label: 'Play Time', value: playTimeStr, color: '#7dd3fc', icon: icoClock },
    { label: 'Play Count', value: playCountStr, color: '#facc15', icon: icoGamepad }
  ];

  for (let idx = 0; idx < 4; idx++) {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const cX = banchoCardX + bGridPad + (col * (bCardW + bGridGap));
    const cY = bGridStartY + (row * (bCardH + bGridGap));

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.beginPath();
    ctx.roundRect(cX, cY, bCardW, bCardH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (banchoCards[idx].icon) {
      ctx.drawImage(banchoCards[idx].icon, cX + 14, cY + 10, 13, 13);
    }

    ctx.textAlign = 'left';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(banchoCards[idx].label, cX + (banchoCards[idx].icon ? 32 : 14), cY + 20);

    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = banchoCards[idx].color;
    ctx.fillText(banchoCards[idx].value, cX + 14, cY + 46);
    ctx.restore();
  }

  // Level & Progress Bar (matching green wireframe bar)
  const levelInfo = stats.level || { current: 1, progress: 0 };
  const lvlY = bGridStartY + (2 * (bCardH + bGridGap)) + 6;
  const lvlBarW = banchoCardW - (bGridPad * 2);

  ctx.textAlign = 'left';
  ctx.font = `bold 12px ${FONT_STACK}`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Level ${levelInfo.current}`, banchoCardX + bGridPad, lvlY + 11);

  ctx.textAlign = 'right';
  ctx.font = `600 12px ${FONT_STACK}`;
  ctx.fillStyle = '#4ade80';
  ctx.fillText(`${levelInfo.progress}%`, banchoCardX + banchoCardW - bGridPad, lvlY + 11);

  // Level Track Bar
  const lvlTrackY = lvlY + 18;
  const lvlH = 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(banchoCardX + bGridPad, lvlTrackY, lvlBarW, lvlH, 4);
  ctx.fill();

  // Green Level Fill with subtle glow
  const lvlFillW = Math.max(lvlH, (levelInfo.progress / 100) * lvlBarW);
  ctx.save();
  const lvlGrad = ctx.createLinearGradient(banchoCardX + bGridPad, lvlTrackY, banchoCardX + bGridPad + lvlFillW, lvlTrackY);
  lvlGrad.addColorStop(0, '#10b981');
  lvlGrad.addColorStop(1, '#4ade80');
  ctx.fillStyle = lvlGrad;
  ctx.shadowColor = 'rgba(74, 222, 128, 0.4)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.roundRect(banchoCardX + bGridPad, lvlTrackY, lvlFillW, lvlH, 4);
  ctx.fill();
  ctx.restore();

  // Extra stats under level bar
  const extraStatsY = lvlTrackY + 20;
  const rankedScore = formatCompactNumber(stats.ranked_score);
  const totalHits = formatCompactNumber(stats.total_hits);
  const maxCombo = stats.maximum_combo ? `${stats.maximum_combo.toLocaleString()}x` : '-';

  ctx.textAlign = 'center';
  ctx.font = `500 11px ${FONT_STACK}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Ranked Score: ${rankedScore}   •   Total Hits: ${totalHits}   •   Max Combo: ${maxCombo}`, 450, extraStatsY);

  // -------------------------------------------------------------
  // SECTION 3: SKILL PROFILE (DIAGRAM ON LEFT, PROGRESS BARS ON RIGHT)
  // -------------------------------------------------------------
  const skillCardX = 40;
  const skillCardW = 820;
  const skillCardY = 496;
  const skillCardH = 196;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(skillCardX, skillCardY, skillCardW, skillCardH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Header: Bathbot Logo + "Skill Profile" on Left + Playstyle Tag on Right
  const sTitleText = isId ? 'Profil Skill (Bathbot)' : 'Skill Profile';
  ctx.font = `bold 16px ${FONT_STACK}`;
  const sLogoSize = 20;
  const sStartX = skillCardX + 22;

  if (bathbotLogoImg) {
    ctx.drawImage(bathbotLogoImg, sStartX, skillCardY + 12, sLogoSize, sLogoSize);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(sTitleText, sStartX + (bathbotLogoImg ? sLogoSize + 8 : 0), skillCardY + 28);

  // Playstyle Tag Badge on top-right of skill card
  ctx.font = `bold 12px ${FONT_STACK}`;
  const tagW = ctx.measureText(skills.playstyle).width + 20;
  const tagH = 22;
  const tagX = skillCardX + skillCardW - 22 - tagW;
  const tagY = skillCardY + 12;

  ctx.fillStyle = theme.bg;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 11);
  ctx.fill();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = theme.text;
  ctx.fillText(skills.playstyle, tagX + 10, tagY + 15);

  // --- LEFT SIDE: CIRCULAR DONUT RATIO CHART (HOLLOW CENTER - NO TEXT) ---
  const donutCenterX = skillCardX + 105;
  const donutCenterY = skillCardY + 104;
  const outerR = 46;
  const innerR = 28;

  const totalPct = (skills.aimPct + skills.speedPct + skills.accPct) || 100;
  const slices = [
    { name: 'Aim', pct: skills.aimPct / totalPct, color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.35)' },
    { name: 'Speed', pct: skills.speedPct / totalPct, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)' },
    { name: 'Accuracy', pct: skills.accPct / totalPct, color: '#10b981', glow: 'rgba(16, 185, 129, 0.35)' }
  ];

  let currentAngle = -Math.PI / 2; // 12 o'clock
  const angleGap = 0.06;

  for (const sl of slices) {
    const sweepAngle = sl.pct * (2 * Math.PI);
    const startA = currentAngle + (angleGap / 2);
    const endA = currentAngle + sweepAngle - (angleGap / 2);

    ctx.save();
    ctx.beginPath();
    ctx.arc(donutCenterX, donutCenterY, outerR, startA, endA, false);
    ctx.arc(donutCenterX, donutCenterY, innerR, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = sl.color;
    ctx.shadowColor = sl.glow;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();

    currentAngle += sweepAngle;
  }
  // Note: Hollow center inside donut, NO text as requested ("Text yang ada di dalam diagram hilangkan")

  // Legend under the Donut Diagram
  const legY = skillCardY + 168;
  const legItems = [
    { label: `${skills.aimPct.toFixed(0)}%`, color: '#f43f5e' },
    { label: `${skills.speedPct.toFixed(0)}%`, color: '#a855f7' },
    { label: `${skills.accPct.toFixed(0)}%`, color: '#10b981' }
  ];
  ctx.font = `600 11px ${FONT_STACK}`;
  const legGap = 10;
  const legWidths = legItems.map(item => ctx.measureText(item.label).width + 12);
  const totalLegW = legWidths.reduce((a, b) => a + b, 0) + (legGap * 2);
  let legStartX = donutCenterX - (totalLegW / 2);

  for (let i = 0; i < legItems.length; i++) {
    const item = legItems[i];
    ctx.save();
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(legStartX + 4, legY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(item.label, legStartX + 12, legY + 4);
    legStartX += legWidths[i] + legGap;
  }

  // --- RIGHT SIDE: 3 SKILL PROGRESS BARS ---
  const skillList = [
    {
      name: isId ? 'AIM / JUMP' : 'AIM / JUMP',
      iconImg: icoAim,
      pp: skills.aim,
      pct: skills.aimPct,
      color: '#f43f5e',
      gradA: '#f43f5e',
      gradB: '#fb923c'
    },
    {
      name: isId ? 'SPEED / TAPPING' : 'SPEED / TAPPING',
      iconImg: icoSpeed,
      pp: skills.speed,
      pct: skills.speedPct,
      color: '#a855f7',
      gradA: '#a855f7',
      gradB: '#ec4899'
    },
    {
      name: isId ? 'AKURASI / TIMING' : 'ACCURACY / TIMING',
      iconImg: icoAcc,
      pp: skills.acc,
      pct: skills.accPct,
      color: '#10b981',
      gradA: '#10b981',
      gradB: '#06b6d4'
    }
  ];

  const rightStartX = skillCardX + 220;
  const rightBarW = skillCardW - 240; // ~580px
  const maxSkillPp = Math.max(skills.aim, skills.speed, skills.acc, 1);
  let skillRowY = skillCardY + 54;

  for (const sk of skillList) {
    if (sk.iconImg) {
      ctx.drawImage(sk.iconImg, rightStartX, skillRowY - 11, 14, 14);
    }

    ctx.textAlign = 'left';
    ctx.font = `600 12px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(sk.name, rightStartX + (sk.iconImg ? 20 : 0), skillRowY);

    ctx.textAlign = 'right';
    ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillStyle = sk.color;
    ctx.fillText(`${sk.pp.toLocaleString()} pp`, rightStartX + rightBarW - 55, skillRowY);

    ctx.font = `500 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`(${sk.pct.toFixed(1)}%)`, rightStartX + rightBarW, skillRowY);

    // Track Bar
    const trackY = skillRowY + 7;
    const barH = 7;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(rightStartX, trackY, rightBarW, barH, 4);
    ctx.fill();

    // Fill Bar
    const fillRatio = Math.max(0.08, Math.min(1, sk.pp / maxSkillPp));
    const fillW = Math.max(barH, rightBarW * fillRatio);

    ctx.save();
    const skGrad = ctx.createLinearGradient(rightStartX, trackY, rightStartX + fillW, trackY);
    skGrad.addColorStop(0, sk.gradA);
    skGrad.addColorStop(1, sk.gradB);
    ctx.fillStyle = skGrad;
    ctx.shadowColor = sk.gradA;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(rightStartX, trackY, fillW, barH, 4);
    ctx.fill();
    ctx.restore();

    skillRowY += 44;
  }

  // -------------------------------------------------------------
  // SECTION 4: MEDAL & GRADES CARD (Wireframe: Below Skill Profile)
  // -------------------------------------------------------------
  const medalCardX = 40;
  const medalCardW = 820;
  const medalCardY = 704;
  const medalCardH = 146;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.beginPath();
  ctx.roundRect(medalCardX, medalCardY, medalCardW, medalCardH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Medal Banner Row (Top of Medal Card)
  const medalsCount = user.user_achievements ? user.user_achievements.length : 0;
  const mBannerX = medalCardX + 20;
  const mBannerY = medalCardY + 12;
  const mBannerW = medalCardW - 40;
  const mBannerH = 38;

  ctx.save();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
  ctx.beginPath();
  ctx.roundRect(mBannerX, mBannerY, mBannerW, mBannerH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.30)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (icoMedal) {
    ctx.drawImage(icoMedal, mBannerX + 14, mBannerY + 7, 24, 24);
  }

  ctx.textAlign = 'left';
  ctx.font = `bold 15px ${FONT_STACK}`;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`${medalsCount} ${isId ? 'Medali Terbuka' : 'Medals Unlocked'}`, mBannerX + 46, mBannerY + 24);

  ctx.textAlign = 'right';
  ctx.font = `500 11px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(isId ? 'Pencapaian Resmi osu!' : 'Official osu! Achievements', mBannerX + mBannerW - 14, mBannerY + 24);
  ctx.restore();

  // 5 Grade Badges Row (SS Silver, SS Gold, S Silver, S Gold, A)
  const grades = stats.grade_counts || {};
  const gradeItems = [
    { label: 'SS', sub: 'Silver', count: grades.ssh || 0, color: '#e2e8f0', bg: 'rgba(226, 232, 240, 0.08)' },
    { label: 'SS', sub: 'Gold', count: grades.ss || 0, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)' },
    { label: 'S', sub: 'Silver', count: grades.sh || 0, color: '#93c5fd', bg: 'rgba(147, 197, 253, 0.08)' },
    { label: 'S', sub: 'Gold', count: grades.s || 0, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
    { label: 'A', sub: '', count: grades.a || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)' }
  ];

  const gGap = 10;
  const gBoxW = (medalCardW - 40 - (gGap * 4)) / 5;
  const gBoxH = 62;
  const gStartY = medalCardY + 60;

  for (let i = 0; i < gradeItems.length; i++) {
    const g = gradeItems[i];
    const gX = medalCardX + 20 + (i * (gBoxW + gGap));

    ctx.save();
    ctx.fillStyle = g.bg;
    ctx.beginPath();
    ctx.roundRect(gX, gStartY, gBoxW, gBoxH, 10);
    ctx.fill();
    ctx.strokeStyle = g.color + '35';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = g.color;
    ctx.fillText(g.label, gX + 10, gStartY + 28);

    ctx.textAlign = 'right';
    ctx.font = `bold 15px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(g.count.toLocaleString(), gX + gBoxW - 10, gStartY + 27);

    if (g.sub) {
      ctx.font = `500 10px ${FONT_STACK}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(g.sub, gX + gBoxW - 10, gStartY + 44);
    }
    ctx.restore();
  }

  // -------------------------------------------------------------
  // FOOTER WATERMARK WITH CIRCULAR COLUMBINA BOBA ICON BESIDE CREDIT
  // -------------------------------------------------------------
  const footerY = 868;
  const footerText = 'Columbina Bot • osu! Player Profile Showcase';
  ctx.font = `500 12px ${FONT_STACK}`;
  const fTextW = ctx.measureText(footerText).width;
  const bobaSize = 24;
  const fTotalW = bobaSize + 10 + fTextW;
  const fStartX = 450 - (fTotalW / 2);

  if (bobaImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(fStartX + (bobaSize / 2), footerY + (bobaSize / 2), bobaSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(bobaImg, fStartX, footerY, bobaSize, bobaSize);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = 'rgba(244, 63, 94, 0.4)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(fStartX + (bobaSize / 2), footerY + (bobaSize / 2), bobaSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(footerText, fStartX + (bobaImg ? bobaSize + 10 : 0), footerY + 16);

  // Return PNG Buffer
  return canvas.toBuffer('image/png');
}

module.exports = {
  generateProfileCard,
  calculatePlayerSkills
};
