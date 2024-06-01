const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");
const isUserMod = require("../../middleware/isUserMod");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile-mode-edit")
        .setDescription("Настроить отображение статистики модерации")
        .addSubcommand(subcommand =>
            subcommand
                .setName("настройки")
                .setDescription("Актуальные настройки")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("подсчет")
                .setDescription("Настроить подсчет баллов")
                .addNumberOption(option => option
                    .setName('kick')
                    .setDescription('Использование команды: /kick')
                    .setRequired(false)
                )
                .addNumberOption(option => option
                    .setName('mpmute')
                    .setDescription('Использование команды: /mpmute')
                    .setRequired(false)
                )
                .addNumberOption(option => option
                    .setName('ticketban')
                    .setDescription('Использование команды: /ticketban')
                    .setRequired(false)
                )
                .addNumberOption(option => option
                    .setName('ticket')
                    .setDescription('Закрытие тикетов')
                    .setRequired(false)
                )
                .addNumberOption(option => option
                    .setName('voteban')
                    .setDescription('Использование команды: /voteban')
                    .setRequired(false)
                )
                .addNumberOption(option => option
                    .setName('mute')
                    .setDescription('Использование команды: /mute')
                    .setRequired(false)
                )
                .addNumberOption(option => option
                    .setName('message')
                    .setDescription('Сообщение от модератора')
                    .setRequired(false)
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName("сообщения")
                .setDescription("Настроить подсчет сообщений в профиле модератора")
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("добавить_канал")
                        .setDescription("-")
                        .addChannelOption(option =>
                            option
                                .setName("канал")
                                .setDescription("-")
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("удалить_канал")
                        .setDescription("-")
                        .addStringOption(option =>
                            option
                                .setName("канал")
                                .setDescription("ID канала")
                                .setRequired(true))
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName("лимит_сообщений")
                        .setDescription("Настроить лимит сообщений, которые будут использоваться в подсчете баллов")
                        .addNumberOption(option =>
                            option
                                .setName("количество")
                                .setDescription("-")
                                .setRequired(true))
                )
        ),
    async execute(interaction) {
        const [exist, existServer] = await doesServerExist(interaction.guild.id);
        if (!exist) {
            return interaction.reply({ content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true });
        }
    
        const { options } = interaction;
    
        const subcommandGroup = options.getSubcommandGroup(false);
        const subcommand = options.getSubcommand();
    
        if (!subcommandGroup) {
            if (subcommand === "настройки") {
                const isMod = await isUserMod(interaction.guild.id, interaction.member);
                if (!isMod && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

                const { points, messages } = existServer.profileMode;

                const embed = currentSettings(points, messages, interaction.guild.name, interaction.guild.iconURL());

                return interaction.reply({ 
                    embeds: [embed],
                    ephemeral: false 
                });
            } else if (subcommand === "подсчет") {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return interaction.reply({ content: `\`[❌] У вас нет прав на выполнение этой команды.\``, ephemeral: true });
                }
                const server = await DiscordServers.findOne({ id: interaction.guild.id })
                if(!server) return;

                const optionsToFetch = ['kick', 'mpmute', 'ticketban', 'ticket', 'voteban', 'mute', 'message'];

                if (!server.profileMode.points) {
                    server.profileMode.points = {};
                }

                for (const optionName of optionsToFetch) {
                    const optionValue = options.getNumber(optionName);
                    if (optionValue !== null && optionValue !== undefined) {
                        server.profileMode.points[optionName] = optionValue;
                    }
                }
                
                await server.save();
                
                const { points, messages } = server.profileMode;
                
                const embed = currentSettings(points, messages, interaction.guild.name, interaction.guild.iconURL());
                
                return interaction.reply({
                    content: `\`[✅] Данные успешно изменены!\``,
                    embeds: [embed],
                    ephemeral: true 
                });
            }
        } else if (subcommandGroup === "сообщения") {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: `\`[❌] У вас нет прав на выполнение этой команды.\``, ephemeral: true });
            }

            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            if(!server) return;

            if (subcommand === "добавить_канал") {
                const channel = options.getChannel("канал");

                if (Object.values(server.profileMode.messages.channels).includes(channel.id)) return await interaction.reply({
                    content: `\`[❌] Данный канал уже существует в базе данных!\``,
                    ephemeral: true
                })

                server.profileMode.messages.channels.push(channel.id);

                await server.save()

                const { points, messages } = server.profileMode;
                
                const embed = currentSettings(points, messages, interaction.guild.name, interaction.guild.iconURL());
                
                return interaction.reply({
                    content: `\`[✅] Канал успешно добавлен!\``,
                    embeds: [embed],
                    ephemeral: true 
                });
            } else if (subcommand === "удалить_канал") {
                const channelId = options.getString("канал");

                const index = server.profileMode.messages.channels.indexOf(channelId);

                if (index === -1) return await interaction.reply({
                    content: `\`[❌] Данный канал отсутствует в базе данных!\``,
                    ephemeral: true
                })

                server.profileMode.messages.channels.splice(index, 1);

                await server.save()

                const { points, messages } = server.profileMode;
                
                const embed = currentSettings(points, messages, interaction.guild.name, interaction.guild.iconURL());
                
                return interaction.reply({
                    content: `\`[✅] Канал успешно удален!\``,
                    embeds: [embed],
                    ephemeral: true 
                });
            } else if (subcommand === "лимит_сообщений") {
                const limit = options.getNumber("количество");

                if (limit < 0 || limit > 10000000) return await interaction.reply({
                    content: `\`[❌] Количество не может быть меньше 0 или больше 10.000.000\``
                })

                server.profileMode.messages.limit = limit;

                await server.save()

                const { points, messages } = server.profileMode;
                
                const embed = currentSettings(points, messages, interaction.guild.name, interaction.guild.iconURL());
                
                return interaction.reply({
                    content: `\`[✅] Лимит успешно установлен на ${limit} сообщений!\``,
                    embeds: [embed],
                    ephemeral: true 
                });
            }
        }
    }        
}

function currentSettings(points, messages, guildName, guildIconUrl){
    const actionPoints = [
        "kick",
        "mute",
        "ticketban",
        "ticket",
        "mpmute",
        "voteban",
        "message",
    ]

    const fieldsAction = actionPoints.map(item => {
            return {
                name: `**${item}**`,
                value: `${points[item] || "0"}`,
                inline: true
            }
        }
    );

    if(messages.channels && Array.isArray(messages.channels) && messages.channels.length > 0){
        fieldsAction.push({
            name: `**Каналы:**`,
            value: `${messages.channels.map(item => `<#${item}> (\`${item}\`)`).join("\n")}`,
            inline: false
        })
    }

    if (messages.limit){
        fieldsAction.push({
            name: `**Лимит сообщений:**`,
            value: `${messages.limit}`,
            inline: false
        })
    }

    return new EmbedBuilder()
        .setTitle("🛠 | Профиль модерации - настройка")
        .addFields(fieldsAction)
        .setFooter({ text: guildName , iconURL: guildIconUrl });
}