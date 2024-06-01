const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../../models/model");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Запустить работу бота."),
    async execute(interaction){
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const server = await DiscordServers.findOne({ id: interaction.guild.id })

        if (server) return interaction.reply({content: `\`[❌] Данный сервер уже зарегистрирован в системе!\``, ephemeral: true})

        const embed = new EmbedBuilder()
            .setTitle("⚙ | Регистрация бота на сервере")
            .setColor(0xb58500)
            .setDescription(`## Вы согласны на активацию бота?\nПосле активации, сервер автоматически будет внесен в базу данных, весь функционал при этом заработает.\n### Будет создан канал для логирования действий модерации, а также роль "Модерация"\nПосле верификации бота, удалять канал/роль нельзя, в ином случае, их нужно будет заменить командой \`/change-mod\`, \`/change-log\`.\n### Баги сообщать напрямую разработчику: <@701440080111337513>`)
            .setTimestamp()
            .setFooter({ text: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

        const optionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("SettingsServer_acceptBot")
                    .setLabel("Добавить")
                    .setEmoji({ name: "✅" })
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("SettingsServer_declineBot")
                    .setLabel("Выгнать")
                    .setEmoji({ name: "⛔" })
                    .setStyle(ButtonStyle.Danger)
            )

        await interaction.reply({
            content: " ",
            embeds: [embed],
            components: [optionButtons],
            ephemeral: true
        })
    }
}