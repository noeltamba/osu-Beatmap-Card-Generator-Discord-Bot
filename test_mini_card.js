const fs = require('fs');
const path = require('path');
const { generateMiniScoreCard } = require('./src/miniScoreCardGenerator');

async function run() {
  console.log('Generating test mini score card (Harumachi Clover Swing - X_Master5513)...');

  const sampleScore = {
    id: 1234567890,
    accuracy: 0.935,
    max_combo: 154,
    rank: 'A',
    mods: ['HD', 'CL'],
    pp: 86,
    perfect: true,
    ended_at: '2024-03-22T10:00:00.000Z',
    statistics: {
      great: 100,
      ok: 12,
      meh: 0,
      miss: 0
    },
    beatmap: {
      id: 2060305,
      beatmapset_id: 985794,
      version: "NiNo's Insane",
      difficulty_rating: 4.52,
      bpm: 170,
      max_combo: 154,
      status: 'ranked'
    },
    beatmapset: {
      id: 985794,
      title: "Harumachi Clover (Swing Arrangement)",
      artist: 'Will Stetson',
      covers: {
        'cover@2x': 'https://assets.ppy.sh/beatmaps/842412/covers/cover@2x.jpg'
      }
    },
    user: {
      id: 111111,
      username: 'X_Master5513',
      avatar_url: 'https://a.ppy.sh/111111',
      country: {
        code: 'ID',
        name: 'Indonesia'
      }
    }
  };

  const buffer = await generateMiniScoreCard(sampleScore, sampleScore.user, {
    lang: 'id'
  });

  const outPath = path.join(__dirname, 'test_mini_card_output.png');
  fs.writeFileSync(outPath, buffer);
  console.log('Done! Generated:', outPath);
}

run().catch(err => {
  console.error('Error generating mini score card:', err);
});
