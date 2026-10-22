const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// In-memory cache for fast lookups
let usersCache = {};

function loadUsers() {
  try {
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile, 'utf8');
      usersCache = JSON.parse(data);
    } else {
      usersCache = {};
      saveUsers();
    }
  } catch (err) {
    console.error('Error membaca database users.json:', err.message);
    usersCache = {};
  }
}

function saveUsers() {
  try {
    const tempFile = `${dbFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(usersCache, null, 2), 'utf8');
    fs.renameSync(tempFile, dbFile);
  } catch (err) {
    console.error('Error menyimpan database users.json:', err.message);
  }
}

// Initialize on module load
loadUsers();

/**
 * Get linked osu! user for a Discord ID
 * @param {string} discordId 
 * @returns {object|null} { discordId, osuId, osuUsername, linkedAt }
 */
function getLinkedUser(discordId) {
  if (!discordId) return null;
  return usersCache[String(discordId)] || null;
}

/**
 * Link a Discord ID to an osu! user
 * @param {string} discordId 
 * @param {number} osuId 
 * @param {string} osuUsername 
 * @returns {object}
 */
function linkUser(discordId, osuId, osuUsername) {
  const record = {
    discordId: String(discordId),
    osuId: parseInt(osuId, 10),
    osuUsername: String(osuUsername),
    linkedAt: new Date().toISOString()
  };
  usersCache[String(discordId)] = record;
  saveUsers();
  return record;
}

/**
 * Get user's preferred language (defaults to 'en')
 * @param {string} discordId 
 * @returns {'en'|'id'}
 */
function getUserLanguage(discordId) {
  if (!discordId) return 'en';
  const user = usersCache[String(discordId)];
  return (user && user.language === 'id') ? 'id' : 'en';
}

/**
 * Set user's preferred language ('en' or 'id')
 * @param {string} discordId 
 * @param {'en'|'id'} language 
 * @returns {'en'|'id'}
 */
function setUserLanguage(discordId, language) {
  const id = String(discordId);
  const lang = (language === 'id') ? 'id' : 'en';
  if (usersCache[id]) {
    usersCache[id].language = lang;
  } else {
    usersCache[id] = {
      discordId: id,
      language: lang,
      updatedAt: new Date().toISOString()
    };
  }
  saveUsers();
  return lang;
}

/**
 * Unlink an osu! account from a Discord ID
 * @param {string} discordId 
 * @returns {boolean}
 */
function unlinkUser(discordId) {
  const id = String(discordId);
  if (usersCache[id]) {
    delete usersCache[id];
    saveUsers();
    return true;
  }
  return false;
}

module.exports = {
  getLinkedUser,
  linkUser,
  unlinkUser,
  getUserLanguage,
  setUserLanguage
};
