const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-channel")
        .setDescription("Изменить канал с логированием тикетов")
        .addStringOption(option => 
            option
                .setName("канал")
                .setDescription("ID Канала")
                .setRequired(true)), 
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        if (!server) return await interaction.reply({
            content: "\`[❌] Сервер отсутствует в базе данных!\`",
            ephemeral: true
        })

        const newChannel = interaction.options.getString("канал");

        const doesChannelExist = await interaction.guild.channels.cache.has(newChannel)

        if(!doesChannelExist) return await interaction.reply({
            content: "\`[❌] Канал с данным ID не существует!\`",
            ephemeral: true
        })

        server.ticketLogChannel = newChannel;

        await server.save()

        await interaction.reply({
            content: `\`[✅] Канал с логом тикетов успешно изменен!\`\n\`Канал:\` <#${newChannel}>`,
            ephemeral: true
        })
    }
}