const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("access-ticket")
        .setDescription("Настроить доступ к тикетам")
        .addStringOption(option => 
            option
                .setName("роль")
                .setDescription("ID Роли у которой будет доступ к ответам в тикетах")
                .setRequired(true)), 
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        if (!server) return await interaction.reply({
            content: "\`[❌] Сервер отсутствует в базе данных!\`",
            ephemeral: true
        })

        const newRole = interaction.options.getString("роль");

        const doesRoleExist = await interaction.guild.roles.cache.has(newRole)

        if(!doesRoleExist) return await interaction.reply({
            content: "\`[❌] Роль с данным ID не существует!\`",
            ephemeral: true
        })

        server.ticketRole = newRole;

        await server.save()

        await interaction.reply({
            content: `\`[✅] Доступ к тикетам успешно изменен!\`\n\`Роль:\` <@&${newRole}>`,
            ephemeral: true
        })
    }
}