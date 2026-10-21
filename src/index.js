require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const OsuApi = require('./osuApi');
const { generateBeatmapCard } = require('./cardGenerator');
const { generateScoreCard } = require('./scoreCardGenerator');
const { getLinkedUser, linkUser, unlinkUser } = require('./database');
const { parseBeatmapInput, extractAllOsuUrls } = require('./utils');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID || '72172';
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;

// Validate environment variables
if (!DISCORD_TOKEN || DISCORD_TOKEN === 'your_discord_bot_token_here' || DISCORD_TOKEN === 'ISI_DISCORD_BOT_TOKEN_DISINI') {
  console.error('\n❌ [ERROR] DISCORD_TOKEN belum diisi di file .env!');
  console.error('Silakan buka file .env dan masukkan Token bot Discord Anda.\n');
  process.exit(1);
}

if (!OSU_CLIENT_SECRET || OSU_CLIENT_SECRET === 'your_osu_client_secret_here' || OSU_CLIENT_SECRET === 'ISI_CLIENT_SECRET_KAMU_DISINI') {
  console.warn('\n⚠️ [PERINGATAN] OSU_CLIENT_SECRET belum diisi di file .env!');
  console.warn('Silakan masukkan Secret Key dari osu! OAuth Anda di file .env agar bot bisa mengambil data osu!.\n');
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

// Slash Command Definitions
const linkCommand = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Tautkan akun Discord kamu ke akun osu! kamu untuk mempermudah /recent dan /showcase')
  .addStringOption(option =>
    option
      .setName('username')
      .setDescription('Username osu! kamu')
      .setRequired(true)
  );

const unlinkCommand = new SlashCommandBuilder()
  .setName('unlink')
  .setDescription('Lepas tautan akun osu! dari akun Discord kamu');

const beatmapCommand = new SlashCommandBuilder()
  .setName('beatmap')
  .setDescription('Tampilkan kartu informasi beatmap osu! dengan visual modern')
  .addStringOption(option =>
    option
      .setName('input')
      .setDescription('Link osu! (cth: https://osu.ppy.sh/b/12345) atau Beatmap ID')
      .setRequired(true)
  );

const showcaseCommand = new SlashCommandBuilder()
  .setName('showcase')
  .setDescription('Tampilkan kartu beatmap khusus untuk showcase gameplay')
  .addStringOption(option =>
    option
      .setName('link')
      .setDescription('Link beatmap osu! (cth: https://osu.ppy.sh/b/12345) atau Beatmap ID')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Nama player (opsional jika sudah menautkan akun dengan /link)')
      .setRequired(false)
  );

const recentCommand = new SlashCommandBuilder()
  .setName('recent')
  .setDescription('Tampilkan kartu skor terbaru (recent score) dari pemain osu!')
  .addStringOption(option =>
    option
      .setName('player')
      .setDescription('Nama pemain osu! (opsional jika sudah /link)')
      .setRequired(false)
  );

client.once('ready', async () => {
  console.log(`\n===========================================`);
  console.log(`✨ Bot Berhasil Online sebagai: ${client.user.tag}`);
  console.log(`🎮 osu! Client ID: ${OSU_CLIENT_ID}`);
  console.log(`===========================================\n`);

  // Register Global Slash Commands
  try {
    console.log('Mendaftarkan Slash Commands (/link, /unlink, /recent, /beatmap, /showcase)...');
    await client.application.commands.set([
      linkCommand,
      unlinkCommand,
      recentCommand,
      beatmapCommand,
      showcaseCommand
    ]);
    console.log('✅ Semua Slash Commands berhasil didaftarkan!\n');
  } catch (err) {
    console.error('Gagal mendaftarkan slash command:', err.message);
  }
});

// Handle Slash Commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // 1. Command /link
  if (interaction.commandName === 'link') {
    const username = interaction.options.getString('username');
    await interaction.deferReply({ ephemeral: true });

    try {
      const user = await osuApi.getUser(username);
      linkUser(interaction.user.id, user.id, user.username);
      const rankStr = user.statistics?.global_rank ? ` (Rank: #${user.statistics.global_rank.toLocaleString()})` : '';

      await interaction.editReply({
        content: `✅ Berhasil menautkan akun osu! **${user.username}**${rankStr} ke akun Discord kamu!\nSekarang kamu bisa langsung ketik \`/recent\` atau \`/showcase\` tanpa perlu mengisi nama pemain lagi.`
      });
    } catch (err) {
      await interaction.editReply({
        content: `❌ Gagal menautkan akun: ${err.message}`
      });
    }
    return;
  }

  // 2. Command /unlink
  if (interaction.commandName === 'unlink') {
    const success = unlinkUser(interaction.user.id);
    if (success) {
      return interaction.reply({
        content: '✅ Tautan akun osu! kamu berhasil dihapus.',
        ephemeral: true
      });
    } else {
      return interaction.reply({
        content: 'ℹ️ Akun Discord kamu belum menautkan akun osu! mana pun.',
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
          content: '❌ Kamu belum menautkan akun osu!\nGunakan `/link username:<nama_osu>` terlebih dahulu, atau masukkan nama pemain dengan opsi `/recent player:<nama>`.',
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
          content: `ℹ️ Tidak ada permainan / skor terbaru yang ditemukan untuk pemain **${user.username}** dalam 24 jam terakhir.`
        });
      }

      const score = scores[0];
      const imageBuffer = await generateScoreCard(score, user);
      const attachment = new AttachmentBuilder(imageBuffer, { name: `recent_${user.username}_${score.id || 'score'}.png` });

      const beatmapUrl = score.beatmap?.url || `https://osu.ppy.sh/beatmaps/${score.beatmap?.id || ''}`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Buka Beatmap di osu!')
          .setStyle(ButtonStyle.Link)
          .setURL(beatmapUrl)
      );

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error('Error saat memproses command /recent:', err);
      await interaction.editReply({
        content: `❌ Gagal mengambil score: ${err.message}`
      });
    }
    return;
  }

  // 4. Command /beatmap & /showcase
  if (interaction.commandName === 'beatmap' || interaction.commandName === 'showcase') {
    const isShowcase = interaction.commandName === 'showcase';
    const input = interaction.options.getString('link') || interaction.options.getString('input');
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
        content: '❌ Format input tidak valid! Masukkan URL beatmap osu! yang sah atau Beatmap ID angka.',
        ephemeral: true
      });
    }

    await interaction.deferReply();

    try {
      const beatmap = await osuApi.resolveBeatmap(parsed);
      const imageBuffer = await generateBeatmapCard(beatmap, { showcase: isShowcase, player: playerName });
      const attachment = new AttachmentBuilder(imageBuffer, { name: `${isShowcase ? 'showcase' : 'beatmap'}_${beatmap.id}.png` });

      const beatmapUrl = beatmap.url || `https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}#osu/${beatmap.id}`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Buka di osu!')
          .setStyle(ButtonStyle.Link)
          .setURL(beatmapUrl)
      );

      await interaction.editReply({
        files: [attachment],
        components: [row]
      });
    } catch (err) {
      console.error(`Error saat memproses command /${interaction.commandName}:`, err);
      await interaction.editReply({
        content: `❌ Gagal mengambil beatmap: ${err.message}`
      });
    }
  }
});

// Auto-detect osu! URLs in chat messages
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const urls = extractAllOsuUrls(message.content);
  if (urls.length === 0) return;

  // Process the first osu! url found
  const targetUrl = urls[0];
  const parsed = parseBeatmapInput(targetUrl);
  if (!parsed) return;

  try {
    await message.channel.sendTyping();

    const beatmap = await osuApi.resolveBeatmap(parsed);
    const imageBuffer = await generateBeatmapCard(beatmap);
    const attachment = new AttachmentBuilder(imageBuffer, { name: `beatmap_${beatmap.id}.png` });

    const beatmapUrl = beatmap.url || `https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}#osu/${beatmap.id}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Buka di osu!')
        .setStyle(ButtonStyle.Link)
        .setURL(beatmapUrl)
    );

    await message.reply({
      files: [attachment],
      components: [row]
    });
  } catch (err) {
    console.error(`Error auto-detect beatmap dari link ${targetUrl}:`, err.message);
  }
});

// Log In Discord Client
client.login(DISCORD_TOKEN).catch(err => {
  console.error('\n❌ Gagal login ke Discord. Pastikan DISCORD_TOKEN Anda valid!');
  console.error(err.message);
});
