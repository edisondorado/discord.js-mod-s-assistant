const { SlashCommandBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

const logChannels = [
    {
        name: "🔧┃изменение-ролей",
        var: "logRole"
    },
    {
        name: "📝┃каналы",
        var: "logChannel"
    },
    {
        name: "📧┃сообщения",
        var: "logMessage"
    },
    {
        name: "🔊┃голосовые-каналы",
        var: "logVoice"
    },
    {
        name: "🤦┃участники",
        var: "logUsers"
    },
]

module.exports = {
    data: new SlashCommandBuilder()
        .setName("log-channels")
        .setDescription("Создать каналы логирования"),
    async execute(interaction){
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const server = await DiscordServers.findOne({ id: interaction.guild.id })

        logChannels.forEach(async item => {
            const channel = await interaction.guild.channels.create({
                name: item.name,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    }
                ],
            })

            server[item.var] = channel.id;
            await server.save()
        })

        await interaction.reply({
            content: "`[✅] Каналы успешно созданы!`",
            ephemeral: true
        })
    }
}