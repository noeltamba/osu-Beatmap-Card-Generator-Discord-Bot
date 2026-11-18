// Columbina Bot Showcase - Interactive Client Scripts

const COMMANDS_DATA = [
  {
    prefix: ';vs',
    slash: '/versus',
    aliases: ';versus',
    category: 'profile',
    descEn: 'Compare two players head-to-head on a beatmap score or overall profile showdown (supports map replies).',
    descId: 'Tanding duel 1v1 antar pemain pada skor beatmap atau profil Bancho secara langsung.',
    example: ';vs BTMC'
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
    example: ';m BTMC 1'
  },
  {
    prefix: ';r',
    slash: '/recent',
    aliases: ';rs',
    category: 'score',
    descEn: 'Comprehensive full score card with 300/100/50/miss judgments, fail detection (Fail %), and modded map stats.',
    descId: 'Kartu skor lengkap dengan statistik hit (300/100/50/miss), deteksi fail akurat (Fail %), dan rating kesulitan mod.',
    example: ';r BTMC'
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
    example: ';b 129891 +HDDT'
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

const SHOWCASE_TABS = {
  profile: {
    img: 'assets/images/preview-profile.png',
    badgeEn: 'Portrait Profile Dashboard (900 × 920 px)',
    badgeId: 'Dashboard Profil Portrait Modern (900 × 920 px)',
    titleEn: 'Circular Donut Skill Breakdown & Bancho Stats',
    titleId: 'Diagram Donat Rasio Skill & Statistik Bancho',
    descEn: 'Calculates weighted Aim, Speed, and Accuracy skill ratios from top plays using official rosu-pp decay algorithms. Features a hollow circular donut chart, level progress bar, medals showcase, and official Bancho grade counters.',
    descId: 'Menganalisis rasio skill Aim, Speed, dan Akurasi dari top plays menggunakan formula pembobotan decay rosu-pp. Dilengkapi diagram donat lingkar berlubang, progress bar level, pameran medali, dan penghitung grade Bancho resmi.'
  },
  versus: {
    img: 'assets/images/preview-versus.png',
    badgeEn: '1v1 Head-to-Head Duel (3:4 TCG Ratio)',
    badgeId: 'Tanding 1v1 Head-to-Head (Rasio 3:4 TCG)',
    titleEn: 'Cozy Red & Blue Showdown with 7-Block Match Tracker',
    titleId: 'Adu Skor & Profil Cozy Merah-Biru dengan 7-Block Tracker',
    descEn: 'Challenge friends or rival players in a direct showdown. Supports comparing personal bests on the same beatmap (reply to any score to challenge!) or comparing 7 core Bancho profile metrics with glowing round winner blocks.',
    descId: 'Tantang teman atau rival secara langsung. Mendukung adu top skor pada beatmap yang sama (cukup reply pesan skor untuk menantang!) atau adu 7 metrik profil Bancho dengan 7 blok pemenang ronde yang menyala.'
  },
  beatmap: {
    img: 'assets/images/preview-beatmap.png',
    badgeEn: 'Modern Beatmap Info Card',
    badgeId: 'Kartu Informasi Beatmap Modern',
    titleEn: 'Comprehensive Difficulty Stats & Modded Calculation',
    titleId: 'Statistik Lengkap Beatmap & Kalkulasi Mod Otomatis',
    descEn: 'Get clean, anti-aliased visual summaries for any osu! beatmap. Automatically computes modded Star Rating, CS, AR, OD, HP, and BPM for mod combinations like DT, HR, EZ, or HT, with direct Beatconnect download buttons.',
    descId: 'Dapatkan kartu ringkasan visual beatmap osu! yang jernih. Otomatis menghitung perubahan Star Rating, CS, AR, OD, HP, dan BPM untuk kombinasi mod seperti DT, HR, EZ, atau HT, lengkap dengan tombol unduh Beatconnect.'
  },
  mini: {
    img: 'assets/images/preview-mini.png',
    badgeEn: 'Stream-Ready Mini Widget',
    badgeId: 'Widget Mini Skor Ringkas & Elegan',
    titleEn: 'Compact Score Summary for Active Communities',
    titleId: 'Ringkasan Skor Minimalis untuk Obrolan Komunitas',
    descEn: 'Ultra-fast mini widget engineered for high-frequency gameplay sharing and livestream overlays. Highlights player avatar with country flag, accuracy, combo badge, mod chips, and real performance points.',
    descId: 'Widget mini super cepat yang dirancang untuk berbagi skor santai di server Discord maupun overlay streaming. Menampilkan avatar & bendera pemain, akurasi, kombo, chip mods, dan PP performa asli.'
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
    hero_pill: '✨ v1.4.1 Released — Modern Portrait Profile & Cozy Duel',
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
    showcase_subtitle: 'Explore the high-resolution cards generated live by Columbina Bot in your Discord server.',
    tab_profile: '🎴 Portrait Profile',
    tab_versus: '⚔️ Versus Duel',
    tab_beatmap: '🗺️ Beatmap Card',
    tab_mini: '📱 Mini Score',
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
    cmd_subtitle: 'Click any command pill to copy it instantly to your clipboard.',
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
    hero_pill: '✨ Rilis v1.4.1 — Profil Portrait Modern & Duel Cozy Merah-Biru',
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
    showcase_subtitle: 'Jelajahi berbagai kartu visual beresolusi tinggi yang digenerate langsung oleh Columbina Bot di server Discord kamu.',
    tab_profile: '🎴 Profil Portrait',
    tab_versus: '⚔️ Duel Versus',
    tab_beatmap: '🗺️ Kartu Beatmap',
    tab_mini: '📱 Mini Skor',
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
    cmd_subtitle: 'Klik tombol perintah apa pun untuk langsung menyalinnya ke clipboard.',
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

  if (imgEl) {
    imgEl.style.opacity = '0';
    setTimeout(() => {
      imgEl.src = data.img;
      imgEl.style.opacity = '1';
    }, 150);
  }

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
    <div class="glass-panel glass-panel-hover p-5 rounded-2xl flex flex-col justify-between group">
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">${cmd.prefix}</span>
            <span class="text-xs text-slate-400 font-mono">${cmd.slash}</span>
          </div>
          <button onclick="copyToClipboard('${cmd.example}', this)" title="Copy example" class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors">
            <svg class="w-4 h-4 copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            <svg class="w-4 h-4 check-icon hidden text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          </button>
        </div>
        <p class="text-sm text-slate-300 leading-relaxed mb-4">${isId ? cmd.descId : cmd.descEn}</p>
      </div>
      <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span class="font-mono text-slate-500">Ex: <code class="text-slate-300">${cmd.example}</code></span>
        ${cmd.aliases !== '-' ? `<span class="text-slate-500">Alias: <span class="text-slate-400">${cmd.aliases}</span></span>` : ''}
      </div>
    </div>
  `).join('');
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

  // Apply default language
  applyLanguage(currentLang);
});
