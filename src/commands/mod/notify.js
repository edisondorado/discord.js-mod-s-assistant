const ms = require("ms");
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("notify")
        .setDescription("Создать уведомление для пользователя")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("время")
                .setDescription("Время актуальности уведомления. Пример: 5s, 10m, 3h")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("нарушение")
                .setDescription("Описания нарушения. Пример: неадекватный никнейм/18+ аватар")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return await interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["notify"]);
        if (!isMod) return;

        const doesExistChannel = await interaction.guild.channels.cache.has(server.notifyChannel);
        if(!doesExistChannel) return await interaction.reply({content: `\`[❌] Отсутствует канал для уведомлений. Используйте: /notify-channel\``, ephemeral: true})
       
        const target = await interaction.options.getMember("пользователь");
        const time = await interaction.options.getString("время");
        const violation = await interaction.options.getString("нарушение");

        const formattedDuration = ms(time);
        const maxDuration = ms("7 days");

        if (target.permissions.has(PermissionsBitField.All)) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
            ephemeral: true
        })
        
        if (interaction.member.id === target.id){
            return interaction.reply({
                content: "\`[❌] Вы не можете использовать это на себе!\`",
                ephemeral: true
            })
        }

        if (interaction.member.id === interaction.client.id){
            return interaction.reply({
                content: "\`[❌] Вы не можете использовать это на мне!\`",
                ephemeral: true
            })
        }

        var hasProhibitedRole = false;
        for (const roleId of server.ignoreRoles) {
            const role = target.guild.roles.cache.find(r => r.id === roleId);
            if (role && target.roles.cache.has(role.id)) {
                hasProhibitedRole = true;
                break;
            }
        }
            
        if (hasProhibitedRole) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
            ephemeral: true
        });

        if (formattedDuration > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 7 дней или меньше!\`",
                ephemeral: true
            })
        }

        const channel = await interaction.guild.channels.cache.get(server.notifyChannel);

        const embed = new EmbedBuilder()
            .setTitle(`**Новое уведомление от модерации:**`)
            .setDescription(`**Уведомление от <@${interaction.member.id}>:**\n\n\`\`\`\n${violation}\n\`\`\`\n\n**Оповещение истекает <t:${Math.floor((new Date().getTime() + formattedDuration) / 1000)}:R>.**`)
            .setColor(0xa84032)
            .setTimestamp()
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })

        const button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`deleteNotify_${target.id}_${interaction.member.id}`)
                    .setEmoji({name: "⚖"})
                    .setLabel("Отозвать оповещение")
                    .setStyle(ButtonStyle.Danger)
            )

        const message = await channel.send({
            content: `<@${target.id}>`,
            embeds: [embed],
            components: [button],
            ephemeral: false
        })

        await interaction.reply({
            content: `\`[✅] Уведомление было успешно создано!\` https://discord.com/channels/${interaction.guild.id}/${channel.id}/${message.id}`,
            ephemeral: true
        })
    }
}