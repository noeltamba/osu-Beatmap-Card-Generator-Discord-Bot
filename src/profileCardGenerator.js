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
    text: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.16)',
    border: 'rgba(244, 63, 94, 0.45)'
  },
  aim: {
    text: '#c084fc', // Ungu / Purple
    bg: 'rgba(192, 132, 252, 0.16)',
    border: 'rgba(192, 132, 252, 0.45)'
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
      }
    } catch (_) {}
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
 * Generate a visual osu! profile card for Discord
 * @param {object} user - osu! API v2 user object
 * @param {Array} topScores - user's top best scores
 * @param {object} options - options (lang, etc.)
 * @returns {Promise<Buffer>}
 */
async function generateProfileCard(user, topScores = [], options = {}) {
  const lang = options.lang || 'en';
  const isId = lang === 'id';

  // Preload skills and clean vector SVG icons in parallel
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
    bathbotLogoImg
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
    getIcon('award', '#38bdf8', 13, { strokeWidth: 2 }),
    getIcon('target', '#4ade80', 13, { strokeWidth: 2 }),
    getIcon('clock', '#7dd3fc', 13, { strokeWidth: 2 }),
    getIcon('gamepad-2', '#facc15', 13, { strokeWidth: 2 }),
    getBanchoLogoImage(),
    getBathbotLogoImage()
  ]);

  const width = 1180;
  const height = 690;
  const outerMargin = 26;

  const contentX = outerMargin;
  const contentY = outerMargin;
  const contentW = width - (outerMargin * 2);
  const contentH = height - (outerMargin * 2);
  const contentRadius = 20;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Outer container clip
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, 26);
  ctx.clip();

  // 1. Dark base
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, width, height);

  // 2. Background Cover Image
  const coverUrl = user.cover?.url || user.cover_url || (topScores[0]?.beatmapset?.covers && topScores[0].beatmapset.covers['cover@2x']);
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

    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);

    // Subtle dark outer vignette
    ctx.fillStyle = 'rgba(4, 6, 14, 0.45)';
    ctx.fillRect(0, 0, width, height);

    // Frosted Glass Content Box
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, contentW, contentH, contentRadius);
    ctx.clip();

    ctx.filter = 'blur(22px)';
    ctx.drawImage(bgImage, drawX, drawY, drawW, drawH);
    ctx.filter = 'none';

    // Dark semi-transparent tint for ultra clarity
    ctx.fillStyle = 'rgba(8, 12, 22, 0.86)';
    ctx.fillRect(contentX, contentY, contentW, contentH);
    ctx.restore();
  } else {
    // Elegant dark gradient fallback
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(contentX, contentY, contentW, contentH, contentRadius);
    ctx.clip();
    const grad = ctx.createLinearGradient(contentX, contentY, contentX + contentW, contentY + contentH);
    grad.addColorStop(0, '#0d1527');
    grad.addColorStop(1, '#080c18');
    ctx.fillStyle = grad;
    ctx.fillRect(contentX, contentY, contentW, contentH);
    ctx.restore();
  }

  // Frosted Glass Border
  ctx.save();
  const glassBorder = ctx.createLinearGradient(contentX, contentY, contentX, contentY + contentH);
  glassBorder.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  glassBorder.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
  glassBorder.addColorStop(1, 'rgba(255, 255, 255, 0.20)');
  ctx.strokeStyle = glassBorder;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(contentX, contentY, contentW, contentH, contentRadius);
  ctx.stroke();
  ctx.restore();

  // INNER PADDING
  const pad = 28;
  const innerX = contentX + pad;
  const innerY = contentY + pad;
  const innerW = contentW - (pad * 2);

  // -------------------------------------------------------------
  // SECTION 1: HEADER (Avatar, User Identity, Rank Badges)
  // -------------------------------------------------------------
  const avatarSize = 92;
  const avatarX = innerX;
  const avatarY = innerY;
  const avatarUrl = user.avatar_url || `https://a.ppy.sh/${user.id || 1}`;

  // Avatar drawing
  try {
    const avImg = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Border
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } catch (_) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Country Flag on avatar corner
  const countryCode = user.country?.code || user.country_code;
  if (countryCode) {
    try {
      const flagUrl = `https://osu.ppy.sh/images/flags/${countryCode.toUpperCase()}.png`;
      const flagImg = await loadImage(flagUrl);
      const flagW = 26;
      const flagH = 17;
      const flagX = avatarX + avatarSize - flagW;
      const flagY = avatarY + avatarSize - flagH;

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

  // Username and subtitle info
  const textLeftX = avatarX + avatarSize + 20;
  ctx.textAlign = 'left';
  ctx.font = `bold 32px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncate(ctx, user.username || 'Player', 420), textLeftX, avatarY + 36);

  // Supporter badge or Country info
  const countryName = user.country?.name || countryCode || '';
  const joinText = formatJoinDate(user.join_date, lang);
  const subInfo = [countryName, joinText].filter(Boolean).join(' • ');

  ctx.font = `500 14px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(subInfo, textLeftX, avatarY + 62);

  // Supporter tag if active
  if (user.is_supporter) {
    const suppText = 'osu! Supporter';
    ctx.font = `bold 12px ${FONT_STACK}`;
    const textW = ctx.measureText(suppText).width;
    const suppW = textW + 30;
    const suppH = 20;
    const suppX = textLeftX;
    const suppY = avatarY + 72;

    ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
    ctx.beginPath();
    ctx.roundRect(suppX, suppY, suppW, suppH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (icoHeart) {
      ctx.drawImage(icoHeart, suppX + 8, suppY + 4, 12, 12);
    }
    ctx.fillStyle = '#f472b6';
    ctx.fillText(suppText, suppX + 23, suppY + 14);
  }

  // Rank Badges Cluster on Top Right
  const stats = user.statistics || {};
  const globalRank = stats.global_rank ? `#${stats.global_rank.toLocaleString()}` : '-';
  const countryRank = stats.country_rank ? `#${stats.country_rank.toLocaleString()}` : '-';
  const peakRank = user.rank_highest?.rank ? `#${user.rank_highest.rank.toLocaleString()}` : null;

  const badgeBoxW = 160;
  const badgeBoxH = 76;
  const badgeRight = innerX + innerW;

  // Peak Rank Badge (if available)
  let curRightX = badgeRight;
  if (peakRank) {
    curRightX -= badgeBoxW;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.10)';
    ctx.beginPath();
    ctx.roundRect(curRightX, avatarY + 8, badgeBoxW, badgeBoxH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const peakTitle = isId ? 'RANK TERTINGGI' : 'PEAK RANK';
    ctx.font = `600 12px ${FONT_STACK}`;
    const pTitleW = ctx.measureText(peakTitle).width;
    const pTotalW = (icoTrophy ? 18 : 0) + pTitleW;
    const pStartX = curRightX + ((badgeBoxW - pTotalW) / 2);

    if (icoTrophy) {
      ctx.drawImage(icoTrophy, pStartX, avatarY + 22, 14, 14);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(peakTitle, pStartX + (icoTrophy ? 18 : 0), avatarY + 34);

    ctx.textAlign = 'center';
    ctx.font = `bold 22px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(peakRank, curRightX + (badgeBoxW / 2), avatarY + 64);
    curRightX -= 14;
  }

  // Country Rank Badge
  curRightX -= badgeBoxW;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.10)';
  ctx.beginPath();
  ctx.roundRect(curRightX, avatarY + 8, badgeBoxW, badgeBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const cTitle = isId ? `NEGARA (${countryCode || ''})` : `COUNTRY (${countryCode || ''})`;
  ctx.font = `600 12px ${FONT_STACK}`;
  const cTitleW = ctx.measureText(cTitle).width;
  const cTotalW = (icoMapPin ? 17 : 0) + cTitleW;
  const cStartX = curRightX + ((badgeBoxW - cTotalW) / 2);

  if (icoMapPin) {
    ctx.drawImage(icoMapPin, cStartX, avatarY + 22, 13, 13);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(cTitle, cStartX + (icoMapPin ? 17 : 0), avatarY + 34);

  ctx.textAlign = 'center';
  ctx.font = `bold 22px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(countryRank, curRightX + (badgeBoxW / 2), avatarY + 64);
  curRightX -= 14;

  // Global Rank Badge
  curRightX -= (badgeBoxW + 20);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.beginPath();
  ctx.roundRect(curRightX, avatarY + 8, badgeBoxW + 20, badgeBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.50)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const gTitle = 'GLOBAL RANK';
  ctx.font = `600 12px ${FONT_STACK}`;
  const gTitleW = ctx.measureText(gTitle).width;
  const gTotalW = (icoGlobe ? 18 : 0) + gTitleW;
  const gStartX = curRightX + (((badgeBoxW + 20) - gTotalW) / 2);

  if (icoGlobe) {
    ctx.drawImage(icoGlobe, gStartX, avatarY + 22, 14, 14);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(gTitle, gStartX + (icoGlobe ? 18 : 0), avatarY + 34);

  ctx.textAlign = 'center';
  ctx.font = `bold 24px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(globalRank, curRightX + ((badgeBoxW + 20) / 2), avatarY + 64);

  // -------------------------------------------------------------
  // SECTION 2: MIDDLE SECTION (2 Columns: Bathbot Skill vs Bancho Stats)
  // -------------------------------------------------------------
  const midY = avatarY + avatarSize + 32;
  const colGap = 24;
  const colW = (innerW - colGap) / 2; // ~524px each
  const colH = 290;

  // =================== COLUMN 1: SKILL PROFILE (Bathbot) ===================
  const col1X = innerX;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.roundRect(col1X, midY, colW, colH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Column 1 Title: Bathbot Logo (Green) + Title Text
  const col1Pad = 22;
  const logoSize = 26;
  const logoY = midY + 14;

  if (bathbotLogoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(col1X + col1Pad, logoY, logoSize, logoSize, 6);
    ctx.clip();
    ctx.drawImage(bathbotLogoImg, col1X + col1Pad, logoY, logoSize, logoSize);
    ctx.restore();

    // Glowing Green Border
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(col1X + col1Pad, logoY, logoSize, logoSize, 6);
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillStyle = '#34d399';
  const col1TitleX = col1X + col1Pad + (bathbotLogoImg ? logoSize + 10 : 0);
  ctx.fillText(isId ? 'PROFIL SKILL (BATHBOT)' : 'SKILL PROFILE (BATHBOT)', col1TitleX, midY + 33);

  // Playstyle Tag Badge
  const theme = PLAYSTYLE_THEMES[skills.archetype] || PLAYSTYLE_THEMES.all_rounder;
  ctx.font = `bold 12px ${FONT_STACK}`;
  const tagW = ctx.measureText(skills.playstyle).width + 20;
  const tagH = 24;
  const tagX = col1X + colW - col1Pad - tagW;
  const tagY = midY + 18;

  ctx.fillStyle = theme.bg;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 12);
  ctx.fill();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = theme.text;
  ctx.fillText(skills.playstyle, tagX + 10, tagY + 16);

  // Skill Bars: Aim, Speed, Accuracy
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

  let skillY = midY + 68;
  const barW = colW - (col1Pad * 2);
  const barH = 12;

  // Find max PP among the 3 to scale relative fill width
  const maxSkillPp = Math.max(skills.aim, skills.speed, skills.acc, 1);

  for (const sk of skillList) {
    // Icon
    if (sk.iconImg) {
      ctx.drawImage(sk.iconImg, col1X + col1Pad, skillY - 13, 16, 16);
    }

    // Name
    ctx.textAlign = 'left';
    ctx.font = `600 13px ${FONT_STACK}`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(sk.name, col1X + col1Pad + (sk.iconImg ? 22 : 0), skillY);

    // Value & Percentage
    ctx.textAlign = 'right';
    ctx.font = `bold 14px ${FONT_STACK}`;
    ctx.fillStyle = sk.color;
    ctx.fillText(`${sk.pp.toLocaleString()} pp`, col1X + colW - col1Pad - 55, skillY);

    ctx.font = `500 12px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`(${sk.pct.toFixed(1)}%)`, col1X + colW - col1Pad, skillY);

    // Track Bar
    const trackY = skillY + 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(col1X + col1Pad, trackY, barW, barH, 6);
    ctx.fill();

    // Fill Bar with Gradient
    const fillRatio = Math.max(0.08, Math.min(1, sk.pp / maxSkillPp));
    const fillW = Math.max(barH, barW * fillRatio);

    ctx.save();
    const skGrad = ctx.createLinearGradient(col1X + col1Pad, trackY, col1X + col1Pad + fillW, trackY);
    skGrad.addColorStop(0, sk.gradA);
    skGrad.addColorStop(1, sk.gradB);
    ctx.fillStyle = skGrad;
    ctx.shadowColor = sk.gradA;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(col1X + col1Pad, trackY, fillW, barH, 6);
    ctx.fill();
    ctx.restore();

    skillY += 48;
  }

  // Combined Ratio Bar (Distribution of Aim, Speed, Acc)
  const distY = midY + colH - 46;
  ctx.textAlign = 'left';
  ctx.font = `600 12px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(isId ? 'Distribusi Gaya Bermain:' : 'Skill Distribution Ratio:', col1X + col1Pad, distY);

  const segBarY = distY + 8;
  const segH = 10;
  const segAimW = Math.round((skills.aimPct / 100) * barW);
  const segSpdW = Math.round((skills.speedPct / 100) * barW);
  const segAccW = barW - segAimW - segSpdW;

  // Clip segmented bar
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(col1X + col1Pad, segBarY, barW, segH, 5);
  ctx.clip();

  // Aim segment
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(col1X + col1Pad, segBarY, segAimW, segH);
  // Speed segment
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(col1X + col1Pad + segAimW, segBarY, segSpdW, segH);
  // Acc segment
  ctx.fillStyle = '#10b981';
  ctx.fillRect(col1X + col1Pad + segAimW + segSpdW, segBarY, segAccW, segH);
  ctx.restore();

  // =================== COLUMN 2: BANCHO PERFORMANCE ===================
  const col2X = innerX + colW + colGap;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.beginPath();
  ctx.roundRect(col2X, midY, colW, colH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Column 2 Title: Bancho Logo (Blue) + Title Text
  const col2Pad = 22;
  const bLogoY = midY + 14;

  if (banchoLogoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(col2X + col2Pad, bLogoY, logoSize, logoSize, 6);
    ctx.clip();
    ctx.drawImage(banchoLogoImg, col2X + col2Pad, bLogoY, logoSize, logoSize);
    ctx.restore();

    // Glowing Blue Border
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(col2X + col2Pad, bLogoY, logoSize, logoSize, 6);
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.fillStyle = '#38bdf8';
  const col2TitleX = col2X + col2Pad + (banchoLogoImg ? logoSize + 10 : 0);
  ctx.fillText(isId ? 'PERFORMA BANCHO (OFFICIAL)' : 'BANCHO PERFORMANCE', col2TitleX, midY + 33);

  // 4 Big Stat Cards (2x2 Grid)
  const gridGap = 12;
  const cardW = (colW - (col2Pad * 2) - gridGap) / 2;
  const cardH = 68;

  const totalPpStr = stats.pp ? `${Math.round(stats.pp).toLocaleString()} pp` : '0 pp';
  const hitAccStr = stats.hit_accuracy ? `${Number(stats.hit_accuracy).toFixed(2)}%` : '0.00%';
  const playTimeStr = formatPlayTime(stats.play_time, lang);
  const playCountStr = stats.play_count ? stats.play_count.toLocaleString() : '0';

  const banchoCards = [
    { label: 'TOTAL PP', value: totalPpStr, color: '#38bdf8', icon: icoTotalPp },
    { label: isId ? 'AKURASI' : 'ACCURACY', value: hitAccStr, color: '#4ade80', icon: icoHitAcc },
    { label: isId ? 'WAKTU MAIN' : 'PLAY TIME', value: playTimeStr, color: '#7dd3fc', icon: icoClock },
    { label: isId ? 'TOTAL PLAY' : 'PLAY COUNT', value: playCountStr, color: '#facc15', icon: icoGamepad }
  ];

  for (let idx = 0; idx < 4; idx++) {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const cX = col2X + col2Pad + (col * (cardW + gridGap));
    const cY = midY + 54 + (row * (cardH + gridGap));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(cX, cY, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Card Icon
    if (banchoCards[idx].icon) {
      ctx.drawImage(banchoCards[idx].icon, cX + 12, cY + 11, 13, 13);
    }

    ctx.textAlign = 'left';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillStyle = '#94a3b8';
    const labelX = cX + (banchoCards[idx].icon ? 30 : 12);
    ctx.fillText(banchoCards[idx].label, labelX, cY + 22);

    ctx.font = `bold 20px ${FONT_STACK}`;
    ctx.fillStyle = banchoCards[idx].color;
    ctx.fillText(banchoCards[idx].value, cX + 12, cY + 50);
  }

  // Level & Progress Bar
  const levelInfo = stats.level || { current: 1, progress: 0 };
  const lvlY = midY + 54 + (2 * (cardH + gridGap)) + 4;
  const lvlBarW = colW - (col2Pad * 2);

  ctx.textAlign = 'left';
  ctx.font = `bold 14px ${FONT_STACK}`;
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Level ${levelInfo.current}`, col2X + col2Pad, lvlY + 14);

  ctx.textAlign = 'right';
  ctx.font = `600 13px ${FONT_STACK}`;
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`${levelInfo.progress}%`, col2X + colW - col2Pad, lvlY + 14);

  // Level Track
  const lvlTrackY = lvlY + 22;
  const lvlH = 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(col2X + col2Pad, lvlTrackY, lvlBarW, lvlH, 4);
  ctx.fill();

  // Level Fill
  const lvlFillW = Math.max(lvlH, (levelInfo.progress / 100) * lvlBarW);
  ctx.save();
  const lvlGrad = ctx.createLinearGradient(col2X + col2Pad, lvlTrackY, col2X + col2Pad + lvlFillW, lvlTrackY);
  lvlGrad.addColorStop(0, '#0284c7');
  lvlGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = lvlGrad;
  ctx.beginPath();
  ctx.roundRect(col2X + col2Pad, lvlTrackY, lvlFillW, lvlH, 4);
  ctx.fill();
  ctx.restore();

  // Additional stats row: Ranked Score, Total Hits, Max Combo
  const extraStatsY = lvlTrackY + 24;
  const rankedScore = formatCompactNumber(stats.ranked_score);
  const totalHits = formatCompactNumber(stats.total_hits);
  const maxCombo = stats.maximum_combo ? `${stats.maximum_combo.toLocaleString()}x` : '-';

  ctx.textAlign = 'left';
  ctx.font = `500 12px ${FONT_STACK}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(isId ? 'Ranked Score:' : 'Ranked Score:', col2X + col2Pad, extraStatsY);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(` ${rankedScore}`, col2X + col2Pad + 80, extraStatsY);

  ctx.fillStyle = '#64748b';
  ctx.fillText(isId ? 'Total Hits:' : 'Total Hits:', col2X + col2Pad + 160, extraStatsY);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(` ${totalHits}`, col2X + col2Pad + 225, extraStatsY);

  ctx.fillStyle = '#64748b';
  ctx.fillText(isId ? 'Max Combo:' : 'Max Combo:', col2X + col2Pad + 305, extraStatsY);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(` ${maxCombo}`, col2X + col2Pad + 375, extraStatsY);

  // -------------------------------------------------------------
  // SECTION 3: BOTTOM SECTION (Grade Showcase & Medals)
  // -------------------------------------------------------------
  const botY = midY + colH + 20;
  const botH = 88;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.beginPath();
  ctx.roundRect(innerX, botY, innerW, botH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Grade Counts
  const grades = stats.grade_counts || {};
  const gradeItems = [
    { label: 'SS', sub: 'Silver', count: grades.ssh || 0, color: '#e2e8f0', bg: 'rgba(226, 232, 240, 0.12)' },
    { label: 'SS', sub: 'Gold', count: grades.ss || 0, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)' },
    { label: 'S', sub: 'Silver', count: grades.sh || 0, color: '#93c5fd', bg: 'rgba(147, 197, 253, 0.12)' },
    { label: 'S', sub: 'Gold', count: grades.s || 0, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    { label: 'A', sub: '', count: grades.a || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' }
  ];

  const gradeBoxW = 120;
  const gradeBoxH = 56;
  const gradeStartY = botY + 16;
  let gradeStartX = innerX + 20;

  for (const g of gradeItems) {
    ctx.fillStyle = g.bg;
    ctx.beginPath();
    ctx.roundRect(gradeStartX, gradeStartY, gradeBoxW, gradeBoxH, 12);
    ctx.fill();
    ctx.strokeStyle = g.color + '40';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Grade Letter
    ctx.textAlign = 'left';
    ctx.font = `bold 24px ${FONT_STACK}`;
    ctx.fillStyle = g.color;
    ctx.fillText(g.label, gradeStartX + 14, gradeStartY + 36);

    // Grade Count
    ctx.textAlign = 'right';
    ctx.font = `bold 18px ${FONT_STACK}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(g.count.toLocaleString(), gradeStartX + gradeBoxW - 14, gradeStartY + 32);

    if (g.sub) {
      ctx.font = `500 10px ${FONT_STACK}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(g.sub, gradeStartX + gradeBoxW - 14, gradeStartY + 46);
    }

    gradeStartX += gradeBoxW + 14;
  }

  // Medals Badge on Bottom Right
  const medalsCount = user.user_achievements ? user.user_achievements.length : 0;
  const medalBoxW = 210;
  const medalBoxX = innerX + innerW - medalBoxW - 20;

  ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
  ctx.beginPath();
  ctx.roundRect(medalBoxX, gradeStartY, medalBoxW, gradeBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.40)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (icoMedal) {
    ctx.drawImage(icoMedal, medalBoxX + 14, gradeStartY + 14, 28, 28);
  }

  ctx.textAlign = 'left';
  ctx.font = `bold 18px ${FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${medalsCount} ${isId ? 'Medali' : 'Medals'}`, medalBoxX + 50, gradeStartY + 30);

  ctx.font = `500 11px ${FONT_STACK}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(isId ? 'Pencapaian Akun' : 'osu! Achievements', medalBoxX + 50, gradeStartY + 46);

  // Return PNG Buffer
  return canvas.toBuffer('image/png');
}

module.exports = {
  generateProfileCard,
  calculatePlayerSkills
};
