const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const doesServerExist = require("../../middleware/doesServerExist");
const { DiscordServers } = require("../../models/model");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("access-commands")
        .setDescription("Изменить доступ к командам. Если не указывать роль - будет отображен нынешний доступ.")
        .addStringOption(option => 
            option
                .setName("команда")
                .setDescription("-")
                .setRequired(true)
                .addChoices(
                    { name: "/ban", value: "ban" },
                    { name: "/unban", value: "unban" },
                    { name: "/checkban", value: "checkban" },
                    { name: "/checkrole", value: "checkrole" },
                    { name: "/embed", value: "embed" },
                    { name: "/kick", value: "kick" },
                    { name: "/mclear", value: "mclear" },
                    { name: "/mpmute", value: "mpmute" },
                    { name: "/unmpmute", value: "unmpmute" },
                    { name: "/mute", value: "mute" },
                    { name: "/unmute", value: "unmute" },
                    { name: "/notify", value: "notify" },
                    { name: "/profile-mode", value: "profile_mode" },
                    { name: "/revokelog", value: "revokelog" },
                    { name: "/voteban", value: "voteban" },
                    { name: "/ticketban", value: "ticketban" },
                    { name: "/unticketban", value: "unticketban" },
                ))
        .addStringOption(option =>
            option
                .setName("роль")
                .setDescription("-")
                .setRequired(false)),
    async execute(interaction) {
        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        if(!server) return await interaction.reply({
            content: "\`[❌] Произошла ошибка во время поиска сервера в базе данных!\`",
            ephemeral: true
        })

        const command = interaction.options.getString("команда");
        const tempNewRole = interaction.options.getString("роль")
        
        if(tempNewRole){
            if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

            const newRole = interaction.guild.roles.cache.get(tempNewRole);
            if (!newRole) return interaction.reply({
                content: "\`[❌] Роль с данным ID не найдена! Возможно вы забыли создать ее, либо же был введен неправильный ID.\`",
                ephemeral: true
            })

            server[command] = newRole.id;

            await server.save()

            const embed = new EmbedBuilder()
                .setTitle("Настройка доступа | Редактирование")
                .setDescription(`Команда: /${command}\nДоступ: <@&${server[command]}>`)
                .setColor(0x00ff00)
                .setFooter({text: interaction.member.user.displayName, iconURL: interaction.member.user.displayAvatarURL()})
                .setTimestamp()

            await interaction.reply({
                content: "",
                embeds: [embed],
                ephemeral: true
            })
        } else {

            const embed = new EmbedBuilder()
                .setTitle("Настройка доступа | Просмотр")
                .setDescription(`Команда: /${command}\nДоступ: <@&${server[command]}>`)
                .setColor(0x00ff00)
                .setFooter({text: interaction.member.user.displayName, iconURL: interaction.member.user.displayAvatarURL()})
                .setTimestamp()

            await interaction.reply({
                content: "",
                embeds: [embed],
                ephemeral: true
            })
        }
    }
}