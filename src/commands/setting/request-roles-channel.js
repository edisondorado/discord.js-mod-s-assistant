const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("request-roles-channel")
        .setDescription("Настроить канал с запросом ролей")
        .addStringOption(option =>
            option
                .setName("канал")
                .setDescription("ID Канала")
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const channelId = await interaction.options.getString("канал");
        const doesExistChannel = await interaction.guild.channels.cache.has(channelId)
        if(!doesExistChannel) return await interaction.reply({
            content: `\`[❌] Канал с данным ID не существует!\``, 
            ephemeral: true
        })

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        server.requestChannel = channelId
        await server.save()
            .then(async () => {
                await interaction.reply({
                    content: `\`[✅] Канал был успешно изменен!\``,
                    ephemeral: true
                })
            })
    }
}