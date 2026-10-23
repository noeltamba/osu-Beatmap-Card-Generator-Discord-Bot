const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const { generateBeatmapCard } = require('./cardGenerator');
const { generateScoreCard } = require('./scoreCardGenerator');
const { generateTopPlaysCard } = require('./topCardGenerator');
const { generateMiniScoreCard } = require('./miniScoreCardGenerator');
const {
  getLinkedUser,
  linkUser,
  unlinkUser,
  getUserLanguage
} = require('./database');
const {
  parseBeatmapInput,
  parseScoreInput,
  parseMods,
  extractModsFromText,
  getCanonicalBeatmapUrl,
  getCanonicalScoreUrl
} = require('./utils');
const { t } = require('./i18n');

function createScoreButtons(score, originalInput = null, lang = 'en') {
  const row = new ActionRowBuilder();
  const beatmap = score.beatmap || {};
  const setId = beatmap.beatmapset_id || score.beatmapset?.id || beatmap.beatmapset?.id;
  const beatmapUrl = getCanonicalBeatmapUrl(beatmap);
  const scoreUrl = getCanonicalScoreUrl(score, originalInput);

  if (score && score.id) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(t(lang, 'btn_open_score'))
        .setStyle(ButtonStyle.Link)
        .setURL(scoreUrl)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setLabel(t(lang, 'btn_open_beatmap'))
      .setStyle(ButtonStyle.Link)
      .setURL(beatmapUrl)
  );

  if (setId) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(t(lang, 'btn_download'))
        .setStyle(ButtonStyle.Link)
        .setURL(`https://beatconnect.io/b/${setId}`)
    );
  }

  return row;
}

function createBeatmapButtons(beatmap, originalInput = null, lang = 'en') {
  const row = new ActionRowBuilder();
  const setId = beatmap.beatmapset_id || beatmap.beatmapset?.id;
  const beatmapUrl = getCanonicalBeatmapUrl(beatmap, originalInput);

  row.addComponents(
    new ButtonBuilder()
      .setLabel(t(lang, 'btn_open_on_osu'))
      .setStyle(ButtonStyle.Link)
      .setURL(beatmapUrl)
  );

  if (setId) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(t(lang, 'btn_download'))
        .setStyle(ButtonStyle.Link)
        .setURL(`https://beatconnect.io/b/${setId}`)
    );
  }

  return row;
}

/**
 * Handle prefix commands starting with ';'
 * @param {import('discord.js').Message} message 
 * @param {object} osuApi 
 */
async function handlePrefixCommand(message, osuApi) {
  const lang = getUserLanguage(message.author.id);
  const content = message.content.trim();

  // Strip prefix ';'
  const body = content.slice(1).trim();
  if (!body) return false;

  const rawArgs = body.split(/\s+/);
  const cmd = rawArgs[0].toLowerCase();
  const args = rawArgs.slice(1);

  // 1. Mini Score Card: ;m, ;mini, ;miniscore, ;miniscorecard
  if (['m', 'mini', 'miniscore', 'miniscorecard'].includes(cmd)) {
    let player = null;
    let topIndex = null;
    let scoreInput = null;

    if (args.length === 0) {
      // Defaults to linked user
    } else if (args.length === 1) {
      const parsedScore = parseScoreInput(args[0]);
      if (parsedScore && (args[0].includes('scores') || parseInt(args[0], 10) > 100000)) {
        scoreInput = args[0];
      } else if (/^\d+$/.test(args[0]) && parseInt(args[0], 10) <= 100) {
        topIndex = parseInt(args[0], 10);
      } else {
        player = args[0];
      }
    } else {
      if (/^\d+$/.test(args[0]) && parseInt(args[0], 10) <= 100) {
        topIndex = parseInt(args[0], 10);
        player = args.slice(1).join(' ');
      } else if (/^\d+$/.test(args[args.length - 1]) && parseInt(args[args.length - 1], 10) <= 100) {
        topIndex = parseInt(args[args.length - 1], 10);
        player = args.slice(0, -1).join(' ');
      } else {
        player = args.join(' ');
      }
    }

    try {
      // Case A: Specific score link or ID
      if (scoreInput) {
        const parsed = parseScoreInput(scoreInput);
        if (!parsed) return message.reply({ content: t(lang, 'scorecard_invalid_input') });
        const scoreId = typeof parsed === 'object' ? parsed.id : parsed;
        const scoreMode = typeof parsed === 'object' ? parsed.mode : null;

        await message.channel.sendTyping();
        const score = await osuApi.getScore(scoreId, scoreMode);
        await osuApi.enrichScoreWithBeatmapAndMods(score);
        const user = score.user || (score.user_id ? await osuApi.getUser(score.user_id) : {});

        let topRank = null;
        if (user && user.id) {
          try {
            const topScores = await osuApi.getUserBestScore(user.id, 100);
            if (topScores && topScores.length > 0) {
              const matchIdx = topScores.findIndex(s => String(s.id) === String(score.id));
              if (matchIdx !== -1) topRank = matchIdx + 1;
            }
          } catch (_) {}
        }

        const imageBuffer = await generateMiniScoreCard(score, user, { lang, topRank });
        const attachment = new AttachmentBuilder(imageBuffer, { name: `miniscore_${score.id}.png` });
        const row = createScoreButtons(score, scoreInput, lang);
        return message.reply({ files: [attachment], components: [row] });
      }

      // Default or Specified player
      if (!player) {
        const linked = getLinkedUser(message.author.id);
        if (!linked) return message.reply({ content: t(lang, 'recent_not_linked') });
        player = linked.osuUsername;
      }

      await message.channel.sendTyping();
      const user = await osuApi.getUser(player);

      // Case B: Top play specified
      if (topIndex != null && topIndex >= 1) {
        const scores = await osuApi.getUserBestScore(user.id, topIndex);
        if (!scores || scores.length < topIndex) {
          return message.reply({ content: t(lang, 'top_no_scores', { username: user.username }) });
        }
        const score = scores[topIndex - 1];
        score.topRank = topIndex;
        await osuApi.enrichScoreWithBeatmapAndMods(score);
        const imageBuffer = await generateMiniScoreCard(score, user, { lang, topRank: topIndex });
        const attachment = new AttachmentBuilder(imageBuffer, { name: `miniscore_${user.username}_top${topIndex}.png` });
        const row = createScoreButtons(score, null, lang);
        return message.reply({ files: [attachment], components: [row] });
      }

      // Case C: Recent play
      const scores = await osuApi.getUserRecentScore(user.id, 1, 1);
      if (!scores || scores.length === 0) {
        return message.reply({ content: t(lang, 'recent_no_scores', { username: user.username }) });
      }
      const score = scores[0];
      await osuApi.enrichScoreWithBeatmapAndMods(score);

      let topRank = null;
      try {
        const topScores = await osuApi.getUserBestScore(user.id, 100);
        if (topScores && topScores.length > 0) {
          const matchIdx = topScores.findIndex(s => String(s.id) === String(score.id));
          if (matchIdx !== -1) topRank = matchIdx + 1;
        }
      } catch (_) {}

      const imageBuffer = await generateMiniScoreCard(score, user, { lang, topRank });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `miniscore_${user.username}_${score.id || 'recent'}.png` });
      const row = createScoreButtons(score, null, lang);
      return message.reply({ files: [attachment], components: [row] });
    } catch (err) {
      console.error(`Error in ;${cmd}:`, err);
      return message.reply({ content: t(lang, 'recent_error', { message: err.message }) });
    }
  }

  // 2. Recent Score (Full Card): ;r, ;recent, ;rs
  if (['r', 'recent', 'rs'].includes(cmd)) {
    let player = args.length > 0 ? args.join(' ') : null;
    if (!player) {
      const linked = getLinkedUser(message.author.id);
      if (!linked) return message.reply({ content: t(lang, 'recent_not_linked') });
      player = linked.osuUsername;
    }

    try {
      await message.channel.sendTyping();
      const user = await osuApi.getUser(player);
      const scores = await osuApi.getUserRecentScore(user.id, 1, 1);
      if (!scores || scores.length === 0) {
        return message.reply({ content: t(lang, 'recent_no_scores', { username: user.username }) });
      }
      const score = scores[0];
      await osuApi.enrichScoreWithBeatmapAndMods(score);
      const imageBuffer = await generateScoreCard(score, user, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `recent_${user.username}_${score.id || 'score'}.png` });
      const row = createScoreButtons(score, null, lang);
      return message.reply({ files: [attachment], components: [row] });
    } catch (err) {
      console.error(`Error in ;${cmd}:`, err);
      return message.reply({ content: t(lang, 'recent_error', { message: err.message }) });
    }
  }

  // 3. Top Plays (Leaderboard): ;t, ;top, ;best
  if (['t', 'top', 'best'].includes(cmd)) {
    let player = null;
    let count = 10;

    if (args.length === 0) {
      // defaults
    } else if (args.length === 1) {
      if (/^\d+$/.test(args[0]) && parseInt(args[0], 10) >= 1 && parseInt(args[0], 10) <= 10) {
        count = parseInt(args[0], 10);
      } else {
        player = args[0];
      }
    } else {
      if (/^\d+$/.test(args[0]) && parseInt(args[0], 10) >= 1 && parseInt(args[0], 10) <= 10) {
        count = parseInt(args[0], 10);
        player = args.slice(1).join(' ');
      } else if (/^\d+$/.test(args[args.length - 1]) && parseInt(args[args.length - 1], 10) >= 1 && parseInt(args[args.length - 1], 10) <= 10) {
        count = parseInt(args[args.length - 1], 10);
        player = args.slice(0, -1).join(' ');
      } else {
        player = args.join(' ');
      }
    }

    if (!player) {
      const linked = getLinkedUser(message.author.id);
      if (!linked) return message.reply({ content: t(lang, 'top_not_linked') });
      player = linked.osuUsername;
    }

    try {
      await message.channel.sendTyping();
      const user = await osuApi.getUser(player);
      const scores = await osuApi.getUserBestScore(user.id, count);
      if (!scores || scores.length === 0) {
        return message.reply({ content: t(lang, 'top_no_scores', { username: user.username }) });
      }

      for (const s of scores) {
        await osuApi.enrichScoreWithBeatmapAndMods(s);
      }

      const imageBuffer = await generateTopPlaysCard(user, scores, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `top_${user.username}.png` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(t(lang, 'btn_open_profile'))
          .setStyle(ButtonStyle.Link)
          .setURL(`https://osu.ppy.sh/users/${user.id}`)
      );
      return message.reply({ files: [attachment], components: [row] });
    } catch (err) {
      console.error(`Error in ;${cmd}:`, err);
      return message.reply({ content: t(lang, 'top_error', { message: err.message }) });
    }
  }

  // 4. Specific Score: ;s, ;score, ;scorecard
  if (['s', 'score', 'scorecard'].includes(cmd)) {
    if (args.length === 0) {
      return message.reply({ content: t(lang, 'scorecard_invalid_input') });
    }
    const input = args[0];
    const parsed = parseScoreInput(input);
    if (!parsed) return message.reply({ content: t(lang, 'scorecard_invalid_input') });
    const scoreId = typeof parsed === 'object' ? parsed.id : parsed;
    const scoreMode = typeof parsed === 'object' ? parsed.mode : null;

    try {
      await message.channel.sendTyping();
      const score = await osuApi.getScore(scoreId, scoreMode);
      await osuApi.enrichScoreWithBeatmapAndMods(score);
      const user = score.user || (score.user_id ? await osuApi.getUser(score.user_id) : {});
      const imageBuffer = await generateScoreCard(score, user, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `score_${score.id}.png` });
      const row = createScoreButtons(score, input, lang);
      return message.reply({ files: [attachment], components: [row] });
    } catch (err) {
      console.error(`Error in ;${cmd}:`, err);
      return message.reply({ content: t(lang, 'scorecard_error', { message: err.message }) });
    }
  }

  // 5. Beatmap: ;b, ;map, ;beatmap
  if (['b', 'map', 'beatmap'].includes(cmd)) {
    if (args.length === 0) {
      return message.reply({ content: t(lang, 'beatmap_invalid_input') });
    }
    const inputStr = args[0];
    const parsed = parseBeatmapInput(inputStr);
    if (!parsed) return message.reply({ content: t(lang, 'beatmap_invalid_input') });

    const rawMods = args.slice(1).join(' ');
    const cleanMods = extractModsFromText(rawMods).length > 0 ? extractModsFromText(rawMods) : parseMods(rawMods);

    try {
      await message.channel.sendTyping();
      const beatmap = await osuApi.resolveBeatmap(parsed);
      if (cleanMods.length > 0 && beatmap.id) {
        try {
          const attrs = await osuApi.getBeatmapAttributes(beatmap.id, cleanMods, beatmap.mode);
          if (attrs?.star_rating) beatmap.modded_difficulty_rating = attrs.star_rating;
        } catch (_) {}
      }
      const imageBuffer = await generateBeatmapCard(beatmap, { mods: cleanMods, lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `beatmap_${beatmap.id}.png` });
      const row = createBeatmapButtons(beatmap, inputStr, lang);
      return message.reply({ files: [attachment], components: [row] });
    } catch (err) {
      console.error(`Error in ;${cmd}:`, err);
      return message.reply({ content: t(lang, 'beatmap_error', { message: err.message }) });
    }
  }

  // 6. Link Account: ;link <username>
  if (cmd === 'link') {
    if (args.length === 0) {
      return message.reply({ content: lang === 'id' ? 'ℹ️ Masukkan username osu! kamu: `;link <username>`' : 'ℹ️ Please specify your osu! username: `;link <username>`' });
    }
    const username = args.join(' ');
    try {
      await message.channel.sendTyping();
      const user = await osuApi.getUser(username);
      linkUser(message.author.id, user.id, user.username);
      const rankStr = user.statistics?.global_rank ? ` (Rank: #${user.statistics.global_rank.toLocaleString()})` : '';
      return message.reply({ content: t(lang, 'link_success', { username: user.username, rank: rankStr }) });
    } catch (err) {
      return message.reply({ content: t(lang, 'link_error', { message: err.message }) });
    }
  }

  // 7. Unlink Account: ;unlink
  if (cmd === 'unlink') {
    const success = unlinkUser(message.author.id);
    return message.reply({ content: success ? t(lang, 'unlink_success') : t(lang, 'unlink_not_linked') });
  }

  // 8. Help: ;help, ;h, ;commands
  if (['help', 'h', 'commands'].includes(cmd)) {
    const isId = lang === 'id';
    const embed = new EmbedBuilder()
      .setColor('#38bdf8')
      .setTitle(isId ? '⚡ Columbina Bot - Daftar Perintah Prefix (;)' : '⚡ Columbina Bot - Prefix Commands (;)')
      .setDescription(
        isId
          ? 'Gunakan prefix `;` untuk memanggil perintah cepat langsung dari chat tanpa perlu slash command:\n'
          : 'Use the `;` prefix to quickly invoke commands directly in chat without opening slash menus:\n'
      )
      .addFields(
        {
          name: isId ? '🎴 Kartu Mini Skor' : '🎴 Mini Score Card',
          value: '`;m` - ' + (isId ? 'Skor mini terbaru kamu' : 'Your recent mini score') + '\n' +
                 '`;m <player>` - ' + (isId ? 'Skor mini terbaru pemain' : 'Player\'s recent mini score') + '\n' +
                 '`;m 1` atau `;m <player> 1` - ' + (isId ? 'Top play #1' : 'Top play #1') + '\n' +
                 '`;m <link_skor>` - ' + (isId ? 'Kartu mini dari link skor' : 'Mini card from score link'),
          inline: false
        },
        {
          name: isId ? '📊 Skor Penuh & Leaderboard' : '📊 Full Score & Leaderboard',
          value: '`;r [player]` - ' + (isId ? 'Kartu skor terbaru detail penuh' : 'Detailed recent score card') + '\n' +
                 '`;t [player] [jumlah]` - ' + (isId ? 'Top plays pemain (1-10)' : 'Top performance plays (1-10)') + '\n' +
                 '`;s <link_skor>` - ' + (isId ? 'Kartu skor dari link/ID' : 'Full score card from link/ID'),
          inline: false
        },
        {
          name: isId ? '🗺️ Beatmap & Profil' : '🗺️ Beatmap & Profile',
          value: '`;b <link/id> [+mods]` - ' + (isId ? 'Kartu informasi beatmap' : 'Beatmap info card with mods') + '\n' +
                 '`;link <username>` - ' + (isId ? 'Tautkan akun osu! kamu' : 'Link your osu! account') + '\n' +
                 '`;unlink` - ' + (isId ? 'Lepas tautan akun osu!' : 'Unlink your osu! account'),
          inline: false
        }
      )
      .setFooter({ text: isId ? 'Slash command (/) juga tetap aktif dan bisa digunakan!' : 'Slash commands (/) are also available!' });

    return message.reply({ embeds: [embed] });
  }

  // Not a recognised prefix command
  return false;
}

module.exports = {
  handlePrefixCommand
};
