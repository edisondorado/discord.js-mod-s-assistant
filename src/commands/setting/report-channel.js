const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("report-channel")
        .setDescription("Настроить канал для репортов")
        .addChannelOption(option =>
            option
                .setName("канал")
                .setDescription("-")
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const channel = await interaction.options.getChannel("канал");

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        server.reportChannel = channel.id
        await server.save()
            .then(async () => {
                await interaction.reply({
                    content: `\`[✅] Канал был успешно изменен!\``,
                    ephemeral: true
                })
            })
    }
}