const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("role-mpmute")
        .setDescription("Настройка для мута через роль")
        .addStringOption(option =>
            option
                .setName("роль")
                .setDescription("ID Роли")
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const roleId = await interaction.options.getString("роль");
        const doesExistRole = await interaction.guild.roles.cache.has(roleId)
        if(!doesExistRole) return await interaction.reply({
            content: `\`[❌] Роль с данным ID не существует!\``, 
            ephemeral: true
        })

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        server.mpmuterole = roleId
        await server.save()
            .then(async () => {
                await interaction.reply({
                    content: `\`[✅] Роль была успешно изменен!\``,
                    ephemeral: true
                })
            })
    }
}