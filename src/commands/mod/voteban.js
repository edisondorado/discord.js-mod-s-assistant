const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { DiscordServersVoteBan } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const showError = require("../../dev/showError");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voteban")
        .setDescription("Провести голосование за блокировку пользователя")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которого необходимо забанить")
                .setRequired(true))
        .addNumberOption(option =>
            option
                .setName("дни")
                .setDescription("Время бана")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("Причина бана")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("доказательства")
                .setDescription("-")
                .setRequired(false)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["voteban"]);
        if (!isMod) return;
        
        var target;
        var onServer = false;
        if (interaction.options.getMember("пользователь") !== null) {
            target = interaction.options.getMember("пользователь");
            onServer = true;
        }
        else target = interaction.options.getUser("пользователь");

        const time = interaction.options.getNumber("дни");
        const reason = interaction.options.getString("причина");
        const evidence = interaction.options.getString("доказательства");
        
        const alreadyExist = await DiscordServersVoteBan.findOne({ guildId: interaction.guild.id, userId: target.id })
        if (alreadyExist && alreadyExist.activeUntil > new Date().getTime()) return await interaction.reply({
            content: "\`[❌] На данного пользователя уже был создано активное голосование!\`",
            ephemeral: true
        })

        const maxDuration = 666;
        const voteDuration = new Date().getTime() + 6 * 60 * 60 * 1000;
        if (onServer){    
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
        }

        if (time > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 120 дней или меньше!\`",
                ephemeral: true
            })
        }

        try{
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`acceptVoteBan_${target.id}`)
                        .setEmoji({name: "✅"})
                        .setLabel("Одобрить")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`declineVoteBan_${target.id}`)
                        .setEmoji({name: "⛔"})
                        .setLabel("Отказать")
                        .setStyle(ButtonStyle.Danger)
                )

            const embed = {
                color: 0x0099ff,
                title: `**🔨 | Голосование за блокировку пользователя**`,
                description: `**Пользователь:** <@${target.id}>\n**Причина:** ${reason}\n**Время:** ${time} дней\n**Доказательства:** ${evidence ? evidence : "\`Не предоставлены\`"}\n\n**Голосование закончится <t:${Math.floor(voteDuration/1000)}:R>**`,
                thumbnail: {
                    url: target.displayAvatarURL(),
                },
                fields: [
                    {
                        name: 'Одобрили:',
                        value: `<@${interaction.member.id}>`,
                        inline: true
                    },
                    {
                        name: 'Отказали:',
                        value: ' ',
                        inline: true,
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: interaction.guild.name,
                    icon_url: interaction.guild.iconURL(),
                },
            };

            const message = await interaction.channel.send({
                content: `<@&${server.modRole}>`,
                embeds: [embed],
                components: [buttons]
            })

            await DiscordServersVoteBan.create({
                guildId: interaction.guild.id,
                allowedToVote: server.modRole,
                activeUntil: voteDuration,
                userId: target.id,
                time: time,
                messageId: message.id,
                channelId: interaction.channel.id,
                reason: reason,
                expiresOn: new Date().getTime() + (time * 24 * 60 * 60 * 1000) + (6 * 60 * 60 * 1000),
                voted: [
                    {
                        userId: interaction.member.id,
                        vote: true
                    }
                ]
            })
                .then(async () => {
                    await interaction.reply({
                        content: "`[✅] Голосование успешно запущено!`",
                        ephemeral: true
                    })
                })
            
        } catch(error){
            console.warn("[ERROR] Error occured while ban: ", error)
            await showError(error, "Произошла ошибка при бане!", interaction)
        }
    }
}