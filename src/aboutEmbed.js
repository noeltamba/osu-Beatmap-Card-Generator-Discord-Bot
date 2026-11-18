const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { t } = require('./i18n');

const DEFAULT_CLIENT_ID = '1562307139274416178';
const GITHUB_REPO_URL = 'https://github.com/noeltamba/osu-Beatmap-Card-Generator-Discord-Bot';

/**
 * Build the rich About Embed with interactive link buttons
 * @param {string} lang - 'en' | 'id'
 * @param {string|null} botId - Discord Application/Client ID
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function createAboutMessage(lang = 'en', botId = null) {
  const targetId = botId || DEFAULT_CLIENT_ID;
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${targetId}&permissions=274878286912&integration_type=0&scope=applications.commands+bot`;
  const githubUrl = GITHUB_REPO_URL;

  const embed = new EmbedBuilder()
    .setColor('#f43f5e')
    .setTitle(t(lang, 'about_embed_title'))
    .setDescription(t(lang, 'about_embed_desc'))
    .setThumbnail('https://i.imgur.com/WujKXUK.jpeg')
    .addFields(
      {
        name: t(lang, 'about_field_features_title'),
        value: t(lang, 'about_field_features_desc'),
        inline: false
      },
      {
        name: t(lang, 'about_field_tech_title'),
        value: t(lang, 'about_field_tech_desc'),
        inline: true
      },
      {
        name: t(lang, 'about_field_authors_title'),
        value: t(lang, 'about_field_authors_desc'),
        inline: true
      },
      {
        name: t(lang, 'about_field_links_title'),
        value: t(lang, 'about_field_links_desc', { inviteUrl, githubUrl }),
        inline: false
      }
    )
    .setFooter({
      text: 'Columbina Bot • osu! Beatmap Card Generator • v1.4.1',
      iconURL: 'https://i.imgur.com/WujKXUK.jpeg'
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(t(lang, 'btn_invite_bot'))
      .setStyle(ButtonStyle.Link)
      .setURL(inviteUrl)
      .setEmoji('📨'),
    new ButtonBuilder()
      .setLabel(t(lang, 'btn_view_github'))
      .setStyle(ButtonStyle.Link)
      .setURL(githubUrl)
      .setEmoji('⭐'),
    new ButtonBuilder()
      .setLabel(t(lang, 'btn_osu_web'))
      .setStyle(ButtonStyle.Link)
      .setURL('https://osu.ppy.sh')
      .setEmoji('🌐')
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

module.exports = {
  createAboutMessage
};
