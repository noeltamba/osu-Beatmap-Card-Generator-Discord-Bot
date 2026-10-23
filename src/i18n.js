const translations = {
  en: {
    // Buttons
    btn_open_score: 'Open Score on osu!',
    btn_open_beatmap: 'Open Beatmap',
    btn_open_on_osu: 'Open on osu!',
    btn_download: 'Download (Beatconnect)',
    btn_open_profile: 'Open osu! Profile',

    // Slash Commands description localizations
    cmd_link_desc: 'Link your Discord account to your osu! profile for easier /recent and /top commands',
    cmd_link_username: 'Your osu! username',
    cmd_unlink_desc: 'Unlink your osu! account from your Discord profile',
    cmd_recent_desc: 'Display recent score card for an osu! player',
    cmd_recent_player: 'osu! player username (optional if already linked)',
    cmd_top_desc: 'Display top performance plays leaderboard card for an osu! player',
    cmd_top_player: 'osu! player username (optional if already linked)',
    cmd_top_count: 'Number of plays to show (1 - 10, default: 10)',
    cmd_beatmap_desc: 'Display modern visual card for an osu! beatmap',
    cmd_beatmap_input: 'osu! beatmap link (e.g. https://osu.ppy.sh/b/12345) or Beatmap ID',
    cmd_beatmap_mods: 'osu! mods to apply (e.g. DT, HR, HDDT, EZ)',
    cmd_showcase_desc: 'Display beatmap showcase card for gameplay showcases',
    cmd_showcase_link: 'osu! beatmap link or Beatmap ID',
    cmd_showcase_player: 'Player username (optional if already linked)',
    cmd_showcase_mods: 'osu! mods to apply (e.g. DT, HR, HDDT, EZ)',
    cmd_scorecard_desc: 'Display osu! score card from score link or Score ID',
    cmd_scorecard_link: 'osu! score link (e.g. https://osu.ppy.sh/scores/7265198407) or Score ID',
    cmd_miniscorecard_desc: 'Display compact modern mini score card for an osu! score',
    cmd_miniscorecard_player: 'osu! player username (optional if already linked)',
    cmd_miniscorecard_link: 'osu! score link (e.g. https://osu.ppy.sh/scores/7265198407) or Score ID',
    cmd_miniscorecard_top: 'Show specific top play ranking (1 - 100, e.g. 1 for #1 top play)',
    cmd_language_desc: 'Choose your preferred language (English / Bahasa Indonesia)',
    cmd_language_option: 'Select language',

    // Command replies
    link_success: '✅ Successfully linked osu! account **{username}**{rank} to your Discord account!\nYou can now use `/recent`, `/top`, or `/showcase` without having to enter your username.',
    link_error: '❌ Failed to link account: {message}',
    unlink_success: '✅ Your linked osu! account has been unlinked successfully.',
    unlink_not_linked: 'ℹ️ Your Discord account is not linked to any osu! account.',

    recent_not_linked: '❌ You have not linked your osu! account yet.\nUse `/link username:<name>` first, or specify a player using `/recent player:<name>`.',
    recent_no_scores: 'ℹ️ No recent plays found for **{username}** in the last 24 hours.',
    recent_error: '❌ Failed to fetch score: {message}',

    top_not_linked: '❌ You have not linked your osu! account yet.\nUse `/link username:<name>` first, or specify a player using `/top player:<name>`.',
    top_no_scores: 'ℹ️ No top plays found for player **{username}**.',
    top_error: '❌ Failed to fetch top scores: {message}',

    beatmap_invalid_input: '❌ Invalid input format! Please enter a valid osu! beatmap URL or numeric Beatmap ID.',
    beatmap_error: '❌ Failed to fetch beatmap: {message}',

    scorecard_invalid_input: '❌ Invalid link or Score ID! Please enter a valid osu! score link (e.g. `https://osu.ppy.sh/scores/7265198407`) or numeric Score ID.',
    scorecard_error: '❌ Failed to fetch score data: {message}',

    // Language Command Embed
    lang_embed_title: '🌐 Preferred Language / Pilih Bahasa',
    lang_embed_desc: 'Choose your preferred language for bot messages, instructions, and cards.\nAll command responses and generated cards will follow your preference.\n\n*Current language:* **{currentLang}**',
    lang_btn_en: '🇬🇧 English (Default)',
    lang_btn_id: '🇮🇩 Bahasa Indonesia',
    lang_changed_en: '✅ Language preference has been set to **English**!',
    lang_changed_id: '✅ Preferensi bahasa telah diubah ke **Bahasa Indonesia**!',

    // Card texts
    tbl_rank: '#',
    tbl_grade: 'GRADE',
    tbl_beatmap: 'BEATMAP',
    tbl_mods: 'MODS',
    tbl_acc: 'ACC',
    tbl_combo: 'COMBO',
    tbl_performance: 'PERFORMANCE',
    tbl_date: 'DATE',
    top_header_title: 'TOP 10 PERFORMANCES',

    // Relative time
    time_just_now: 'Just now',
    time_minutes_ago: '{mins}m ago',
    time_hours_ago: '{hours}h ago',
    time_days_ago: '{days}d ago',
    date_locale: 'en-US'
  },
  id: {
    // Buttons
    btn_open_score: 'Buka Skor di osu!',
    btn_open_beatmap: 'Buka Beatmap',
    btn_open_on_osu: 'Buka di osu!',
    btn_download: 'Download (Beatconnect)',
    btn_open_profile: 'Buka Profil osu!',

    // Slash Commands description localizations
    cmd_link_desc: 'Tautkan akun Discord kamu ke akun osu! kamu untuk mempermudah /recent dan /top',
    cmd_link_username: 'Username osu! kamu',
    cmd_unlink_desc: 'Lepas tautan akun osu! dari akun Discord kamu',
    cmd_recent_desc: 'Tampilkan kartu skor terbaru (recent score) dari pemain osu!',
    cmd_recent_player: 'Nama pemain osu! (opsional jika sudah /link)',
    cmd_top_desc: 'Tampilkan daftar kartu skor terbaik (Top Plays) dari pemain osu!',
    cmd_top_player: 'Nama pemain osu! (opsional jika sudah /link)',
    cmd_top_count: 'Jumlah skor yang ditampilkan (1 - 10, default: 10)',
    cmd_beatmap_desc: 'Tampilkan kartu informasi beatmap osu! dengan visual modern',
    cmd_beatmap_input: 'Link osu! (cth: https://osu.ppy.sh/b/12345) atau Beatmap ID',
    cmd_beatmap_mods: 'Mods osu! yang ingin diterapkan (cth: DT, HR, HDDT, EZ)',
    cmd_showcase_desc: 'Tampilkan kartu beatmap khusus untuk showcase gameplay',
    cmd_showcase_link: 'Link beatmap osu! atau Beatmap ID',
    cmd_showcase_player: 'Nama player (opsional jika sudah menautkan akun dengan /link)',
    cmd_showcase_mods: 'Mods osu! yang ingin diterapkan (cth: DT, HR, HDDT, EZ)',
    cmd_scorecard_desc: 'Tampilkan kartu skor osu! dari link skor atau Score ID',
    cmd_scorecard_link: 'Link skor osu! (cth: https://osu.ppy.sh/scores/7265198407) atau Score ID',
    cmd_miniscorecard_desc: 'Tampilkan kartu mini skor osu! dengan visual modern dan compact',
    cmd_miniscorecard_player: 'Nama pemain osu! (opsional jika sudah /link)',
    cmd_miniscorecard_link: 'Link skor osu! (cth: https://osu.ppy.sh/scores/7265198407) atau Score ID',
    cmd_miniscorecard_top: 'Tampilkan ranking top play tertentu (1 - 100, cth: 1 untuk top play #1)',
    cmd_language_desc: 'Ubah preferensi bahasa bot (Inggris / Bahasa Indonesia)',
    cmd_language_option: 'Pilih bahasa',

    // Command replies
    link_success: '✅ Berhasil menautkan akun osu! **{username}**{rank} ke akun Discord kamu!\nSekarang kamu bisa langsung ketik `/recent`, `/top`, atau `/showcase` tanpa perlu mengisi nama pemain lagi.',
    link_error: '❌ Gagal menautkan akun: {message}',
    unlink_success: '✅ Tautan akun osu! kamu berhasil dihapus.',
    unlink_not_linked: 'ℹ️ Akun Discord kamu belum menautkan akun osu! mana pun.',

    recent_not_linked: '❌ Kamu belum menautkan akun osu!\nGunakan `/link username:<nama_osu>` terlebih dahulu, atau masukkan nama pemain dengan opsi `/recent player:<nama>`.',
    recent_no_scores: 'ℹ️ Tidak ada permainan / skor terbaru yang ditemukan untuk pemain **{username}** dalam 24 jam terakhir.',
    recent_error: '❌ Gagal mengambil score: {message}',

    top_not_linked: '❌ Kamu belum menautkan akun osu!\nGunakan `/link username:<nama_osu>` terlebih dahulu, atau masukkan nama pemain dengan opsi `/top player:<nama>`.',
    top_no_scores: 'ℹ️ Tidak ada top plays yang ditemukan untuk pemain **{username}**.',
    top_error: '❌ Gagal mengambil top scores: {message}',

    beatmap_invalid_input: '❌ Format input tidak valid! Masukkan URL beatmap osu! yang sah atau Beatmap ID angka.',
    beatmap_error: '❌ Gagal mengambil beatmap: {message}',

    scorecard_invalid_input: '❌ Format link atau Score ID tidak valid! Masukkan link skor osu! yang sah (cth: `https://osu.ppy.sh/scores/7265198407`) atau angka Score ID.',
    scorecard_error: '❌ Gagal mengambil data skor: {message}',

    // Language Command Embed
    lang_embed_title: '🌐 Pilih Bahasa / Select Language',
    lang_embed_desc: 'Pilih preferensi bahasa kamu untuk pesan bot, instruksi, dan kartu visual.\nSemua respon perintah dan kartu yang digenerate akan mengikuti preferensi kamu.\n\n*Bahasa saat ini:* **{currentLang}**',
    lang_btn_en: '🇬🇧 English (Default)',
    lang_btn_id: '🇮🇩 Bahasa Indonesia',
    lang_changed_en: '✅ Bahasa berhasil diubah ke **English**!',
    lang_changed_id: '✅ Bahasa berhasil diubah ke **Bahasa Indonesia**!',

    // Card texts
    tbl_rank: '#',
    tbl_grade: 'GRADE',
    tbl_beatmap: 'BEATMAP',
    tbl_mods: 'MODS',
    tbl_acc: 'AKURASI',
    tbl_combo: 'KOMBO',
    tbl_performance: 'PERFORMA',
    tbl_date: 'TANGGAL',
    top_header_title: '10 SKOR TERBAIK',

    // Relative time
    time_just_now: 'Baru saja',
    time_minutes_ago: '{mins} menit lalu',
    time_hours_ago: '{hours} jam lalu',
    time_days_ago: '{days} hari lalu',
    date_locale: 'id-ID'
  }
};

function t(lang = 'en', key, params = {}) {
  const chosenLang = (lang === 'id') ? 'id' : 'en';
  let text = translations[chosenLang]?.[key] || translations['en']?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}

module.exports = {
  translations,
  t
};
