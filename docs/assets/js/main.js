// Columbina Bot Showcase - Interactive Client Scripts

const COMMANDS_DATA = [
  {
    prefix: ';vs',
    slash: '/versus',
    aliases: ';versus',
    category: 'profile',
    descEn: 'Compare two players head-to-head on a beatmap score or overall profile showdown (supports map replies).',
    descId: 'Tanding duel 1v1 antar pemain pada skor beatmap atau profil Bancho secara langsung.',
    example: ';vs mrekk Lifeline'
  },
  {
    prefix: ';pcard',
    slash: '/profile',
    aliases: ';p, ;profile',
    category: 'profile',
    descEn: 'Display compact portrait profile dashboard with circular donut skill breakdown (Aim, Speed, Acc) and medals.',
    descId: 'Tampilkan dashboard profil portrait modern dengan diagram donat rasio skill (Aim, Speed, Acc) dan medali.',
    example: ';pcard BTMC'
  },
  {
    prefix: ';c',
    slash: '/compare',
    aliases: ';compare',
    category: 'score',
    descEn: 'Quickly check or compare your personal best score on any beatmap by replying to any bot message.',
    descId: 'Cek skor terbaik kamu di beatmap cukup dengan me-reply pesan bot skor/beatmap mana pun.',
    example: ';c'
  },
  {
    prefix: ';m',
    slash: '/miniscorecard',
    aliases: ';mini',
    category: 'score',
    descEn: 'Aesthetic stream-ready mini score card widget with combo badge, star rating, mods, and accurate PP.',
    descId: 'Kartu mini skor estetis dan ringkas dengan badge kombo, rating bintang, mods, dan PP akurat.',
    example: ';m mrekk 1'
  },
  {
    prefix: ';r',
    slash: '/recent',
    aliases: ';rs',
    category: 'score',
    descEn: 'Comprehensive full score card with 300/100/50/miss judgments, fail detection (Fail %), and modded map stats.',
    descId: 'Kartu skor lengkap dengan statistik hit (300/100/50/miss), deteksi fail akurat (Fail %), dan rating kesulitan mod.',
    example: ';r RyuK'
  },
  {
    prefix: ';t',
    slash: '/top',
    aliases: ';best',
    category: 'score',
    descEn: 'Leaderboard showcase card displaying a player\'s top performance plays (1 to 10 plays).',
    descId: 'Papan peringkat kartu skor terbaik (Top Plays) pemain dari peringkat 1 hingga 10.',
    example: ';t BTMC 5'
  },
  {
    prefix: ';b',
    slash: '/beatmap',
    aliases: ';map',
    category: 'beatmap',
    descEn: 'Display modern beatmap specifications with modded attributes (DT, HR, HD, EZ) and download buttons.',
    descId: 'Tampilkan kartu informasi beatmap dengan kalkulasi atribut mod (DT, HR, HD, EZ) dan tombol unduh.',
    example: ';b 129891 +HDHR'
  },
  {
    prefix: ';s',
    slash: '/scorecard',
    aliases: ';score',
    category: 'score',
    descEn: 'Generate visual score card directly from an osu! score URL or numeric Score ID.',
    descId: 'Generate kartu skor langsung dari URL skor osu! atau Score ID angka.',
    example: ';s 7265198407'
  },
  {
    prefix: ';link',
    slash: '/link',
    aliases: '-',
    category: 'utility',
    descEn: 'Link your Discord account to your osu! profile for automatic username resolution.',
    descId: 'Tautkan akun Discord ke akun osu! kamu agar tidak perlu mengetikkan username setiap kali.',
    example: ';link BTMC'
  },
  {
    prefix: ';about',
    slash: '/about',
    aliases: ';info, ;botinfo',
    category: 'utility',
    descEn: 'Display official bot information, capability highlights, version notes, and useful links.',
    descId: 'Tampilkan informasi resmi bot, ringkasan fitur, catatan versi, dan tautan bermanfaat.',
    example: ';about'
  },
  {
    prefix: ';github',
    slash: '/github',
    aliases: ';repo',
    category: 'utility',
    descEn: 'Direct interactive link to the open-source GitHub repository.',
    descId: 'Tautan langsung ke repositori open-source GitHub bot.',
    example: ';github'
  }
];

// Simulated Showcase Tabs featuring real pro players (BTMC, mrekk, Lifeline, RyuK)
const SHOWCASE_TABS = {
  profile: {
    img: 'assets/images/preview-profile.png',
    simUser: 'BTMC Fan',
    simCmd: ';p BTMC',
    badgeEn: 'BTMC (#306 Global • Aim Specialist)',
    badgeId: 'BTMC (#306 Global • Spesialis Aim)',
    titleEn: 'Portrait Profile Dashboard (900 × 920 px)',
    titleId: 'Dashboard Profil Portrait Modern (900 × 920 px)',
    descEn: 'Simulated profile inspection for BTMC. Shows hollow donut skill breakdown (Aim: 56%, Speed: 20%, Acc: 24%), Bancho performance cards, level progress bar, medals unlocked, and grade showcase.',
    descId: 'Simulasi kartu profil untuk BTMC. Menampilkan diagram donat rasio skill (Aim: 56%, Speed: 20%, Acc: 24%), statistik Bancho, level progress bar, medali, dan grade SS/S/A.'
  },
  versus: {
    img: 'assets/images/preview-versus.png',
    simUser: 'Tournament Host',
    simCmd: ';vs mrekk Lifeline',
    badgeEn: 'mrekk (#1) vs Lifeline (#2) Showdown',
    badgeId: 'Tanding mrekk (#1) vs Lifeline (#2)',
    titleEn: '1v1 Head-to-Head Duel (Cozy Red & Blue)',
    titleId: 'Duel Head-to-Head 1v1 (Cozy Merah & Biru)',
    descEn: 'Simulated high-stakes battle between #1 mrekk and #2 Lifeline. Features dynamic glowing 7-block round winner indicators across Rank, PP, Acc, Play Time, Plays, Score, and Grades.',
    descId: 'Simulasi duel sengit antara rank 1 dunia mrekk dan rank 2 Lifeline. Dilengkapi indikator 7 blok pemenang ronde yang menyala untuk Rank, PP, Acc, Play Time, Plays, Score, dan Grades.'
  },
  mini: {
    img: 'assets/images/preview-mini.png',
    simUser: 'Twitch Streamer',
    simCmd: ';m mrekk 1',
    badgeEn: 'mrekk • 1,352pp (+HDDT) • TUYU',
    badgeId: 'mrekk • 1,352pp (+HDDT) • TUYU',
    titleEn: 'Stream-Ready Mini Score Widget',
    titleId: 'Widget Mini Skor Ringkas & Elegan',
    descEn: 'Simulated top play #1 for mrekk on TUYU - Anoyo-iki no Bus ni Notte Saraba (+HDDT 9.85★). Compact layout with combo badge, star rating, mod chips, and real PP calculation.',
    descId: 'Simulasi skor top #1 mrekk pada map TUYU - Anoyo-iki no Bus ni Notte Saraba (+HDDT 9.85★). Desain ringkas dengan badge kombo, rating bintang, mod chips, dan kalkulasi PP asli.'
  },
  recent: {
    img: 'assets/images/preview-score.png',
    simUser: 'Speed Fan',
    simCmd: ';r RyuK',
    badgeEn: 'RyuK • 945pp (+HDDT) • Goodbye',
    badgeId: 'RyuK • 945pp (+HDDT) • Goodbye',
    titleEn: 'Detailed Full Score Card with Fail Tracking',
    titleId: 'Kartu Skor Penuh dengan Deteksi Fail',
    descEn: 'Simulated recent score inspection for RyuK on The Eden Project - Goodbye (+HDDT 8.42★). Displays 300/100/50/miss judgments, exact completion percentage if failed, and mod attributes.',
    descId: 'Simulasi skor terbaru RyuK pada beatmap The Eden Project - Goodbye (+HDDT 8.42★). Memuat penilaian hit (300/100/50/miss), persentase progres fail jika gagal, dan atribut mod.'
  },
  beatmap: {
    img: 'assets/images/preview-beatmap.png',
    simUser: 'Multiplayer Lobby',
    simCmd: ';b 129891 +HDHR',
    badgeEn: 'xi - FREEDOM DiVE [FOUR DIMENSIONS] (+HDHR)',
    badgeId: 'xi - FREEDOM DiVE [FOUR DIMENSIONS] (+HDHR)',
    titleEn: 'Modern Beatmap Specifications & Difficulty',
    titleId: 'Kartu Spesifikasi Beatmap & Kalkulasi Mod',
    descEn: 'Simulated beatmap card for FREEDOM DiVE. Automatically calculates modded difficulty attributes for HDHR (8.35★, CS 5.2, AR 10, OD 10) with direct download button.',
    descId: 'Simulasi kartu beatmap FREEDOM DiVE. Otomatis menghitung penyesuaian kesulitan mod untuk HDHR (8.35★, CS 5.2, AR 10, OD 10) lengkap dengan tombol unduh.'
  }
};

// Chunk definitions for on-demand loading in Command Explorer
// Images are NEVER requested until a user clicks a command card!
const COMMAND_CHUNKS = {
  ';vs': {
    type: 'image',
    src: 'assets/images/preview-versus.png',
    simCmd: ';vs mrekk Lifeline',
    titleEn: '1v1 Versus Duel Preview (mrekk vs Lifeline)',
    titleId: 'Pratinjau Duel 1v1 Versus (mrekk vs Lifeline)',
    descEn: 'Head-to-head showdown comparison across 7 core metrics with glowing round winner blocks.',
    descId: 'Perbandingan duel 1v1 pada 7 metrik performa dengan blok pemenang ronde yang menyala.'
  },
  ';pcard': {
    type: 'image',
    src: 'assets/images/preview-profile.png',
    simCmd: ';p BTMC',
    titleEn: 'Portrait Profile Card Preview (BTMC)',
    titleId: 'Pratinjau Kartu Profil Portrait (BTMC)',
    descEn: 'Compact 900x920 portrait profile dashboard with hollow donut skill breakdown and player cover background.',
    descId: 'Dashboard profil portrait compact 900x920 dengan diagram donat rasio skill dan background cover pemain.'
  },
  ';m': {
    type: 'image',
    src: 'assets/images/preview-mini.png',
    simCmd: ';m mrekk 1',
    titleEn: 'Mini Score Card Preview (mrekk)',
    titleId: 'Pratinjau Kartu Mini Skor (mrekk)',
    descEn: 'Ultra-fast mini widget highlighting avatar, combo badge, star rating, mods, and performance points.',
    descId: 'Widget mini super cepat yang menonjolkan avatar, badge kombo, rating bintang, mods, dan PP.'
  },
  ';r': {
    type: 'image',
    src: 'assets/images/preview-score.png',
    simCmd: ';r RyuK',
    titleEn: 'Detailed Full Score Card Preview (RyuK)',
    titleId: 'Pratinjau Kartu Skor Lengkap (RyuK)',
    descEn: 'Comprehensive hit judgments (300/100/50/miss), modded difficulty calculation, and true fail completion progress.',
    descId: 'Statistik penilaian hit lengkap (300/100/50/miss), kalkulasi kesulitan mod, dan persentase progres fail.'
  },
  ';t': {
    type: 'image',
    src: 'assets/images/preview-top.png',
    simCmd: ';t BTMC 5',
    titleEn: 'Top Plays Leaderboard Card Preview (BTMC)',
    titleId: 'Pratinjau Kartu Top Plays Leaderboard (BTMC)',
    descEn: 'Clean leaderboard table displaying top performance plays, beatmaps, mods, acc, and PP values.',
    descId: 'Tabel papan peringkat bersih yang menampilkan daftar skor terbaik, beatmap, mods, acc, dan PP.'
  },
  ';b': {
    type: 'image',
    src: 'assets/images/preview-beatmap.png',
    simCmd: ';b 129891 +HDHR',
    titleEn: 'Beatmap Specifications Card Preview',
    titleId: 'Pratinjau Kartu Spesifikasi Beatmap',
    descEn: 'Modern beatmap summary with modded star rating, CS/AR/OD/HP attributes, and direct Beatconnect download link.',
    descId: 'Ringkasan beatmap modern dengan rating bintang modifikasi, atribut CS/AR/OD/HP, dan link unduh Beatconnect.'
  },
  ';s': {
    type: 'image',
    src: 'assets/images/preview-score.png',
    simCmd: ';s 7265198407',
    titleEn: 'Scorecard from Score ID Preview',
    titleId: 'Pratinjau Kartu Skor dari ID Skor',
    descEn: 'Directly resolves an osu! score URL or numeric ID into a high-resolution visual card.',
    descId: 'Mengubah URL skor osu! atau Score ID angka langsung menjadi kartu grafis beresolusi tinggi.'
  },
  ';c': {
    type: 'image',
    src: 'assets/images/preview-score.png',
    simCmd: ';c (reply to score message)',
    titleEn: 'Smart Reply Compare Preview',
    titleId: 'Pratinjau Smart Compare via Reply',
    descEn: 'Reply to any score message from any bot and type ;c to instantly check your personal best score on that map.',
    descId: 'Cukup reply pesan skor dari bot apa pun dan ketik ;c untuk langsung mengecek top skor kamu pada map tersebut.'
  },
  ';link': {
    type: 'embed',
    simCmd: ';link BTMC',
    titleEn: 'Account Linked Successfully',
    titleId: 'Akun Berhasil Ditautkan',
    descEn: '✅ Successfully linked osu! account **BTMC** (Rank: #306) to your Discord account! You can now use `;m`, `;r`, or `;p` without typing your username.',
    descId: '✅ Berhasil menautkan akun osu! **BTMC** (Rank: #306) ke akun Discord kamu! Sekarang kamu bisa langsung ketik `;m`, `;r`, atau `;p` tanpa perlu mengisi nama pemain lagi.'
  },
  ';about': {
    type: 'about_embed',
    simCmd: ';about',
    titleEn: 'Columbina Bot Information',
    titleId: 'Informasi Columbina Bot'
  },
  ';github': {
    type: 'embed',
    simCmd: ';github',
    titleEn: '🌸 Columbina Bot - GitHub Repository',
    titleId: '🌸 Columbina Bot - Repositori GitHub',
    descEn: 'Columbina Bot is an open-source, high-performance osu! visual card generator for Discord.\n\n⭐ **Repository URL:**\nhttps://github.com/noeltamba/osu-Beatmap-Card-Generator-Discord-Bot',
    descId: 'Columbina Bot adalah bot Discord generator kartu visual osu! berkinerja tinggi dan open-source.\n\n⭐ **URL Repositori:**\nhttps://github.com/noeltamba/osu-Beatmap-Card-Generator-Discord-Bot'
  }
};

let currentLang = localStorage.getItem('columbina_web_lang') || 'en';

// Translations Dictionary for Web UI
const I18N_WEB = {
  en: {
    nav_features: 'Features',
    nav_showcase: 'Showcase',
    nav_commands: 'Commands',
    nav_guide: 'Quick Start',
    nav_invite: 'Add to Discord',
    hero_pill: '✨ v1.4.2 Released — Official Showcase Website & Custom Discord Emojis',
    hero_title: 'Transform Your <span class="bg-gradient-to-r from-rose-400 via-purple-300 to-sky-400 bg-clip-text text-transparent">osu! Journey</span> Into Stunning Visuals',
    hero_desc: 'A next-generation Discord bot crafted to turn raw osu! gameplay metrics into elegant frosted-glass score summaries, portrait profile dashboards, 1v1 showdown duels, and stream-ready mini widgets.',
    hero_btn_invite: 'Add to Discord',
    hero_btn_github: 'View Repository',
    hero_stat_1: 'osu! API v2',
    hero_stat_1_sub: 'Accurate Modeling',
    hero_stat_2: 'Fail Tracking',
    hero_stat_2_sub: 'Real Fail % Progress',
    hero_stat_3: '; Quick Prefix',
    hero_stat_3_sub: 'Instant Response',
    showcase_title: 'Interactive Visual Showcase',
    showcase_subtitle: 'Explore live simulated screenshots generated by Columbina Bot in Discord for top players.',
    tab_profile: '🎴 BTMC Profile',
    tab_versus: '⚔️ mrekk vs Lifeline',
    tab_mini: '📱 mrekk Mini Score',
    tab_recent: '🎯 RyuK Full Score',
    tab_beatmap: '🗺️ FREEDOM DiVE',
    feat_title: 'Crafted for Competitive & Casual Players',
    feat_subtitle: 'Engineered from the ground up with accuracy, aesthetics, and community engagement in mind.',
    feat_1_title: 'Pinpoint Fail Tracking',
    feat_1_desc: 'Accurately recognizes failed scores with passed: false in osu! API v2 / Lazer. Automatically computes the exact song completion percentage (e.g. Fail 70%) and suppresses misleading full PP values.',
    feat_2_title: 'Bathbot-Inspired Skill Breakdown',
    feat_2_desc: 'Applies weighted skill decay formulas ($0.95^n$) across Aim / Jump, Speed / Tapping, and Accuracy / Timing with a sleek hollow circular donut diagram and dynamic playstyle archetypes.',
    feat_3_title: 'Head-to-Head Versus Duels',
    feat_3_desc: 'Challenge any rival in 1v1 duels with cozy rose-red and sky-blue palettes. Compare personal bests on the same beatmap or compete across 7 Bancho profile metrics with 7-block round trackers.',
    feat_4_title: 'Ultra-Fast Prefix Commands (;)',
    feat_4_desc: 'Skip slash command lag with instant prefix triggers: ;m, ;r, ;vs, ;c, ;p, ;b. Slash commands (/) remain fully available with bilingual descriptions.',
    feat_5_title: 'Smart Reply Compare (;c)',
    feat_5_desc: 'Simply reply to any score message sent by any bot (Columbina, Bathbot, owo) and type ;c to instantly look up your personal best score on that beatmap.',
    feat_6_title: 'Bilingual Localization (EN & ID)',
    feat_6_desc: 'Full native support for both 🇬🇧 English and 🇮🇩 Bahasa Indonesia across all command embeds, button labels, error notices, and card generators.',
    cmd_title: 'Command Explorer & Cheat Sheet',
    cmd_subtitle: 'Click any command card below to open its simulated output preview on-demand.',
    cmd_search_ph: 'Search command... (e.g. recent, versus, profile, mini)',
    cmd_cat_all: 'All',
    cmd_cat_score: 'Scoring & Mini',
    cmd_cat_profile: 'Profile & Duels',
    cmd_cat_beatmap: 'Beatmaps',
    cmd_cat_utility: 'Utility & Settings',
    guide_title: 'Get Started in Under 30 Seconds',
    guide_subtitle: 'Effortlessly bring modern osu! graphics to your Discord community.',
    step_1_title: '1. Invite Columbina',
    step_1_desc: 'Click the invite button to add the bot to your Discord server with zero complex permissions.',
    step_2_title: '2. Link Your osu! Account',
    step_2_desc: 'Type ;link <username> or /link username:<name> to remember your profile permanently.',
    step_3_title: '3. Flex & Showdown',
    step_3_desc: 'Enjoy instant score cards (;m), check your skill profile (;p), or challenge rivals (;vs).',
    footer_desc: 'An open-source, high-performance osu! visual card generator bot for Discord.',
    footer_dev: 'Crafted with ❤️ by @noeltamba & @hyzity.',
    footer_disclaimer: 'Columbina Bot is an open-source community project and is not affiliated with or endorsed by ppy Pty Ltd or osu!.'
  },
  id: {
    nav_features: 'Fitur',
    nav_showcase: 'Showcase',
    nav_commands: 'Perintah',
    nav_guide: 'Panduan',
    nav_invite: 'Undang ke Discord',
    hero_pill: '✨ Rilis v1.4.2 — Website Showcase Resmi & Custom Emoji Discord',
    hero_title: 'Ubah Perjalanan <span class="bg-gradient-to-r from-rose-400 via-purple-300 to-sky-400 bg-clip-text text-transparent">osu! Kamu</span> Menjadi Visual Menawan',
    hero_desc: 'Bot Discord generasi baru yang dirancang untuk mengubah data gameplay osu! menjadi kartu grafis bertema frosted-glass, dashboard profil portrait, duel 1v1, dan widget mini ringkas.',
    hero_btn_invite: 'Undang ke Discord',
    hero_btn_github: 'Lihat Repositori',
    hero_stat_1: 'osu! API v2',
    hero_stat_1_sub: 'Akurasi Modeling',
    hero_stat_2: 'Deteksi Fail',
    hero_stat_2_sub: 'Progres Fail % Asli',
    hero_stat_3: 'Prefix Cepat ;',
    hero_stat_3_sub: 'Respon Instan',
    showcase_title: 'Galeri Visual Interaktif',
    showcase_subtitle: 'Jelajahi simulasi screenshot live kartu yang digenerate oleh Columbina Bot di Discord untuk pemain-pemain top.',
    tab_profile: '🎴 Profil BTMC',
    tab_versus: '⚔️ mrekk vs Lifeline',
    tab_mini: '📱 Mini Skor mrekk',
    tab_recent: '🎯 Skor Penuh RyuK',
    tab_beatmap: '🗺️ FREEDOM DiVE',
    feat_title: 'Dirancang untuk Pemain Kasual & Kompetitif',
    feat_subtitle: 'Dibuat dengan fokus pada akurasi kalkulasi, estetika visual modern, dan kemudahan bagi komunitas.',
    feat_1_title: 'Deteksi Fail Presisi',
    feat_1_desc: 'Mengenali secara akurat skor dengan passed: false dari API v2 / Lazer. Otomatis menghitung persentase progres sebelum pemain gagal (cth: Fail 70%) dan memfilter nilai PP palsu.',
    feat_2_title: 'Analisis Skill Bathbot',
    feat_2_desc: 'Menerapkan formula decay pembobotan skill ($0.95^n$) untuk Aim / Jump, Speed / Tapping, dan Akurasi / Timing dengan diagram donat lingkar berlubang dan arketipe playstyle dinamis.',
    feat_3_title: 'Duel Head-to-Head 1v1',
    feat_3_desc: 'Tantang teman atau rival dalam duel 1v1 bertema cozy merah-biru. Bandingkan skor pada beatmap yang sama atau bandingkan 7 metrik profil Bancho dengan 7 blok pemenang ronde.',
    feat_4_title: 'Perintah Prefix Cepat (;)',
    feat_4_desc: 'Tanpa loading menu slash command berkat prefix instan: ;m, ;r, ;vs, ;c, ;p, ;b. Slash command (/) tetap tersedia penuh dengan penjelasan dwibahasa.',
    feat_5_title: 'Smart Compare via Reply (;c)',
    feat_5_desc: 'Cukup reply pesan skor dari bot mana pun (Columbina, Bathbot, owo) dan ketik ;c untuk langsung mengecek skor terbaik kamu di beatmap tersebut.',
    feat_6_title: 'Dukungan Dwibahasa (ID & EN)',
    feat_6_desc: 'Dukungan penuh untuk 🇮🇩 Bahasa Indonesia dan 🇬🇧 English di seluruh embed respon, tombol interaktif, pesan kesalahan, dan kartu grafis.',
    cmd_title: 'Katalog Perintah & Cheat Sheet',
    cmd_subtitle: 'Klik kartu perintah mana saja untuk membuka pratinjau contoh outputnya (dimuat secara on-demand/chunk).',
    cmd_search_ph: 'Cari perintah... (cth: recent, versus, profile, mini)',
    cmd_cat_all: 'Semua',
    cmd_cat_score: 'Skor & Mini',
    cmd_cat_profile: 'Profil & Duel',
    cmd_cat_beatmap: 'Beatmap',
    cmd_cat_utility: 'Utilitas & Akun',
    guide_title: 'Mulai Hanya Dalam 30 Detik',
    guide_subtitle: 'Bawa visual kartu osu! modern ke server Discord komunitasmu dengan sangat mudah.',
    step_1_title: '1. Undang Columbina',
    step_1_desc: 'Klik tombol undang untuk menambahkan bot ke server Discord kamu tanpa perizinan rumit.',
    step_2_title: '2. Tautkan Akun osu!',
    step_2_desc: 'Ketik ;link <username> atau /link username:<nama> agar bot mengingat akun osu! kamu.',
    step_3_title: '3. Flex & Tanding',
    step_3_desc: 'Langsung pamerkan skor terbaru (;m), cek kartu profil skill (;p), atau ajak duel temanmu (;vs).',
    footer_desc: 'Bot generator kartu visual osu! berkinerja tinggi dan open-source untuk Discord.',
    footer_dev: 'Dibuat dengan ❤️ oleh @noeltamba & @hyzity.',
    footer_disclaimer: 'Columbina Bot adalah proyek komunitas open-source dan tidak terafiliasi dengan ppy Pty Ltd atau osu!.'
  }
};

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('columbina_web_lang', lang);

  // Update elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (I18N_WEB[lang] && I18N_WEB[lang][key]) {
      el.innerHTML = I18N_WEB[lang][key];
    }
  });

  // Update elements with data-i18n-attr (e.g. placeholder:cmd_search_ph)
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrPair = el.getAttribute('data-i18n-attr').split(':');
    if (attrPair.length === 2) {
      const attr = attrPair[0];
      const key = attrPair[1];
      if (I18N_WEB[lang] && I18N_WEB[lang][key]) {
        el.setAttribute(attr, I18N_WEB[lang][key]);
      }
    }
  });

  // Update active showcase tab content
  const activeTabBtn = document.querySelector('.tab-btn.active');
  const activeTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'profile';
  updateShowcaseTab(activeTab);

  // Re-render commands list
  renderCommands();

  // Update lang toggle buttons visual state
  document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.classList.add('bg-rose-500/20', 'text-rose-300', 'border-rose-500/40');
      btn.classList.remove('text-slate-400', 'border-transparent');
    } else {
      btn.classList.remove('bg-rose-500/20', 'text-rose-300', 'border-rose-500/40');
      btn.classList.add('text-slate-400', 'border-transparent');
    }
  });
}

function updateShowcaseTab(tabKey) {
  const data = SHOWCASE_TABS[tabKey];
  if (!data) return;

  const imgEl = document.getElementById('showcase-image');
  const badgeEl = document.getElementById('showcase-badge');
  const titleEl = document.getElementById('showcase-title');
  const descEl = document.getElementById('showcase-desc');
  const simUserEl = document.getElementById('sim-user-name');
  const simCmdEl = document.getElementById('sim-command-text');

  if (imgEl) {
    imgEl.style.opacity = '0';
    setTimeout(() => {
      imgEl.src = data.img;
      imgEl.style.opacity = '1';
    }, 150);
  }

  if (simUserEl && data.simUser) simUserEl.textContent = data.simUser;
  if (simCmdEl && data.simCmd) simCmdEl.textContent = data.simCmd;
  if (badgeEl) badgeEl.textContent = currentLang === 'id' ? data.badgeId : data.badgeEn;
  if (titleEl) titleEl.textContent = currentLang === 'id' ? data.titleId : data.titleEn;
  if (descEl) descEl.textContent = currentLang === 'id' ? data.descId : data.descEn;
}

let activeCategory = 'all';
let searchQuery = '';

function renderCommands() {
  const container = document.getElementById('commands-list');
  if (!container) return;

  const isId = currentLang === 'id';
  const query = searchQuery.toLowerCase().trim();

  const filtered = COMMANDS_DATA.filter(cmd => {
    const matchesCat = activeCategory === 'all' || cmd.category === activeCategory;
    const matchesSearch = !query ||
      cmd.prefix.toLowerCase().includes(query) ||
      cmd.slash.toLowerCase().includes(query) ||
      cmd.aliases.toLowerCase().includes(query) ||
      (isId ? cmd.descId.toLowerCase() : cmd.descEn.toLowerCase()).includes(query);
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <svg class="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" stroke-width="2"></circle>
          <path d="m21 21-4.35-4.35" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        <p class="text-base font-medium">${isId ? 'Tidak ada perintah yang cocok dengan pencarian.' : 'No commands matched your search.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(cmd => `
    <div onclick="openCommandPreview('${cmd.prefix}')" class="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between group cursor-pointer transition-all hover:scale-[1.01]" title="${isId ? 'Klik untuk pratinjau output' : 'Click to preview output'}">
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">${cmd.prefix}</span>
            <span class="text-xs text-slate-400 font-mono">${cmd.slash}</span>
          </div>
          <button onclick="event.stopPropagation(); copyToClipboard('${cmd.example}', this)" title="Copy example" class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors">
            <svg class="w-4 h-4 copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <svg class="w-4 h-4 check-icon hidden text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          </button>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed mb-4">${isId ? cmd.descId : cmd.descEn}</p>
      </div>
      <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span class="font-mono text-slate-500">Ex: <code class="text-slate-300">${cmd.example}</code></span>
        <span class="text-xs font-semibold text-rose-400 group-hover:text-rose-300 flex items-center gap-1 transition-colors">
          <span>${isId ? 'Lihat Contoh' : 'Preview'}</span>
          <span class="group-hover:translate-x-1 transition-transform">&rarr;</span>
        </span>
      </div>
    </div>
  `).join('');
}

// -------------------------------------------------------------
// CHUNK LAZY-LOAD METHOD FOR COMMAND PREVIEWS
// Zero bytes loaded until a card is clicked!
// -------------------------------------------------------------
function openCommandPreview(prefix) {
  const modal = document.getElementById('cmd-chunk-modal');
  const body = document.getElementById('chunk-modal-body');
  if (!modal || !body) return;

  const isId = currentLang === 'id';
  const chunk = COMMAND_CHUNKS[prefix];
  if (!chunk) return;

  // 1. Show modal with smooth loading spinner skeleton
  modal.classList.remove('hidden');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  body.innerHTML = `
    <div class="py-14 text-center">
      <div class="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p class="text-xs font-medium text-slate-400 font-mono tracking-wide">${isId ? 'Memuat pratinjau perintah on-demand...' : 'Loading command preview on-demand...'}</p>
    </div>
  `;

  // 2. Load chunk based on type
  if (chunk.type === 'image') {
    // Dynamic on-demand Image fetch
    const img = new Image();
    img.src = chunk.src;
    img.onload = () => {
      body.innerHTML = `
        <div class="animate-modal-in space-y-5">
          <!-- Header info -->
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">${prefix}</span>
                <h3 class="font-bold text-lg text-white">${isId ? chunk.titleId : chunk.titleEn}</h3>
              </div>
              <p class="text-xs text-slate-400 mt-1">${isId ? chunk.descId : chunk.descEn}</p>
            </div>
          </div>

          <!-- Simulated Discord Message -->
          <div class="discord-mockup p-4 sm:p-5 space-y-4">
            <!-- Simulated User Input -->
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">🎮</div>
              <div>
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-bold text-slate-200">osu! Player</span>
                  <span class="text-[10px] text-slate-500">Today at 4:20 PM</span>
                </div>
                <code class="text-xs text-rose-300 font-mono bg-black/40 px-2 py-0.5 rounded mt-1 inline-block">${chunk.simCmd}</code>
              </div>
            </div>

            <!-- Simulated Bot Output -->
            <div class="flex items-start gap-3 pl-3 border-l-2 border-rose-500/40">
              <img src="assets/images/logo.jpg" alt="Columbina" class="w-8 h-8 rounded-full object-cover shrink-0">
              <div class="w-full">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-white">Columbina</span>
                  <span class="px-1 py-0.2 text-[9px] font-bold rounded bg-[#5865F2] text-white">BOT</span>
                  <span class="text-[10px] text-slate-500">Today at 4:20 PM</span>
                </div>
                <!-- The Loaded Image Chunk -->
                <div class="mt-2.5">
                  <img src="${chunk.src}" alt="${prefix} Output Preview" class="rounded-xl shadow-2xl max-h-[460px] w-auto object-contain border border-white/10 mx-auto">
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span class="font-mono text-slate-500">Example: <code class="text-slate-300">${chunk.simCmd}</code></span>
            <button onclick="copyToClipboard('${chunk.simCmd}', this)" class="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold border border-rose-500/30 transition-colors">
              ${isId ? 'Salin Perintah' : 'Copy Command'}
            </button>
          </div>
        </div>
      `;
    };
    img.onerror = () => {
      body.innerHTML = `
        <div class="py-8 text-center text-rose-400">
          <p class="text-sm font-semibold">${isId ? 'Gagal memuat gambar pratinjau.' : 'Failed to load preview image.'}</p>
        </div>
      `;
    };
  } else if (chunk.type === 'about_embed') {
    // Simulated rich embed for ;about
    setTimeout(() => {
      body.innerHTML = `
        <div class="animate-modal-in space-y-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">${prefix}</span>
                <h3 class="font-bold text-lg text-white">${isId ? chunk.titleId : chunk.titleEn}</h3>
              </div>
              <p class="text-xs text-slate-400 mt-1">${isId ? 'Menampilkan ringkasan bot, panduan cepat, dan tautan resmi.' : 'Displays bot highlights, quick start guide, and official links.'}</p>
            </div>
          </div>

          <div class="discord-mockup p-4 sm:p-5 space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">🎮</div>
              <div>
                <span class="text-xs font-bold text-slate-200">osu! Player</span>
                <code class="text-xs text-rose-300 font-mono bg-black/40 px-2 py-0.5 rounded mt-1 block w-fit">${chunk.simCmd}</code>
              </div>
            </div>

            <div class="flex items-start gap-3 pl-3 border-l-2 border-rose-500/40">
              <img src="assets/images/logo.jpg" alt="Columbina" class="w-8 h-8 rounded-full object-cover shrink-0">
              <div class="w-full">
                <span class="text-xs font-bold text-white">Columbina <span class="px-1 py-0.2 text-[9px] font-bold rounded bg-[#5865F2] text-white">BOT</span></span>
                
                <!-- Simulated Discord Embed Card -->
                <div class="discord-embed-card p-4 mt-2 space-y-3">
                  <div class="flex items-center gap-2 text-xs text-slate-400">
                    <img src="assets/images/logo.jpg" class="w-4 h-4 rounded-full">
                    <span>Columbina Bot • osu! Companion</span>
                  </div>
                  <h4 class="font-bold text-white text-sm">🌸 Columbina Bot (v1.4.2)</h4>
                  <p class="text-xs text-slate-300 leading-relaxed">${isId ? 'Bot Discord visual osu! modern untuk pamer skor estetik, pantau profil skill, dan tanding 1v1.' : 'Modern osu! Discord companion for visual score cards, skill breakdowns, and 1v1 duels.'}</p>
                  
                  <div class="text-xs space-y-1.5 pt-2 border-t border-white/5">
                    <div class="font-bold text-slate-200">🎮 ${isId ? 'Fitur Utama' : 'Core Features'}</div>
                    <p class="text-slate-300 text-[11px] leading-relaxed">
                      • <b>${isId ? 'Cek Skor & PP' : 'Score & PP Check'}</b> (<code>;m</code>, <code>;r</code>)<br>
                      • <b>${isId ? 'Profil Skill' : 'Skill Profile'}</b> (<code>;p</code>)<br>
                      • <b>${isId ? 'Versus Duel' : 'Versus Duel'}</b> (<code>;vs</code>)<br>
                      • <b>${isId ? 'Smart Compare' : 'Smart Compare'}</b> (<code>;c</code>)
                    </p>
                  </div>

                  <div class="text-xs space-y-1.5 pt-2 border-t border-white/5">
                    <div class="font-bold text-slate-200">⚡ ${isId ? 'Cara Pakai Cepat' : 'Quick Start'}</div>
                    <p class="text-slate-300 text-[11px] leading-relaxed font-mono">
                      1. ;link &lt;username&gt;<br>
                      2. ;m<br>
                      3. ;p<br>
                      4. ;vs &lt;player&gt;
                    </p>
                  </div>
                </div>

                <!-- Simulated ActionRow Buttons -->
                <div class="mt-3 flex flex-wrap gap-2 text-xs">
                  <span class="px-3 py-1 rounded bg-[#2b2d31] text-white border border-white/5 font-semibold">📨 ${isId ? 'Undang Columbina' : 'Invite Columbina'}</span>
                  <span class="px-3 py-1 rounded bg-[#2b2d31] text-white border border-white/5 font-semibold">🌐 ${isId ? 'Website Resmi' : 'Official Website'}</span>
                  <span class="px-3 py-1 rounded bg-[#2b2d31] text-white border border-white/5 font-semibold">⭐ GitHub</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }, 100);
  } else {
    // Generic text/embed chunk
    setTimeout(() => {
      body.innerHTML = `
        <div class="animate-modal-in space-y-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">${prefix}</span>
                <h3 class="font-bold text-lg text-white">${isId ? chunk.titleId : chunk.titleEn}</h3>
              </div>
            </div>
          </div>

          <div class="discord-mockup p-4 sm:p-5 space-y-4">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">🎮</div>
              <div>
                <span class="text-xs font-bold text-slate-200">osu! Player</span>
                <code class="text-xs text-rose-300 font-mono bg-black/40 px-2 py-0.5 rounded mt-1 block w-fit">${chunk.simCmd}</code>
              </div>
            </div>

            <div class="flex items-start gap-3 pl-3 border-l-2 border-emerald-500/40">
              <img src="assets/images/logo.jpg" alt="Columbina" class="w-8 h-8 rounded-full object-cover shrink-0">
              <div class="w-full">
                <span class="text-xs font-bold text-white">Columbina <span class="px-1 py-0.2 text-[9px] font-bold rounded bg-[#5865F2] text-white">BOT</span></span>
                <div class="p-3 mt-2 rounded-lg bg-slate-900 border border-white/5 text-xs text-slate-200 leading-relaxed font-mono">
                  ${isId ? chunk.descId : chunk.descEn}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }, 100);
  }
}

function closeCommandPreview() {
  const modal = document.getElementById('cmd-chunk-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    const copyIcon = btnElement.querySelector('.copy-icon');
    const checkIcon = btnElement.querySelector('.check-icon');
    if (copyIcon && checkIcon) {
      copyIcon.classList.add('hidden');
      checkIcon.classList.remove('hidden');
      setTimeout(() => {
        copyIcon.classList.remove('hidden');
        checkIcon.classList.add('hidden');
      }, 1500);
    }
  });
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // 1. Showcase tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabKey = btn.getAttribute('data-tab');
      updateShowcaseTab(tabKey);
    });
  });

  // 2. Command search input
  const searchInput = document.getElementById('command-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderCommands();
    });
  }

  // 3. Command category filter buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('bg-rose-500/20', 'text-rose-300', 'border-rose-500/40');
        b.classList.add('bg-slate-900/60', 'text-slate-400', 'border-white/5');
      });
      btn.classList.remove('bg-slate-900/60', 'text-slate-400', 'border-white/5');
      btn.classList.add('bg-rose-500/20', 'text-rose-300', 'border-rose-500/40');
      activeCategory = btn.getAttribute('data-cat');
      renderCommands();
    });
  });

  // 4. Language toggle buttons
  document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.getAttribute('data-lang');
      applyLanguage(selectedLang);
    });
  });

  // 5. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // 6. Close Modal Listeners
  const closeModalBtn = document.getElementById('close-chunk-modal-btn');
  const modalOverlay = document.getElementById('cmd-chunk-modal');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeCommandPreview);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeCommandPreview();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCommandPreview();
  });

  // Apply default language
  applyLanguage(currentLang);
});
