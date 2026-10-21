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
const { parseBeatmapInput, extractAllOsuUrls } = require('./utils');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID;
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET;

// Validate environment variables
if (!DISCORD_TOKEN || DISCORD_TOKEN === 'your_discord_bot_token_here' || DISCORD_TOKEN === 'ISI_DISCORD_BOT_TOKEN_DISINI') {
  console.error('\n❌ [ERROR] DISCORD_TOKEN belum diisi di file .env!');
  console.error('Silakan buka file .env dan masukkan Token bot Discord Anda.');
  console.error('Tutorial cara mendapatkan bot token ada di README.md\n');
  process.exit(1);
}

if (!OSU_CLIENT_ID || OSU_CLIENT_ID === 'your_osu_client_id_here') {
  console.warn('\n⚠️ [PERINGATAN] OSU_CLIENT_ID belum diisi di file .env!');
  console.warn('Silakan masukkan Client ID dari osu! OAuth Anda di file .env agar bot bisa mengambil data osu!.\n');
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
      .setDescription('Nama player / pemain yang memainkan map ini')
      .setRequired(true)
  );

client.once('ready', async () => {
  console.log(`\n===========================================`);
  console.log(`✨ Bot Berhasil Online sebagai: ${client.user.tag}`);
  console.log(`🎮 osu! Client ID: ${OSU_CLIENT_ID}`);
  console.log(`===========================================\n`);

  // Register Global Slash Commands
  try {
    console.log('Mendaftarkan Slash Commands (/beatmap & /showcase)...');
    await client.application.commands.set([beatmapCommand, showcaseCommand]);
    console.log('✅ Slash Commands berhasil didaftarkan!\n');
  } catch (err) {
    console.error('Gagal mendaftarkan slash command:', err.message);
  }
});

// Handle Slash Commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'beatmap' || interaction.commandName === 'showcase') {
    const isShowcase = interaction.commandName === 'showcase';
    const input = interaction.options.getString('link') || interaction.options.getString('input');
    const playerName = interaction.options.getString('player') || null;
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
    // Send typing indicator
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
