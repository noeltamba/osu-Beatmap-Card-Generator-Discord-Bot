require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ActivityType,
  Events
} = require('discord.js');

const OsuApi = require('./osuApi');
const { generateBeatmapCard } = require('./cardGenerator');
const { generateScoreCard } = require('./scoreCardGenerator');
const { generateTopPlaysCard } = require('./topCardGenerator');
const { generateMiniScoreCard } = require('./miniScoreCardGenerator');
const { generateProfileCard } = require('./profileCardGenerator');
const { generateVersusCard } = require('./versusCardGenerator');
const { handlePrefixCommand } = require('./prefixHandler');
const {
  getLinkedUser,
  linkUser,
  unlinkUser,
  getUserLanguage,
  setUserLanguage
} = require('./database');
const {
  parseBeatmapInput,
  extractAllOsuUrls,
  parseScoreInput,
  extractAllScoreUrls,
  parseMods,
  extractModsFromText,
  getCanonicalBeatmapUrl,
  getCanonicalScoreUrl
} = require('./utils');
const { t } = require('./i18n');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID || '72172';
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;

// Validate environment variables
if (!DISCORD_TOKEN || DISCORD_TOKEN === 'your_discord_bot_token_here' || DISCORD_TOKEN === 'ISI_DISCORD_BOT_TOKEN_DISINI') {
  console.error('\n❌ [ERROR] DISCORD_TOKEN is not set in .env!');
  console.error('Please open .env and enter your Discord bot token.\n');
  process.exit(1);
}

if (!OSU_CLIENT_SECRET || OSU_CLIENT_SECRET === 'your_osu_client_secret_here' || OSU_CLIENT_SECRET === 'ISI_CLIENT_SECRET_KAMU_DISINI') {
  console.warn('\n⚠️ [WARNING] OSU_CLIENT_SECRET is not set in .env!');
  console.warn('Please enter your Secret Key from osu! OAuth in .env to allow the bot to fetch osu! data.\n');
}

const osuApi = new OsuApi(OSU_CLIENT_ID, OSU_CLIENT_SECRET);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Global error handlers to keep the bot alive under unexpected API errors
client.on(Events.Error, err => {
  console.error('⚠️ [Discord Client Error]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Uncaught Exception]:', err);
});

// Slash Command Definitions (English default with Indonesian description localizations)
const linkCommand = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account to your osu! profile for easier /recent and /top commands')
  .setDescriptionLocalizations({
    id: 'Tautkan akun Discord kamu ke akun osu! kamu untuk mempermudah /recent dan /top'
  })
  .addStringOption(option =>
    option
      .setName('username')
      .setDescription('Your osu! username')
      .setDescriptionLocalizations({
        id: 'Username osu! kamu'
      })
      .setRequired(true)
  );

const unlinkCommand = new SlashCommandBuilder()
  .setName('unlink')
  .setDescription('Unlink your osu! account from your Discord profile')
  .setDescriptionLocalizations({
    id: 'Lepas tautan akun osu! dari akun Discord kamu'
  });

const languageCommand = new SlashCommandBuilder()
  .setName('language')
  .setDescription('Choose your preferred language (English / Bahasa Indonesia)')
  .setDescriptionLocalizations({
    id: 'Pilih preferensi bahasa bot (English / Bahasa Indonesia)'
  })
  .addStringOption(option =>
    option
      .setName('set')
      .setDescription('Directly set language to English or Indonesian')
      .setDescriptionLocalizations({
        id: 'Atur bahasa langsung ke English atau Indonesia'
      })
      .setRequired(false)
      .addChoices(
        { name: '🇬🇧 English (Default)', value: 'en' },
        { name: '🇮🇩 Bahasa Indonesia', value: 'id' }
      )
  );

const beatmapCommand = new SlashCommandBuilder()
  .setName('beatmap')
  .setDescription('Display modern visual card for an osu! beatmap')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu informasi beatmap osu! dengan visual modern'
  })
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('osu! beatmap link (e.g. https://osu.ppy.sh/b/12345) or Beatmap ID')
      .setDescriptionLocalizations({
        id: 'Link osu! (cth: https://osu.ppy.sh/b/12345) atau Beatmap ID'
      })
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('mods')
      .setDescription('osu! mods to apply (e.g. DT, HR, HDDT, EZ)')
      .setDescriptionLocalizations({
        id: 'Mods osu! yang ingin diterapkan (cth: DT, HR, HDDT, EZ)'
      })
      .setRequired(false)
  );

const showcaseCommand = new SlashCommandBuilder()
  .setName('showcase')
  .setDescription('Display beatmap showcase card for gameplay showcases')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu beatmap khusus untuk showcase gameplay'
  })
  .addStringOption(option =>
    option
      .setName('link')
      .setDescription('osu! beatmap link or Beatmap ID')
      .setDescriptionLocalizations({
        id: 'Link beatmap osu! atau Beatmap ID'
      })
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama player (opsional jika sudah menautkan akun dengan /link)'
      })
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('mods')
      .setDescription('osu! mods to apply (e.g. DT, HR, HDDT, EZ)')
      .setDescriptionLocalizations({
        id: 'Mods osu! yang ingin diterapkan (cth: DT, HR, HDDT, EZ)'
      })
      .setRequired(false)
  );

const recentCommand = new SlashCommandBuilder()
  .setName('recent')
  .setDescription('Display recent score card for an osu! player')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu skor terbaru (recent score) dari pemain osu!'
  })
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('osu! player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama pemain osu! (opsional jika sudah /link)'
      })
      .setRequired(false)
  );

const topCommand = new SlashCommandBuilder()
  .setName('top')
  .setDescription('Display top performance plays leaderboard card for an osu! player')
  .setDescriptionLocalizations({
    id: 'Tampilkan daftar kartu skor terbaik (Top Plays) dari pemain osu!'
  })
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('osu! player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama pemain osu! (opsional jika sudah /link)'
      })
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('count')
      .setDescription('Number of plays to show (1 - 10, default: 10)')
      .setDescriptionLocalizations({
        id: 'Jumlah skor yang ditampilkan (1 - 10, default: 10)'
      })
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(false)
  );

const scorecardCommand = new SlashCommandBuilder()
  .setName('scorecard')
  .setDescription('Display osu! score card from score link or Score ID')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu skor osu! dari link skor atau Score ID'
  })
  .addStringOption(option =>
    option
      .setName('link')
      .setDescription('osu! score link (e.g. https://osu.ppy.sh/scores/7265198407) or Score ID')
      .setDescriptionLocalizations({
        id: 'Link skor osu! (cth: https://osu.ppy.sh/scores/7265198407) atau Score ID'
      })
      .setRequired(true)
  );

const miniscorecardCommand = new SlashCommandBuilder()
  .setName('miniscorecard')
  .setDescription('Display compact modern mini score card for an osu! score')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu mini skor osu! dengan visual modern dan compact'
  })
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('osu! player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama pemain osu! (opsional jika sudah /link)'
      })
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('link')
      .setDescription('osu! score link (e.g. https://osu.ppy.sh/scores/7265198407) or Score ID')
      .setDescriptionLocalizations({
        id: 'Link skor osu! (cth: https://osu.ppy.sh/scores/7265198407) atau Score ID'
      })
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('top')
      .setDescription('Show specific top play ranking (1 - 100, e.g. 1 for #1 top play)')
      .setDescriptionLocalizations({
        id: 'Tampilkan ranking top play tertentu (1 - 100, cth: 1 untuk top play #1)'
      })
      .setMinValue(1)
      .setMaxValue(100)
      .setRequired(false)
  );

const profileCommand = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('Display modern visual profile card with skill breakdown and Bancho stats')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu profil osu! modern dengan breakdown skill (Aim, Speed, Acc) dan statistik Bancho'
  })
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('osu! player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama pemain osu! (opsional jika sudah /link)'
      })
      .setRequired(false)
  );

const pcardCommand = new SlashCommandBuilder()
  .setName('pcard')
  .setDescription('Display modern visual profile card with skill breakdown and Bancho stats')
  .setDescriptionLocalizations({
    id: 'Tampilkan kartu profil osu! modern dengan breakdown skill (Aim, Speed, Acc) dan statistik Bancho'
  })
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('osu! player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama pemain osu! (opsional jika sudah /link)'
      })
      .setRequired(false)
  );

const compareCommand = new SlashCommandBuilder()
  .setName('compare')
  .setDescription('Compare / display a player\'s personal best score on a beatmap')
  .setDescriptionLocalizations({
    id: 'Bandingkan / tampilkan top skor seorang pemain pada beatmap tertentu'
  })
  .addStringOption(option =>
    option
      .setName('beatmap')
      .setDescription('Beatmap link (e.g. https://osu.ppy.sh/b/12345) or Beatmap ID')
      .setDescriptionLocalizations({
        id: 'Link beatmap (cth: https://osu.ppy.sh/b/12345) atau Beatmap ID'
      })
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('osu! player username (optional if already linked)')
      .setDescriptionLocalizations({
        id: 'Nama pemain osu! (opsional jika sudah /link)'
      })
      .setRequired(false)
  );

const versusCommand = new SlashCommandBuilder()
  .setName('versus')
  .setDescription('Compare two players head-to-head (scores on beatmap or profiles)')
  .setDescriptionLocalizations({
    id: 'Bandingkan dua pemain secara head-to-head (skor di beatmap atau profil)'
  })
  .addStringOption(option =>
    option
      .setName('player2')
      .setDescription('Second osu! player to compare against')
      .setDescriptionLocalizations({
        id: 'Pemain osu! kedua yang ingin ditantang'
      })
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player1')
      .setDescription('First osu! player (defaults to your linked account)')
      .setDescriptionLocalizations({
        id: 'Pemain osu! pertama (default: akun kamu yang terhubung)'
      })
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('beatmap')
      .setDescription('Beatmap link or ID (optional, compares profiles if omitted)')
      .setDescriptionLocalizations({
        id: 'Link atau ID beatmap (opsional, membandingkan profil jika kosong)'
      })
      .setRequired(false)
  );

const vsCommand = new SlashCommandBuilder()
  .setName('vs')
  .setDescription('Compare two players head-to-head (scores on beatmap or profiles)')
  .setDescriptionLocalizations({
    id: 'Bandingkan dua pemain secara head-to-head (skor di beatmap atau profil)'
  })
  .addStringOption(option =>
    option
      .setName('player2')
      .setDescription('Second osu! player to compare against')
      .setDescriptionLocalizations({
        id: 'Pemain osu! kedua yang ingin ditantang'
      })
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player1')
      .setDescription('First osu! player (defaults to your linked account)')
      .setDescriptionLocalizations({
        id: 'Pemain osu! pertama (default: akun kamu yang terhubung)'
      })
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('beatmap')
      .setDescription('Beatmap link or ID (optional, compares profiles if omitted)')
      .setDescriptionLocalizations({
        id: 'Link atau ID beatmap (opsional, membandingkan profil jika kosong)'
      })
      .setRequired(false)
  );

const githubCommand = new SlashCommandBuilder()
  .setName('github')
  .setDescription('Get the official GitHub repository link of Columbina Bot')
  .setDescriptionLocalizations({
    id: 'Dapatkan link repositori GitHub resmi Columbina Bot'
  });

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

const STATUS_STATE_FILE = path.join(__dirname, '..', 'data', 'status_state.json');
const DEFAULT_PRESENCE = ';help | osu! Image Generator ✨';
const UPDATE_PRESENCE = '✨ v1.4.0 Updated: Versus Duel (;vs) & /github! | ;help';

function setupBotPresence(client) {
  let statusData = null;
  try {
    if (fs.existsSync(STATUS_STATE_FILE)) {
      statusData = JSON.parse(fs.readFileSync(STATUS_STATE_FILE, 'utf-8'));
    }
  } catch (_) {}

  // Inisialisasi jendela update status 24 jam jika belum ada, sudah usang, atau status update berubah
  if (!statusData || !statusData.activeUntil || statusData.updateStatus !== UPDATE_PRESENCE) {
    statusData = {
      activeUntil: Date.now() + (24 * 60 * 60 * 1000), // 24 jam dari sekarang
      updateStatus: UPDATE_PRESENCE,
      defaultStatus: DEFAULT_PRESENCE
    };
    try {
      const dataDir = path.dirname(STATUS_STATE_FILE);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(STATUS_STATE_FILE, JSON.stringify(statusData, null, 2), 'utf-8');
    } catch (_) {}
  }

  const now = Date.now();
  if (statusData.activeUntil && now < statusData.activeUntil) {
    const remainingMs = statusData.activeUntil - now;
    const remainingHours = (remainingMs / (1000 * 60 * 60)).toFixed(1);

    try {
      client.user.setPresence({
        activities: [{
          name: 'custom',
          type: ActivityType.Custom,
          state: statusData.updateStatus || UPDATE_PRESENCE
        }],
        status: 'online'
      });
      console.log(`✨ Bot presence set to UPDATE STATUS: "${statusData.updateStatus || UPDATE_PRESENCE}" (Aktif selama ~${remainingHours} jam ke depan)\n`);
    } catch (err) {
      console.error('Failed to set bot presence:', err.message);
    }

    // Jadwalkan pengembalian otomatis ke default status setelah 24 jam selesai
    setTimeout(() => {
      try {
        client.user.setPresence({
          activities: [{
            name: 'custom',
            type: ActivityType.Custom,
            state: statusData.defaultStatus || DEFAULT_PRESENCE
          }],
          status: 'online'
        });
        console.log(`🔄 24-Hour update status window selesai. Status bot kembali ke default: "${statusData.defaultStatus || DEFAULT_PRESENCE}"\n`);
        statusData.activeUntil = null;
        fs.writeFileSync(STATUS_STATE_FILE, JSON.stringify(statusData, null, 2), 'utf-8');
      } catch (err) {
        console.error('Failed to revert bot presence:', err.message);
      }
    }, remainingMs);
  } else {
    try {
      client.user.setPresence({
        activities: [{
          name: 'custom',
          type: ActivityType.Custom,
          state: statusData?.defaultStatus || DEFAULT_PRESENCE
        }],
        status: 'online'
      });
      console.log(`✨ Bot presence set to default: "${statusData?.defaultStatus || DEFAULT_PRESENCE}"\n`);
    } catch (err) {
      console.error('Failed to set bot presence:', err.message);
    }
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`\n===========================================`);
  console.log(`✨ Bot Online as: ${client.user.tag}`);
  console.log(`🎮 osu! Client ID: ${OSU_CLIENT_ID}`);
  console.log(`===========================================\n`);

  // Atur status profil bot (mendukung 12 jam update status kemudian kembali ke default)
  setupBotPresence(client);

  // Register Global Slash Commands
  try {
    console.log('Registering Slash Commands (/link, /unlink, /language, /recent, /top, /beatmap, /showcase, /scorecard, /miniscorecard, /profile, /pcard, /compare, /versus, /vs, /github)...');
    await client.application.commands.set([
      linkCommand,
      unlinkCommand,
      languageCommand,
      recentCommand,
      topCommand,
      beatmapCommand,
      showcaseCommand,
      scorecardCommand,
      miniscorecardCommand,
      profileCommand,
      pcardCommand,
      compareCommand,
      versusCommand,
      vsCommand,
      githubCommand
    ]);
    console.log('✅ All Slash Commands registered successfully!\n');
  } catch (err) {
    console.error('Failed to register slash commands:', err.message);
  }
});

// Handle Interactions (Slash Commands & Buttons)
client.on(Events.InteractionCreate, async interaction => {
  // Handle Language Button Selection
  if (interaction.isButton()) {
    if (interaction.customId === 'set_lang_en' || interaction.customId === 'set_lang_id') {
      const chosenLang = interaction.customId === 'set_lang_id' ? 'id' : 'en';
      setUserLanguage(interaction.user.id, chosenLang);
      const confirmText = t(chosenLang, chosenLang === 'id' ? 'lang_changed_id' : 'lang_changed_en');
      return interaction.update({
        content: confirmText,
        embeds: [],
        components: []
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const lang = getUserLanguage(interaction.user.id);

  // 0. Command /language
  if (interaction.commandName === 'language') {
    const directSet = interaction.options.getString('set');
    if (directSet) {
      setUserLanguage(interaction.user.id, directSet);
      return interaction.reply({
        content: t(directSet, directSet === 'id' ? 'lang_changed_id' : 'lang_changed_en'),
        ephemeral: true
      });
    }

    const currentLang = getUserLanguage(interaction.user.id);
    const currentLangLabel = currentLang === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English (Default)';

    const embed = new EmbedBuilder()
      .setColor('#38bdf8')
      .setTitle(t(currentLang, 'lang_embed_title'))
      .setDescription(t(currentLang, 'lang_embed_desc', { currentLang: currentLangLabel }))
      .setThumbnail('https://assets.ppy.sh/wiki/images/shared/osu-logo.png');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('set_lang_en')
        .setLabel(t(currentLang, 'lang_btn_en'))
        .setStyle(currentLang === 'en' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('set_lang_id')
        .setLabel(t(currentLang, 'lang_btn_id'))
        .setStyle(currentLang === 'id' ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  // 1. Command /link
  if (interaction.commandName === 'link') {
    const username = interaction.options.getString('username');
    await interaction.deferReply({ ephemeral: true });

    try {
      const user = await osuApi.getUser(username);
      linkUser(interaction.user.id, user.id, user.username);
      const rankStr = user.statistics?.global_rank ? ` (Rank: #${user.statistics.global_rank.toLocaleString()})` : '';

      await interaction.editReply({
        content: t(lang, 'link_success', { username: user.username, rank: rankStr })
      });
    } catch (err) {
      await interaction.editReply({
        content: t(lang, 'link_error', { message: err.message })
      });
    }
    return;
  }

  // 2. Command /unlink
  if (interaction.commandName === 'unlink') {
    const success = unlinkUser(interaction.user.id);
    if (success) {
      return interaction.reply({
        content: t(lang, 'unlink_success'),
        ephemeral: true
      });
    } else {
      return interaction.reply({
        content: t(lang, 'unlink_not_linked'),
        ephemeral: true
      });
    }
  }

  // 3. Command /recent (Score Card Generator)
  if (interaction.commandName === 'recent') {
    let targetPlayer = interaction.options.getString('player');

    if (!targetPlayer) {
      const linked = getLinkedUser(interaction.user.id);
      if (!linked) {
        return interaction.reply({
          content: t(lang, 'recent_not_linked'),
          ephemeral: true
        });
      }
      targetPlayer = linked.osuUsername;
    }

    await interaction.deferReply();

    try {
      const user = await osuApi.getUser(targetPlayer);
      const scores = await osuApi.getUserRecentScore(user.id, 1, 1);

      if (!scores || scores.length === 0) {
        return interaction.editReply({
          content: t(lang, 'recent_no_scores', { username: user.username })
        });
      }

      const score = scores[0];
      await osuApi.enrichScoreWithBeatmapAndMods(score);
      const imageBuffer = await generateScoreCard(score, user, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `recent_${user.username}_bm${score.beatmap?.id || ''}_${score.id || 'score'}.png` });

      const row = createScoreButtons(score, null, lang);

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error in /recent command:', err);
      await interaction.editReply({
        content: t(lang, 'recent_error', { message: err.message })
      });
    }
    return;
  }

  // 3b. Command /top (Top Best Plays List Generator)
  if (interaction.commandName === 'top') {
    let targetPlayer = interaction.options.getString('player');
    const count = interaction.options.getInteger('count') || 10;

    if (!targetPlayer) {
      const linked = getLinkedUser(interaction.user.id);
      if (!linked) {
        return interaction.reply({
          content: t(lang, 'top_not_linked'),
          ephemeral: true
        });
      }
      targetPlayer = linked.osuUsername;
    }

    await interaction.deferReply();

    try {
      const user = await osuApi.getUser(targetPlayer);
      const scores = await osuApi.getUserBestScore(user.id, count);

      if (!scores || scores.length === 0) {
        return interaction.editReply({
          content: t(lang, 'top_no_scores', { username: user.username })
        });
      }

      // Enrich scores with beatmap data & ifFc calculations
      for (const score of scores) {
        await osuApi.enrichScoreWithBeatmapAndMods(score);
      }

      const imageBuffer = await generateTopPlaysCard(user, scores, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `top_${user.username}.png` });

      // Profile Button
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(t(lang, 'btn_open_profile'))
          .setStyle(ButtonStyle.Link)
          .setURL(`https://osu.ppy.sh/users/${user.id}`)
      );

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error in /top command:', err);
      await interaction.editReply({
        content: t(lang, 'top_error', { message: err.message })
      });
    }
    return;
  }

  // 4. Command /beatmap & /showcase
  if (interaction.commandName === 'beatmap' || interaction.commandName === 'showcase') {
    const isShowcase = interaction.commandName === 'showcase';
    const input = interaction.options.getString('link') || interaction.options.getString('input');
    const modsInput = interaction.options.getString('mods') || null;
    let playerName = interaction.options.getString('player') || null;

    // If showcase and no player provided, check if user is linked
    if (isShowcase && !playerName) {
      const linked = getLinkedUser(interaction.user.id);
      if (linked) {
        playerName = linked.osuUsername;
      }
    }

    const parsed = parseBeatmapInput(input);

    if (!parsed) {
      return interaction.reply({
        content: t(lang, 'beatmap_invalid_input'),
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const beatmap = await osuApi.resolveBeatmap(parsed);
      const cleanMods = parseMods(modsInput);

      if (cleanMods.length > 0 && beatmap.id) {
        try {
          const attrs = await osuApi.getBeatmapAttributes(beatmap.id, cleanMods, beatmap.mode);
          if (attrs?.star_rating) {
            beatmap.modded_difficulty_rating = attrs.star_rating;
          }
        } catch (_) {}
      }

      const imageBuffer = await generateBeatmapCard(beatmap, {
        showcase: isShowcase,
        player: playerName,
        mods: cleanMods,
        lang
      });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `${isShowcase ? 'showcase' : 'beatmap'}_${beatmap.id}.png` });

      const row = createBeatmapButtons(beatmap, input, lang);

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error(`Error in /${interaction.commandName} command:`, err);
      await interaction.editReply({
        content: t(lang, 'beatmap_error', { message: err.message })
      });
    }
    return;
  }

  // 5. Command /scorecard
  if (interaction.commandName === 'scorecard') {
    const input = interaction.options.getString('link') || interaction.options.getString('input');
    const parsedScore = parseScoreInput(input);

    if (!parsedScore) {
      return interaction.reply({
        content: t(lang, 'scorecard_invalid_input'),
        ephemeral: true
      });
    }

    const scoreId = typeof parsedScore === 'object' ? parsedScore.id : parsedScore;
    const scoreMode = typeof parsedScore === 'object' ? parsedScore.mode : null;

    await interaction.deferReply();

    try {
      const score = await osuApi.getScore(scoreId, scoreMode);
      await osuApi.enrichScoreWithBeatmapAndMods(score);
      const user = score.user || (score.user_id ? await osuApi.getUser(score.user_id) : {});
      const imageBuffer = await generateScoreCard(score, user, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `score_${score.id}_bm${score.beatmap?.id || ''}.png` });

      const row = createScoreButtons(score, input, lang);

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error in /scorecard command:', err);
      await interaction.editReply({
        content: t(lang, 'scorecard_error', { message: err.message })
      });
    }
    return;
  }

  // 6. Command /miniscorecard (Compact Score Card Generator)
  if (interaction.commandName === 'miniscorecard') {
    const linkInput = interaction.options.getString('link');
    const topIndex = interaction.options.getInteger('top');
    let targetPlayer = interaction.options.getString('player');

    // Case 1: Specific Score Link / ID provided
    if (linkInput) {
      const parsedScore = parseScoreInput(linkInput);
      if (!parsedScore) {
        return interaction.reply({
          content: t(lang, 'scorecard_invalid_input'),
          ephemeral: true
        });
      }

      const scoreId = typeof parsedScore === 'object' ? parsedScore.id : parsedScore;
      const scoreMode = typeof parsedScore === 'object' ? parsedScore.mode : null;

      await interaction.deferReply();

      try {
        const score = await osuApi.getScore(scoreId, scoreMode);
        await osuApi.enrichScoreWithBeatmapAndMods(score);
        const user = score.user || (score.user_id ? await osuApi.getUser(score.user_id) : {});

        // Check if this score is in user's top 100 plays
        let topRank = null;
        if (user && user.id) {
          try {
            const topScores = await osuApi.getUserBestScore(user.id, 100);
            if (topScores && topScores.length > 0) {
              const matchIdx = topScores.findIndex(s => String(s.id) === String(score.id));
              if (matchIdx !== -1) {
                topRank = matchIdx + 1;
              }
            }
          } catch (_) {}
        }

        const imageBuffer = await generateMiniScoreCard(score, user, { lang, topRank });
        const attachment = new AttachmentBuilder(imageBuffer, { name: `miniscore_${score.id}_bm${score.beatmap?.id || ''}.png` });
        const row = createScoreButtons(score, linkInput, lang);

        await interaction.editReply({
          files: [attachment],
          components: [row]
        });
      } catch (err) {
        console.error('Error in /miniscorecard command (by link):', err);
        await interaction.editReply({
          content: t(lang, 'scorecard_error', { message: err.message })
        });
      }
      return;
    }

    // If neither link nor player specified, check linked user
    if (!targetPlayer) {
      const linked = getLinkedUser(interaction.user.id);
      if (!linked) {
        return interaction.reply({
          content: t(lang, 'recent_not_linked'),
          ephemeral: true
        });
      }
      targetPlayer = linked.osuUsername;
    }

    await interaction.deferReply();

    try {
      const user = await osuApi.getUser(targetPlayer);

      // Case 2: Specific Top Play requested
      if (topIndex != null && topIndex >= 1) {
        const scores = await osuApi.getUserBestScore(user.id, topIndex);
        if (!scores || scores.length < topIndex) {
          return interaction.editReply({
            content: t(lang, 'top_no_scores', { username: user.username })
          });
        }

        const score = scores[topIndex - 1];
        score.topRank = topIndex;
        await osuApi.enrichScoreWithBeatmapAndMods(score);

        const imageBuffer = await generateMiniScoreCard(score, user, { lang, topRank: topIndex });
        const attachment = new AttachmentBuilder(imageBuffer, { name: `miniscore_${user.username}_top${topIndex}_bm${score.beatmap?.id || ''}.png` });
        const row = createScoreButtons(score, null, lang);

        return interaction.editReply({
          files: [attachment],
          components: [row]
        });
      }

      // Case 3: Recent Score (Default)
      const scores = await osuApi.getUserRecentScore(user.id, 1, 1);
      if (!scores || scores.length === 0) {
        return interaction.editReply({
          content: t(lang, 'recent_no_scores', { username: user.username })
        });
      }

      const score = scores[0];
      await osuApi.enrichScoreWithBeatmapAndMods(score);

      // Check if this recent score is in user's top 100 plays
      let topRank = null;
      try {
        const topScores = await osuApi.getUserBestScore(user.id, 100);
        if (topScores && topScores.length > 0) {
          const matchIdx = topScores.findIndex(s => String(s.id) === String(score.id));
          if (matchIdx !== -1) {
            topRank = matchIdx + 1;
          }
        }
      } catch (_) {}

      const imageBuffer = await generateMiniScoreCard(score, user, { lang, topRank });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `miniscore_${user.username}_bm${score.beatmap?.id || ''}_${score.id || 'recent'}.png` });
      const row = createScoreButtons(score, null, lang);

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error in /miniscorecard command:', err);
      await interaction.editReply({
        content: t(lang, 'recent_error', { message: err.message })
      });
    }
    return;
  }

  // 10. Handle /profile or /pcard command
  if (interaction.commandName === 'profile' || interaction.commandName === 'pcard') {
    let targetPlayer = interaction.options.getString('player');

    if (!targetPlayer) {
      const linked = getLinkedUser(interaction.user.id);
      if (!linked) {
        return interaction.reply({
          content: t(lang, 'profile_not_linked'),
          ephemeral: true
        });
      }
      targetPlayer = linked.osuUsername;
    }

    await interaction.deferReply();

    try {
      const user = await osuApi.getUser(targetPlayer);
      const topScores = await osuApi.getUserBestScore(user.id, 25).catch(() => []);

      const imageBuffer = await generateProfileCard(user, topScores, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `profile_${user.username}.png` });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(t(lang, 'btn_open_profile'))
          .setStyle(ButtonStyle.Link)
          .setURL(`https://osu.ppy.sh/users/${user.id}`)
      );

      return interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error in /profile command:', err);
      return interaction.editReply({
        content: t(lang, 'profile_error', { message: err.message })
      });
    }
  }

  // 11. Handle /compare command
  if (interaction.commandName === 'compare') {
    const beatmapInput = interaction.options.getString('beatmap');
    let targetPlayer = interaction.options.getString('player');

    const parsedBm = parseBeatmapInput(beatmapInput);
    if (!parsedBm) {
      return interaction.reply({
        content: t(lang, 'beatmap_invalid_input'),
        ephemeral: true
      });
    }

    if (!targetPlayer) {
      const linked = getLinkedUser(interaction.user.id);
      if (!linked) {
        return interaction.reply({
          content: t(lang, 'compare_no_player'),
          ephemeral: true
        });
      }
      targetPlayer = linked.osuUsername;
    }

    await interaction.deferReply();

    try {
      const beatmap = await osuApi.resolveBeatmap(parsedBm);
      if (!beatmap?.id) {
        return interaction.editReply({
          content: t(lang, 'beatmap_error', { message: 'Beatmap not found' })
        });
      }

      const user = await osuApi.getUser(targetPlayer);
      const score = await osuApi.getUserBeatmapScore(beatmap.id, user.id);

      if (!score) {
        const mapTitle = `${beatmap.beatmapset?.title || beatmap.title} [${beatmap.version}]`;
        return interaction.editReply({
          content: t(lang, 'compare_no_score', {
            username: user.username,
            beatmap: mapTitle
          })
        });
      }

      score.user = user;
      score.beatmap = beatmap;
      await osuApi.enrichScoreWithBeatmapAndMods(score);

      const imageBuffer = await generateScoreCard(score, user, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `compare_${user.username}_bm${beatmap.id}_${score.id || 'score'}.png` });
      const row = createScoreButtons(score, null, lang);

      return interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error in /compare command:', err);
      return interaction.editReply({
        content: t(lang, 'compare_error', { message: err.message })
      });
    }
  }

  // 12. Handle /versus or /vs command
  if (interaction.commandName === 'versus' || interaction.commandName === 'vs') {
    const p2Name = interaction.options.getString('player2');
    let p1Name = interaction.options.getString('player1');
    const beatmapInput = interaction.options.getString('beatmap');

    if (!p1Name) {
      const linked = getLinkedUser(interaction.user.id);
      if (!linked) {
        return interaction.reply({
          content: t(lang, 'versus_no_players'),
          ephemeral: true
        });
      }
      p1Name = linked.osuUsername;
    }

    await interaction.deferReply();

    try {
      const [u1, u2] = await Promise.all([
        osuApi.getUser(p1Name),
        osuApi.getUser(p2Name)
      ]);

      const [topScores1, topScores2] = await Promise.all([
        osuApi.getUserBestScore(u1.id, 25).catch(() => []),
        osuApi.getUserBestScore(u2.id, 25).catch(() => [])
      ]);

      if (u1.id === u2.id) {
        return interaction.editReply({
          content: t(lang, 'versus_same_player')
        });
      }

      let beatmap = null;
      if (beatmapInput) {
        const parsedBm = parseBeatmapInput(beatmapInput);
        if (parsedBm) {
          beatmap = await osuApi.resolveBeatmap(parsedBm).catch(() => null);
        }
      }

      if (beatmap && beatmap.id) {
        const [sc1, sc2] = await Promise.all([
          osuApi.getUserBeatmapScore(beatmap.id, u1.id).catch(() => null),
          osuApi.getUserBeatmapScore(beatmap.id, u2.id).catch(() => null)
        ]);

        if (!sc1 && !sc2) {
          const mapTitle = `${beatmap.beatmapset?.title || beatmap.title} [${beatmap.version}]`;
          return interaction.editReply({
            content: t(lang, 'versus_neither_scores', {
              p1: u1.username,
              p2: u2.username,
              beatmap: mapTitle
            })
          });
        }

        if (sc1) {
          sc1.user = u1;
          sc1.beatmap = beatmap;
          await osuApi.enrichScoreWithBeatmapAndMods(sc1);
        }

        if (sc2) {
          sc2.user = u2;
          sc2.beatmap = beatmap;
          await osuApi.enrichScoreWithBeatmapAndMods(sc2);
        }

        const imageBuffer = await generateVersusCard({
          user1: u1,
          user2: u2,
          score1: sc1,
          score2: sc2,
          beatmap,
          topScores1,
          topScores2
        }, { lang });

        const attachment = new AttachmentBuilder(imageBuffer, { name: `versus_${u1.username}_vs_${u2.username}_bm${beatmap.id}.png` });
        return interaction.editReply({ files: [attachment] });
      }

      // Profile showdown
      const imageBuffer = await generateVersusCard({
        user1: u1,
        user2: u2,
        topScores1,
        topScores2
      }, { lang });

      const attachment = new AttachmentBuilder(imageBuffer, { name: `versus_${u1.username}_vs_${u2.username}.png` });
      return interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error('Error in /versus command:', err);
      return interaction.editReply({
        content: t(lang, 'versus_error', { message: err.message })
      });
    }
  }

  // 13. Handle /github command
  if (interaction.commandName === 'github') {
    const embed = new EmbedBuilder()
      .setColor('#38bdf8')
      .setTitle(t(lang, 'github_embed_title'))
      .setDescription(t(lang, 'github_embed_desc'))
      .setThumbnail('https://i.imgur.com/WujKXUK.jpeg')
      .setFooter({ text: 'Created with ❤️ by @noeltamba & @hyzity' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel(t(lang, 'btn_view_github'))
        .setStyle(ButtonStyle.Link)
        .setURL('https://github.com/noeltamba/osu-Beatmap-Card-Generator-Discord-Bot')
    );

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
});

// Prefix commands (;) & Auto-detect osu! URLs in chat messages
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // 0. Check prefix commands starting with ';' (e.g. ;m, ;r, ;t, ;b, ;c, ;help)
  if (message.content.startsWith(';')) {
    try {
      const handled = await handlePrefixCommand(message, osuApi);
      if (handled !== false) return;
    } catch (err) {
      console.error(`Error handling prefix command "${message.content}":`, err.message);
      if (err.code === 50013) {
        console.warn(`[Missing Permissions] Bot lacks permissions in channel #${message.channel?.name || message.channelId}. Please ensure 'Send Messages', 'Embed Links', and 'Attach Files' are granted.`);
      }
      return;
    }
  }

  const lang = getUserLanguage(message.author.id);

  // 1. Check osu! score links (e.g. https://osu.ppy.sh/scores/7265198407)
  const scoreUrls = extractAllScoreUrls(message.content);
  if (scoreUrls.length > 0) {
    const targetUrl = scoreUrls[0];
    const parsedScore = parseScoreInput(targetUrl);
    if (!parsedScore) return;

    const scoreId = typeof parsedScore === 'object' ? parsedScore.id : parsedScore;
    const scoreMode = typeof parsedScore === 'object' ? parsedScore.mode : null;

    try {
      await message.channel.sendTyping().catch(() => {});

      const score = await osuApi.getScore(scoreId, scoreMode);
      await osuApi.enrichScoreWithBeatmapAndMods(score);
      const user = score.user || (score.user_id ? await osuApi.getUser(score.user_id) : {});
      const imageBuffer = await generateScoreCard(score, user, { lang });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `score_${score.id}_bm${score.beatmap?.id || ''}.png` });

      const row = createScoreButtons(score, targetUrl, lang);

      await message.reply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error(`Error auto-detect score from link ${targetUrl}:`, err.message);
    }
    return;
  }

  // 2. Check osu! beatmap links
  const urls = extractAllOsuUrls(message.content);
  if (urls.length === 0) return;

  const targetUrl = urls[0];
  const parsed = parseBeatmapInput(targetUrl);
  if (!parsed) return;

  const detectedMods = extractModsFromText(message.content);

  try {
    await message.channel.sendTyping().catch(() => {});

    const beatmap = await osuApi.resolveBeatmap(parsed);

    if (detectedMods.length > 0 && beatmap.id) {
      try {
        const attrs = await osuApi.getBeatmapAttributes(beatmap.id, detectedMods, beatmap.mode);
        if (attrs?.star_rating) {
          beatmap.modded_difficulty_rating = attrs.star_rating;
        }
      } catch (_) {}
    }

    const imageBuffer = await generateBeatmapCard(beatmap, { mods: detectedMods, lang });
    const attachment = new AttachmentBuilder(imageBuffer, { name: `beatmap_${beatmap.id}.png` });

    const row = createBeatmapButtons(beatmap, targetUrl, lang);

    await message.reply({
      files: [attachment],
      components: [row]
    });
  } catch (err) {
    console.error(`Error auto-detect beatmap from link ${targetUrl}:`, err.message);
  }
});

// Log In Discord Client
client.login(DISCORD_TOKEN).catch(err => {
  console.error('\n❌ Failed to log in to Discord. Please ensure your DISCORD_TOKEN is valid!');
  console.error(err.message);
});
