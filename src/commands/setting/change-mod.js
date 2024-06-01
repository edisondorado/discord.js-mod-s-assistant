const ini = require("../../config/bot.json");
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("change-mod")
        .setDescription("Сменить роль модерации")
        .addStringOption(option => 
            option
                .setName("роль")
                .setDescription("ID Роли")
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const server = await DiscordServers.findOne({ id: interaction.guild.id })

        const tempNewRole = interaction.options.getString("роль");

        const newRole = interaction.guild.roles.cache.get(tempNewRole);

        if (!newRole) return await interaction.reply({
            content: "\`[❌] Роль с данным ID не найдена! Возможно вы забыли создать ее, либо же был введен неправильный ID.\`",
            ephemeral: true
        })

        if (newRole === newRole.id) return await interaction.reply({
            content: "\`[❌] Вы указали активную роль модерации!\`"
        })

        if(!server) return await interaction.reply({
            content: "\`[❌] Произошла ошибка во время поиска сервера в базе данных!\`",
            ephemeral: true
        })

        server.modRole = newRole.id;
        ini.commands.forEach(item => {
            server[item] = newRole.id;
        })

        await server.save();

        await interaction.reply({
            content: `\`[✅] Роль модерации была успешно заменена на \`<@&${newRole.id}>\n\`Все команды были автоматически изменены на данную роль.\``,
            ephemeral: true
        })
    }
}