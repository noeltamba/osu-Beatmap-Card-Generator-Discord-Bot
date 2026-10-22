# 🔒 Privacy Policy

*Last Updated: October 2026*

This Privacy Policy explains how **osu! Beatmap Card Generator** ("the Bot", "we", "us") collects, uses, stores, and protects user data. We value your privacy and are committed to complying with Discord's Developer Terms of Service, the Discord Developer Policy, and standard data protection regulations (such as GDPR).

---

## 1. Information We Collect and Store

We believe in strict data minimization. The Bot only collects the minimum data required to deliver its core features:

### A. Persistent Data (Stored on Disk / Database)
When you choose to link your account using the `/link` command or set preferences, we store:
* **Discord User ID**: A unique numeric identifier provided by Discord (e.g. `790618301952032769`).
* **Linked osu! User ID & Username**: Your public osu! profile identifier and name (e.g. `20718114` / `X_Master5513`).
* **Timestamp**: Date and time when the link was created.
* **Language Preference**: Your selected language for bot responses (`en` or `id`).

### B. Ephemeral & In-Memory Data (Not Stored)
* **Discord Messages (Message Content)**: The Bot requires the `MessageContent` intent solely to scan chat messages in real time for osu! beatmap links (e.g. `https://osu.ppy.sh/b/...`) and score links (e.g. `https://osu.ppy.sh/scores/...`).
  * **No Message Storage**: Messages are processed instantaneously in memory. **We do not save, record, archive, or log the text of your chat messages to any database or file.**
* **Discord Guild & Channel IDs**: Used in-memory solely to route responses and generated cards back to the correct Discord channel.

### C. Cached Game Data (Non-Personal)
* **Beatmap Files (`.osu`)**: The Bot may temporarily download and cache `.osu` beatmap difficulty files from osu! servers into local storage. These files contain only game map patterns and timing points used by `rosu-pp-js` to calculate Star Rating, PP, and difficulty metrics. They contain zero personal user data.

---

## 2. Information We DO NOT Collect

The Bot does **NOT** collect or store:
* Passwords, login credentials, or authentication tokens.
* Real names, physical addresses, or phone numbers.
* Email addresses or personal contact information.
* Financial, billing, or payment information.
* Private Direct Messages (DMs) not directed as commands to the Bot.
* Audio, video, or webcam streams.

---

## 3. How We Use Your Information

The collected data is strictly utilized for the following functionality:
1. **Convenience & Quick Commands**: Allowing you to run `/recent`, `/top`, and `/showcase` without having to re-type your osu! username every time.
2. **Card Rendering**: Querying public game data from the osu! API v2 to generate graphic cards displaying your profile, accuracy, combo, mods, and performance stats.
3. **Localization**: Displaying bot responses and interface text in your preferred language (English or Indonesian).

---

## 4. Third-Party Services

The Bot interacts with the following trusted third-party APIs:
* **Discord Inc.** ([Discord Privacy Policy](https://discord.com/privacy)): For receiving commands and sending image cards via Discord's bot infrastructure.
* **ppy Pty Ltd / osu!** ([osu! Privacy Policy](https://osu.ppy.sh/legal/en/Privacy)): For retrieving public player profiles, scores, beatmap metadata, and CDN cover assets via the official osu! API v2.

We do **not** sell, rent, monetize, trade, or transfer your data to any third-party advertisers, analytical platforms, or data brokers.

---

## 5. Data Retention & Deletion (Your Rights / "Right to be Forgotten")

You retain complete ownership and control over your data:

* **Instant Self-Service Deletion**:
  You can permanently delete your linked account data at any time by simply typing the command:
  ```
  /unlink
  ```
  Running this command instantly and irrevocably purges your Discord ID, linked osu! profile, and associated settings from our storage file (`data/users.json`).
* **Manual Deletion Request**:
  You can also request manual removal of any associated data by opening an issue on GitHub or reaching out to the bot operator.

---

## 6. Data Security

We implement reasonable administrative and technical security measures to protect stored information against unauthorized access, alteration, or disclosure. Data files are hosted locally within the bot's secure environment with restricted access.

---

## 7. Children's Privacy

The Bot is not directed to children under the age of 13 (or under the digital age of consent in your jurisdiction). In accordance with Discord's Terms of Service, users under the required age are prohibited from using the platform and this Bot. We do not knowingly collect personal data from children under 13.

---

## 8. Updates to This Policy

We may periodically revise this Privacy Policy to reflect bot updates, API changes, or legal requirements. Any modifications will be indicated by the "Last Updated" date at the top. Continued use of the Bot following any update signifies your agreement to the revised policy.

---

## 9. Contact Us

If you have questions, feedback, or requests regarding this Privacy Policy or your data, please contact us:
* **GitHub**: [Open an Issue](https://github.com/noeltamba/osu-Beatmap-Card-Generator-Discord-Bot/issues)
* **Discord**: Reach out to the bot operator / administrator in your server.

---

<details>
<summary>🇮🇩 <b>Versi Bahasa Indonesia (Ringkasan Kebijakan Privasi)</b></summary>

### Kebijakan Privasi (Bahasa Indonesia)

1. **Data yang Disimpan**:
   - **ID Discord**: ID pengguna numerik Discord Anda (hanya jika Anda menggunakan `/link`).
   - **Profil osu! Terkait**: Username dan ID osu! publik Anda.
   - **Preferensi Bahasa**: Pilihan bahasa antarmuka bot (`en` atau `id`).
2. **Data Pesan Chat**: Bot membaca pesan secara real-time hanya untuk mendeteksi link osu! (`osu.ppy.sh/b/...` atau link skor) guna menghasilkan kartu grafis secara otomatis. **Pesan obrolan Anda TIDAK PERNAH disimpan, direkam, atau dimasukkan ke database.**
3. **Data yang TIDAK Dikumpulkan**: Kami tidak mengumpulkan nama asli, email, password, data pembayaran, maupun riwayat pesan pribadi.
4. **Penggunaan Data**: Data hanya digunakan untuk mempermudah eksekusi perintah (seperti `/recent` dan `/top`) serta menampilkan bahasa yang sesuai. Data **TIDAK PERNAH** dijual atau dibagikan ke pihak ketiga/pengiklan.
5. **Penghapusan Data (Hak Anda)**: Anda dapat menghapus data profil Anda kapan saja secara mandiri hanya dengan menjalankan perintah:
   ```
   /unlink
   ```
   Data tautan Anda akan langsung terhapus secara permanen dari sistem penyimpanan bot.

</details>
