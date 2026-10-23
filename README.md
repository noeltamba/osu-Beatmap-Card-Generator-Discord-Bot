<div align="center">
<h1> Columbina Bot </h1>
  <img src="https://i.imgur.com/WujKXUK.jpeg" alt="Banner" width="100%" />
 
  <br>

  [![Invite Discord Bot](https://img.shields.io/badge/Invite_Bot-Click_Here-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1562307139274416178&permissions=274878286912&integration_type=0&scope=applications.commands+bot)

</div>
# 🎮 osu! Beatmap Card Generator - Release v1.1.1

A major update introducing **Quick Prefix Commands (`;`)** and the brand-new **Mini Score Card** (`/miniscorecard`), delivering ultra-fast chat commands and a compact stream-overlay-inspired visual score widget with zero dead space.

---

### ✨ What's New in v1.1.1?

* **⚡ Quick Prefix Commands (`;`)**:
  * Execute commands instantly directly in chat without opening slash command popups:
  * `;m` / `;mini` $\rightarrow$ Compact mini score card (supports player, score link, or top play number like `;m Utami 1`).
  * `;r` / `;recent` $\rightarrow$ Comprehensive recent score card.
  * `;t` / `;top` $\rightarrow$ Top performance plays leaderboard (e.g. `;t 5`).
  * `;b` / `;map` $\rightarrow$ Beatmap info card with mod calculation (e.g. `;b 129891 +HDDT`).
  * `;s` / `;score` $\rightarrow$ Specific score card from URL or ID.
  * `;link` & `;unlink` $\rightarrow$ Quick profile linking directly from chat.
  * `;help` $\rightarrow$ Interactive prefix commands help menu.
* **🎴 New Mini Score Card (`/miniscorecard` & `;m`)**:
  * **Compact 640×360 px Form Factor**: Designed as a sleek, tight 16:9 widget card ideal for thumbnails, stream overlays, and Discord sharing.
  * **Top Banner Header**: Displays beatmap background art with smooth gradient transitions, combo status badge (*"FC"*, *"1x MISS"*, *"PASS"*, *"FAIL"*), modded Star Rating capsule (`▲ SR`), and prominent bold PP value (with `if FC: ~...` calculation when choked).
  * **Floating Separator Capsules**: Three frosted-glass pills bridging the banner and dashboard for Max Combo, Difficulty Name, and modded BPM.
  * **Perfect Center-Axis Layout**: Beatmap title, artist subtitle, player avatar, and footer are locked to the exact horizontal center line for maximum visual balance.
  * **Physical Pin-Style Country Flag Badge**: Player avatars now feature an official country flag pinned to the bottom-center.
  * **Glowing Neon Grade**: Prominent holographic glowing rank grade (*SS, S, A, B, etc.*) positioned cleanly on the left.
  * **Flexible Querying**: Use `/miniscorecard` or `;m` for your recent play, look up any player (`player:`), query a specific score by URL/ID (`link:`), or showcase a specific personal best ranking (`top:1` to `top:100`).

---

### 📋 Full Slash Commands List

| Command | Arguments | Description |
| :--- | :--- | :--- |
| **`/miniscorecard`** *(New!)* | `[player]`, `[link]`, `[top]` | Displays a compact, aesthetic mini score card widget with combo badge, star rating, PP, avatar with flag, and mod chips. |
| **`/recent`** | `[player]` | Displays a comprehensive visual score card with full hit judgments (300/100/50/miss), PP breakdown, and modded map stats. |
| **`/scorecard`** | `link` | Displays a full detailed score card from an osu! score URL or numeric Score ID. |
| **`/top`** | `[player]`, `[count]` | Displays a leaderboard card of a player's top performance plays (1 to 10 plays). |
| **`/beatmap`** | `input`, `[mods]` | Displays an osu! beatmap information card with mod-calculated attributes (*DT, HR, HD, EZ, etc.*). |
| **`/showcase`** | `link`, `[player]`, `[mods]` | Displays a dedicated beatmap showcase card for gameplay showcases with a golden crown badge. |
| **`/link`** | `username` | Links your Discord account to your osu! profile for seamless usage without typing your username. |
| **`/unlink`** | - | Unlinks your osu! account from your Discord profile. |
| **`/language`** | `[set]` | Configures your preferred bot language (🇬🇧 English / 🇮🇩 Bahasa Indonesia). |

---

### ⚡ Quick Prefix Commands (`;`)
You can also use the lightning-fast `;` prefix directly in chat without opening slash menus:

| Prefix Command | Aliases | Description | Example Usage |
| :--- | :--- | :--- | :--- |
| `;miniscorecard` | `;m`, `;mini` | Compact mini score card | `;m` • `;m Utami` • `;m 1` • `;m Utami 1` |
| `;recent` | `;r`, `;rs` | Detailed full score card | `;r` • `;r Utami` |
| `;top` | `;t`, `;best` | Top performance plays card | `;t` • `;t 5` • `;t Utami 5` |
| `;scorecard` | `;s`, `;score` | Score card from score URL or ID | `;s 7265198407` |
| `;beatmap` | `;b`, `;map` | Beatmap info card with mods | `;b 129891 +HDDT` |
| `;link` | - | Link Discord account to osu! user | `;link Utami` |
| `;unlink` | - | Unlink osu! account | `;unlink` |
| `;help` | `;h` | Display prefix commands help embed | `;help` |

---

### 💬 Auto-Detect Chat Links
* **Score Links** (e.g. `https://osu.ppy.sh/scores/7265198407`) $\rightarrow$ Automatically replies with a **Score Card**.
* **Beatmap Links** (e.g. `https://osu.ppy.sh/b/129891` or `https://osu.ppy.sh/beatmapsets/...`) $\rightarrow$ Automatically replies with a **Beatmap Card**.

<div align="center">
  <br>
<h3> by <a href="https://github.com/hyzity">@hyzity</a> / <a href="https://github.com/noeltamba">@noeltamba</a></h3>
<h4> wanna collab? <a href="https://discord.com/users/790618301952032769">Contact me on Discord!</a></h4>
 <br>
  <sub>Banner artwork credit: <a href="https://www.pixiv.net/artworks/138613692">Pixiv Artwork</a></sub>

</div>
