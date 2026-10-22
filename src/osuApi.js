const { calculateScorePp } = require('./ppCalculator');

/**
 * osu! API v2 Client with automatic OAuth token management
 */

class OsuApi {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.tokenExpiresAt = 0;
    this.beatmapCache = new Map();
    this.attributesCache = new Map();
  }

  async getAccessToken() {
    // If token exists and is valid for at least 60 more seconds, reuse it
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) {
      return this.token;
    }

    if (!this.clientId || this.clientId === 'your_osu_client_id_here' || !this.clientSecret || this.clientSecret === 'your_osu_client_secret_here' || this.clientSecret === 'ISI_CLIENT_SECRET_KAMU_DISINI') {
      throw new Error('OSU_CLIENT_ID atau OSU_CLIENT_SECRET belum diisi di file .env! Harap masukkan kredensial osu! OAuth Anda.');
    }

    const response = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: parseInt(this.clientId, 10),
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'public'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gagal autentikasi osu! API (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    return this.token;
  }

  getDefaultHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'x-api-version': '20240101'
    };
  }

  async getBeatmap(beatmapId) {
    if (this.beatmapCache.has(beatmapId)) {
      return this.beatmapCache.get(beatmapId);
    }

    const token = await this.getAccessToken();

    const response = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
      headers: this.getDefaultHeaders(token)
    });

    if (response.status === 404) {
      throw new Error(`Beatmap dengan ID ${beatmapId} tidak ditemukan.`);
    }

    if (!response.ok) {
      throw new Error(`Gagal mengambil data beatmap: HTTP ${response.status}`);
    }

    const data = await response.json();
    this.beatmapCache.set(beatmapId, data);
    return data;
  }

  async getBeatmapset(setId) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://osu.ppy.sh/api/v2/beatmapsets/${setId}`, {
      headers: this.getDefaultHeaders(token)
    });

    if (response.status === 404) {
      throw new Error(`Beatmapset dengan ID ${setId} tidak ditemukan.`);
    }

    if (!response.ok) {
      throw new Error(`Gagal mengambil data beatmapset: HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getBeatmapAttributes(beatmapId, mods = [], ruleset = 'osu') {
    const cleanMods = (mods || []).map(m => typeof m === 'string' ? m.toUpperCase() : (m.acronym || '').toUpperCase()).filter(Boolean);
    const cacheKey = `${beatmapId}:${cleanMods.sort().join('')}:${ruleset}`;

    if (this.attributesCache.has(cacheKey)) {
      return this.attributesCache.get(cacheKey);
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}/attributes`, {
        method: 'POST',
        headers: {
          ...this.getDefaultHeaders(token),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mods: cleanMods,
          ruleset: ruleset || 'osu'
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const result = data?.attributes || null;
      if (result) {
        this.attributesCache.set(cacheKey, result);
      }
      return result;
    } catch (e) {
      console.warn(`Gagal mengambil attributes untuk beatmap ${beatmapId}:`, e.message);
      return null;
    }
  }

  async resolveBeatmap(parsed) {
    if (!parsed) {
      throw new Error('URL atau ID beatmap osu! tidak valid.');
    }

    if (parsed.type === 'beatmap') {
      return await this.getBeatmap(parsed.id);
    }

    if (parsed.type === 'beatmapset') {
      const set = await this.getBeatmapset(parsed.id);
      if (!set.beatmaps || set.beatmaps.length === 0) {
        throw new Error('Beatmapset ini tidak memiliki difficulty yang tersedia.');
      }
      // Sort to get the highest star rating difficulty
      const sorted = [...set.beatmaps].sort((a, b) => (b.difficulty_rating || 0) - (a.difficulty_rating || 0));
      const chosen = sorted[0];
      chosen.beatmapset = set;
      return chosen;
    }

    throw new Error('Format beatmap tidak didukung.');
  }

  async getUser(usernameOrId) {
    const token = await this.getAccessToken();
    const cleanUser = String(usernameOrId).trim();
    const isId = /^\d+$/.test(cleanUser);
    const query = isId ? '' : '?key=username';

    const response = await fetch(`https://osu.ppy.sh/api/v2/users/${encodeURIComponent(cleanUser)}/osu${query}`, {
      headers: this.getDefaultHeaders(token)
    });

    if (response.status === 404) {
      throw new Error(`Pemain osu! "${usernameOrId}" tidak ditemukan.`);
    }

    if (!response.ok) {
      throw new Error(`Gagal mengambil data user osu!: HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getUserRecentScore(userId, limit = 1, includeFails = 1) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://osu.ppy.sh/api/v2/users/${userId}/scores/recent?include_fails=${includeFails}&limit=${limit}`, {
      headers: this.getDefaultHeaders(token)
    });

    if (!response.ok) {
      throw new Error(`Gagal mengambil recent score: HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getUserBestScore(userId, limit = 5) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://osu.ppy.sh/api/v2/users/${userId}/scores/best?limit=${limit}`, {
      headers: this.getDefaultHeaders(token)
    });

    if (!response.ok) {
      throw new Error(`Gagal mengambil top score: HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getScore(scoreId, mode = null) {
    const token = await this.getAccessToken();
    const modernHeaders = this.getDefaultHeaders(token);

    // Try modern score lookup:
    // If mode is specified, try /scores/{mode}/{scoreId} first, then /scores/{scoreId}
    // If mode not specified, try /scores/{scoreId} first, then iterate fallback modes
    const endpointsToTry = [];
    if (mode) {
      endpointsToTry.push(`https://osu.ppy.sh/api/v2/scores/${mode}/${scoreId}`);
      endpointsToTry.push(`https://osu.ppy.sh/api/v2/scores/${scoreId}`);
    } else {
      endpointsToTry.push(`https://osu.ppy.sh/api/v2/scores/${scoreId}`);
      for (const fallbackMode of ['osu', 'taiko', 'fruits', 'mania']) {
        endpointsToTry.push(`https://osu.ppy.sh/api/v2/scores/${fallbackMode}/${scoreId}`);
      }
    }

    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep, { headers: modernHeaders });
        if (response.ok) {
          return await response.json();
        }
      } catch (_) {}
    }

    // Fallback without x-api-version header if modern lookup failed (legacy score fallback)
    const legacyHeaders = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
    for (const ep of endpointsToTry) {
      try {
        const response = await fetch(ep, { headers: legacyHeaders });
        if (response.ok) {
          return await response.json();
        }
      } catch (_) {}
    }

    throw new Error(`Skor osu! dengan ID ${scoreId} tidak ditemukan.`);
  }

  async enrichScoreWithBeatmapAndMods(score) {
    if (!score) return score;

    // 1. Ensure full beatmap details exist (especially max_combo and all base stats)
    if (score.beatmap && score.beatmap.id) {
      if (!score.beatmap.max_combo) {
        try {
          const fullBm = await this.getBeatmap(score.beatmap.id);
          score.beatmap = { ...fullBm, ...score.beatmap, max_combo: fullBm.max_combo };
        } catch (_) {}
      }
    }

    // 2. Fetch official modded attributes (star rating & max combo) if mods exist
    const mods = score.mods || [];
    const mode = score.mode || score.beatmap?.mode || 'osu';
    if (score.beatmap?.id && mods.length > 0) {
      try {
        const attrs = await this.getBeatmapAttributes(score.beatmap.id, mods, mode);
        if (attrs) {
          if (attrs.star_rating) {
            score.beatmap.modded_difficulty_rating = attrs.star_rating;
          }
          if (!score.beatmap.max_combo && attrs.max_combo > 0) {
            score.beatmap.max_combo = attrs.max_combo;
          }
        }
      } catch (_) {}
    }

    // 3. Calculate PP, If FC PP, and PP Breakdown locally
    const mapStatus = String(score.beatmap?.status || '').toLowerCase();
    const isRanked = mapStatus === 'ranked' || mapStatus === 'approved';

    if (score.beatmap?.id) {
      try {
        const ppResult = await calculateScorePp(score);
        if (ppResult) {
          if (ppResult.pp != null && (!score.pp || !isRanked)) {
            score.pp = ppResult.pp;
          }
          score.is_unranked_pp = ppResult.isUnranked;
          if (ppResult.ifFcPp != null) {
            score.if_fc_pp = ppResult.ifFcPp;
          }
          if (ppResult.breakdown) {
            score.pp_breakdown = ppResult.breakdown;
          }
          if (ppResult.stars && !score.beatmap.modded_difficulty_rating) {
            score.beatmap.modded_difficulty_rating = ppResult.stars;
          }
        }
      } catch (err) {
        console.warn(`[osuApi] Tidak dapat mengkalkulasi PP:`, err.message);
      }
    }

    return score;
  }
}

module.exports = OsuApi;
