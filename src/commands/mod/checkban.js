const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const { DiscordServersBans } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");
const isUserMod = require("../../middleware/isUserMod");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("checkban")
        .setDescription("Проверить пользователя на активную блокировку(забаненные через бота)")
        .addStringOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["checkban"]);
        if (!isMod) return;

        const target = interaction.options.getString("пользователь");

        const user = await DiscordServersBans.findOne({ id: target })
        if (!user) return interaction.reply({
            content: "\`[❌] Пользователь с данным ID не найден в списке заблокированных!\`",
            ephemeral: true
        })

        const embed = new EmbedBuilder()
            .setTitle("🔨 | Активная блокировка")
            .setDescription(`**Discord ID:** ${user.id}\n**Выдал:** <@${user.mod}>\n**Причина:** ${user.reason}\n**Истекает:** <t:${Math.floor(user.expiresOn / 1000)}>`)
            .setTimestamp()
            .setFooter({ text: interaction.member.user.username, iconURL: interaction.member.displayAvatarURL() })

        await interaction.reply({
            content: "",
            embeds: [embed],
            ephemeral: true
        })
    }
}