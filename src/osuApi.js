/**
 * osu! API v2 Client with automatic OAuth token management
 */

class OsuApi {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.tokenExpiresAt = 0;
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

  async getBeatmap(beatmapId) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      throw new Error(`Beatmap dengan ID ${beatmapId} tidak ditemukan.`);
    }

    if (!response.ok) {
      throw new Error(`Gagal mengambil data beatmap: HTTP ${response.status}`);
    }

    return await response.json();
  }

  async getBeatmapset(setId) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://osu.ppy.sh/api/v2/beatmapsets/${setId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (response.status === 404) {
      throw new Error(`Beatmapset dengan ID ${setId} tidak ditemukan.`);
    }

    if (!response.ok) {
      throw new Error(`Gagal mengambil data beatmapset: HTTP ${response.status}`);
    }

    return await response.json();
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
}

module.exports = OsuApi;
