const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");
const { DiscordServersUsers } = require("../../models/model");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("action")
        .setDescription("Открыть окно взаимодействия с пользователем")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["action"]);
        if (!isMod) return;

        
        var target; 
        if (interaction.options.getMember("пользователь") !== null) target = interaction.options.getMember("пользователь")
        else target = interaction.options.getUser("пользователь")
        
        const roles = target.guild ? target.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.id) : []

        const user = await DiscordServersUsers.findOne({ id: target.id, server: interaction.guild.id })
        if (target.guild){
            var createdAtUnix = Math.floor(target.user.createdAt.getTime() / 1000);
            var joinedAtUnix = Math.floor(target.joinedAt.getTime() / 1000);

            var hasMute = target.isCommunicationDisabled();
        }


        const embedInfo = new EmbedBuilder()
            .setDescription(`**Discord ID:** ${target.id}\n**Роли:** ${roles.map(item => `<@&${item}>`)}\n**Создан аккаунт:** ${createdAtUnix ? `<t:${createdAtUnix}:D>` : "-"}\n**Подключен к серверу:** ${joinedAtUnix ? `<t:${joinedAtUnix}:D>` : "-"}\n**Нарушений:** ${user ? user.infractions.length : "0"}`)
            .setColor("Random")
            .setTimestamp()
            .setAuthor({ name: target.user ? target.user.username : interaction.client.user.username, iconURL: target.user ? target.displayAvatarURL() : interaction.client.user.displayAvatarURL() })

        if (target.guild){
            var isTargetMod = await target.roles.cache.has(server.modRole)
    
            var buttons1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`Action_kick_${target.id}`)
                        .setEmoji({ name: "🥾" })
                        .setLabel("Кикнуть")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`Action_mute_${target.id}`)
                        .setEmoji({ name: "🔈" })
                        .setLabel("Выдать мут")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(hasMute ? true : false),
                    new ButtonBuilder()
                        .setCustomId(`Action_unmute_${target.id}`)
                        .setEmoji({ name: "🔊" })
                        .setLabel("Снять мут")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(hasMute ? false : true),
                    new ButtonBuilder()
                        .setCustomId(`Action_ban_${target.id}`)
                        .setEmoji({ name: "🔨" })
                        .setLabel("Забанить")
                        .setStyle(ButtonStyle.Danger),
                )
    
        }
    
        var buttons2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`Action_reload_${target.id}`)
                    .setEmoji({ name: "🔄" })
                    .setLabel("Обновить")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`Action_avatar_${target.id}`)
                    .setEmoji({ name: "🖼" })
                    .setLabel("Аватар")
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`Action_mod_${target.id}`)
                    .setEmoji({ name: "📕" })
                    .setLabel("Действия модерации")
                    .setStyle(ButtonStyle.Secondary),
            )

        await interaction.reply({
            content: "",
            embeds: [embedInfo],
            components: target.guild ? (isTargetMod ? [buttons2] : [buttons1, buttons2]) : [buttons2]
        })
    }
}