const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("change-log")
        .setDescription("Сменить канал лога действий модерации")
        .addStringOption(option => 
            option
                .setName("канал")
                .setDescription("ID Канала")
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const server = await DiscordServers.findOne({ id: interaction.guild.id })

        const tempNewChannel = interaction.options.getString("канал");

        const newChannel = interaction.guild.channels.cache.get(tempNewChannel)

        if (!newChannel) return await interaction.reply({
            content: "\`[❌] Канал с данным ID не найдена! Возможно вы забыли создать канал, либо же был введен неправильный ID.\`",
            ephemeral: true
        })

        if(!server) return await interaction.reply({
            content: "\`[❌] Произошла ошибка во время поиска сервера в базе данных!\`",
            ephemeral: true
        })

        server.logMod = newChannel.id;

        await server.save();

        await interaction.reply({
            content: `\`[✅] Канал лога действий модерации был успешно заменена на \`<#${newChannel.id}>`,
            ephemeral: true
        })
    }
}