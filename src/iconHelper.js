const fs = require('fs');
const path = require('path');
const { loadImage } = require('@napi-rs/canvas');

const iconCache = new Map();

/**
 * Get a colored Lucide SVG icon as a Canvas Image
 * @param {string} name - icon name from lucide-static (e.g. 'crosshair', 'zap', 'target', 'trophy', 'medal', 'clock', 'gamepad-2', 'heart', 'globe', 'bot', 'map-pin', 'star', 'bar-chart-2')
 * @param {string} color - stroke color
 * @param {number} size - pixel size
 * @param {object} [options] - fill, strokeWidth
 * @returns {Promise<Image|null>}
 */
async function getIcon(name, color = '#ffffff', size = 20, options = {}) {
  const fill = options.fill || 'none';
  const strokeWidth = options.strokeWidth || 2;
  const cacheKey = `${name}:${color}:${fill}:${size}:${strokeWidth}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  const iconPath = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icons', `${name}.svg`);
  if (!fs.existsSync(iconPath)) return null;

  try {
    let svg = fs.readFileSync(iconPath, 'utf-8');
    svg = svg
      .replace(/stroke="currentColor"/g, `stroke="${color}"`)
      .replace(/fill="none"/g, `fill="${fill}"`)
      .replace(/width="24"/g, `width="${size}"`)
      .replace(/height="24"/g, `height="${size}"`)
      .replace(/stroke-width="2"/g, `stroke-width="${strokeWidth}"`);

    const img = await loadImage(Buffer.from(svg));
    iconCache.set(cacheKey, img);
    return img;
  } catch (e) {
    console.warn(`Failed to render icon ${name}:`, e.message);
    return null;
  }
}

/**
 * Official osu! Pink Circular Logo
 */
async function getOsuLogo(size = 22) {
  const cacheKey = `osu-logo:${size}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="#e45999"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="#ffffff" stroke-width="6"/>
    <text x="50" y="65" font-family="'Torus', 'Segoe UI', Arial, sans-serif" font-weight="900" font-size="40" fill="#ffffff" text-anchor="middle">osu!</text>
  </svg>`;
  try {
    const img = await loadImage(Buffer.from(svg));
    iconCache.set(cacheKey, img);
    return img;
  } catch (_) {
    return null;
  }
}

/**
 * Bathbot Logo (The iconic cute duck bathbot logo)
 */
async function getBathbotLogo(size = 22) {
  const cacheKey = `bathbot-logo:${size}`;
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8"/>
        <stop offset="100%" stop-color="#0284c7"/>
      </linearGradient>
      <linearGradient id="duckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <!-- Rounded Background Badge -->
    <rect width="100" height="100" rx="26" fill="url(#bgGrad)"/>
    <!-- Bubbles -->
    <circle cx="28" cy="28" r="6" fill="#ffffff" opacity="0.6"/>
    <circle cx="38" cy="20" r="4" fill="#ffffff" opacity="0.7"/>
    <!-- Duck Body -->
    <path d="M26 60 C26 46 44 46 54 48 C60 38 72 38 78 48 C85 54 84 64 78 70 C70 76 34 76 26 60 Z" fill="url(#duckGrad)"/>
    <!-- Duck Head -->
    <circle cx="68" cy="46" r="16" fill="url(#duckGrad)"/>
    <!-- Duck Eye -->
    <circle cx="72" cy="42" r="3" fill="#0f172a"/>
    <!-- Duck Beak -->
    <path d="M82 46 Q94 48 84 54 Z" fill="#ea580c"/>
    <!-- Water Waves -->
    <path d="M14 78 Q28 72 44 78 T74 78 T92 78" stroke="#ffffff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.85"/>
  </svg>`;
  try {
    const img = await loadImage(Buffer.from(svg));
    iconCache.set(cacheKey, img);
    return img;
  } catch (_) {
    return null;
  }
}

let bathbotImgCache = null;
async function getBathbotLogoImage() {
  if (bathbotImgCache) return bathbotImgCache;
  const p = path.join(__dirname, '..', 'assets', 'images', 'bathbot_logo.png');
  if (fs.existsSync(p)) {
    try {
      bathbotImgCache = await loadImage(p);
      return bathbotImgCache;
    } catch (_) {}
  }
  return null;
}

let banchoImgCache = null;
async function getBanchoLogoImage() {
  if (banchoImgCache) return banchoImgCache;
  const p = path.join(__dirname, '..', 'assets', 'images', 'bancho_logo.png');
  if (fs.existsSync(p)) {
    try {
      banchoImgCache = await loadImage(p);
      return banchoImgCache;
    } catch (_) {}
  }
  return null;
}

module.exports = {
  getIcon,
  getOsuLogo,
  getBathbotLogo,
  getBathbotLogoImage,
  getBanchoLogoImage
};

