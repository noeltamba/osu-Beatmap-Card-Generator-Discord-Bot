const fs = require('fs');
const path = require('path');
const { generateBeatmapCard } = require('./src/cardGenerator');

async function test() {
  console.log('Generating test beatmap card...');

  const sampleBeatmap = {
    id: 129891,
    beatmapset_id: 39804,
    status: 'ranked',
    mode: 'osu',
    version: 'FOUR DIMENSIONS',
    difficulty_rating: 7.58,
    cs: 4.0,
    ar: 9.0,
    accuracy: 9.0,
    drain: 7.0,
    bpm: 222.22,
    total_length: 257,
    hit_length: 236,
    max_combo: 2389,
    playcount: 1250400,
    passcount: 48900,
    beatmapset: {
      id: 39804,
      title: 'FREEDOM DiVE',
      title_unicode: 'FREEDOM DiVE',
      artist: 'xi',
      artist_unicode: 'xi',
      creator: 'Nakagawa-Kanon',
      favourite_count: 5820,
      bpm: 222.22,
      covers: {
        'cover@2x': 'https://assets.ppy.sh/beatmaps/39804/covers/cover@2x.jpg'
      }
    }
  };

  try {
    const buffer = await generateBeatmapCard(sampleBeatmap);
    const outputPath = path.join(__dirname, 'test_output.png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Success! Card saved to: ${outputPath}`);
  } catch (err) {
    console.error('Error generating card:', err);
  }
}

test();
