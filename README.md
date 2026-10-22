# 🎮 osu! Beatmap Card Generator - Discord Bot

Bot Discord modern yang otomatis menghasilkan kartu informasi grafis bergaya visual osu! yang keren saat ada link osu! dikirim di obrolan atau melalui slash command `/beatmap`.

---

## 📸 Contoh Tampilan Kartu

Kartu grafis menampilkan:
* **Background & Cover Art Resmi** dari osu! CDN
* **Judul & Artis Lagu** + Mapper
* **Status Map** (*Ranked, Loved, Qualified, Graveyard, dll.*)
* **Star Rating (SR)** dengan badge warna dinamis sesuai spectrum resmi osu!
* **Difficulty Attributes**: **CS** (Circle Size), **AR** (Approach Rate), **OD** (Overall Difficulty), **HP** (Drain) lengkap dengan progress bar
* **Statistik Tambahan**: BPM, Total & Drain Length, Max Combo, Plays/Passes, dan Favorites (♥)

---

## ⚙️ Tempat Mengisi Kunci Rahasia (.env)

Buka file [`.env`](.env) di root folder proyek ini:

```env
# osu! API Credentials
OSU_CLIENT_ID=your_osu_client_id_here
OSU_CLIENT_SECRET=your_osu_client_secret_here

# Discord Bot Token
DISCORD_TOKEN=your_discord_bot_token_here
```

> ⚠️ **PENTING**: Jangan pernah membagikan file `.env` atau token Anda ke publik. File `.env` sudah masuk ke `.gitignore`.

---

## 🤖 Langkah Membuat Discord Bot & Mengambil Token

Jika Anda belum memiliki Discord Bot Token:

1. Buka [Discord Developer Portal](https://discord.com/developers/applications).
2. Klik tombol **"New Application"** di pojok kanan atas, beri nama (misal: `osu! Card Bot`), lalu klik **Create**.
3. Di menu sebelah kiri, pilih **"Bot"**:
   - Klik **"Reset Token"** lalu salin (**Copy**) token tersebut.
   - Paste token ke file [`.env`](.env) pada variabel `DISCORD_TOKEN`.
   - Scroll ke bawah ke bagian **"Privileged Gateway Intents"**:
     - ✅ Aktifkan **"Message Content Intent"** (agar bot bisa mendeteksi link osu! di chat).
     - Klik **"Save Changes"**.
4. Mengundang bot ke Server Discord Anda:
   - Di menu sebelah kiri, pilih **"OAuth2"** > **"URL Generator"**.
   - Di bagian **Scopes**, centang:
     - `bot`
     - `applications.commands`
   - Di bagian **Bot Permissions**, centang:
     - `Send Messages`
     - `Send Messages in Threads`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
   - Salin link di bagian bawah (**Generated URL**) dan buka di browser untuk mengundang bot ke server Discord Anda.

---

## 🚀 Cara Menjalankan Bot

Pastikan dependensi sudah terpasang, lalu jalankan:

```bash
npm start
```
*(atau `node src/index.js`)*

Jika Anda ingin melihat contoh hasil generate gambar kartu tanpa perlu menyalakan bot:
```bash
node test-card.js
```
Hasil gambar kartu akan disimpan sebagai `test_output.png`.

---

## 💬 Cara Penggunaan di Discord

1. **Tautkan Akun (`/link`) & Lepas Akun (`/unlink`)**:
   Tautkan akun Discord Anda ke akun osu! sekali saja agar tidak perlu mengetik nama lagi:
   ```
   /link username:Hyzity
   ```
   Untuk melepas tautan akun:
   ```
   /unlink
   ```

2. **Kartu Skor Terbaru (`/recent`)** *(Baru!)*:
   Menampilkan kartu grafis skor / permainan terbaru pemain:
   ```
   /recent
   ```
   *(Otomatis mengambil skor akun Anda jika sudah `/link`)*, atau mengecek pemain lain:
   ```
   /recent player:mrekk
   ```

3. **Command Khusus Showcase (`/showcase`)**:
   Menghasilkan kartu showcase gameplay dengan nama pemain & mahkota emas:
   ```
   /showcase link:https://osu.ppy.sh/beatmapsets/2624187#osu/5894468
   ```
   *(Nama pemain otomatis terisi dari akun linked Anda jika parameter `player` tidak diisi)*

4. **Kartu Skor Tertentu (`/scorecard`)** *(Baru!)*:
   Menampilkan kartu grafis skor dari link skor atau Score ID:
   ```
   /scorecard link:https://osu.ppy.sh/scores/7265198407
   ```
   atau dengan angka Score ID saja:
   ```
   /scorecard link:7265198407
   ```

5. **Command Standar Beatmap (`/beatmap`)**:
   Menampilkan informasi beatmap lengkap termasuk Plays & Favorites:
   ```
   /beatmap input:129891
   ```

6. **Auto Detect Link (Otomatis di Chat)**:
   * **Link Skor**: Kirim link seperti `https://osu.ppy.sh/scores/7265198407` di chat, bot akan otomatis membalas dengan **Score Card**!
   * **Link Beatmap**: Kirim link seperti `https://osu.ppy.sh/beatmapsets/742961#osu/1816113`, bot otomatis membalas dengan **Beatmap Card**!

---

## 📜 Ketentuan & Kebijakan (Legal & Privacy)

Untuk keperluan verifikasi bot di Discord Developer Portal atau kepatuhan privasi (GDPR):
* [Terms of Service](TERMS_OF_SERVICE.md)
* [Privacy Policy](PRIVACY_POLICY.md)

