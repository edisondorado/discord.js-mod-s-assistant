const { SlashCommandBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const { DiscordServersMods } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fa")
        .setDescription("Взаимодействие с окном быстрых ответов")
        .addSubcommand(subcommand =>
            subcommand
                .setName("вызвать")
                .setDescription("Вызвать окно быстрых ответов"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("создать")
                .setDescription("Создать кнопку"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("удалить")
                .setDescription("Удалить кнопку")
                .addStringOption(option =>
                    option
                        .setName("название")
                        .setDescription("название кнопки")
                        .setRequired(true)))
        ,
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member);
        if (!isMod) return;

        const moderator = await DiscordServersMods.findOne({ id: interaction.member.id, server: interaction.guild.id })

        if (interaction.options.getSubcommand() === "вызвать"){
            if (moderator.fastaction.length > 0) {
                const embed = {
                    title: `**🛠 | Быстрые ответы**`,
                    description: "Выберите любой быстрый ответ из кнопок ниже",
                    color: 0x32a8a0
                }
    
                const buttons = new ActionRowBuilder()
                    .addComponents(
                        moderator.fastaction.map(item => (
                            new ButtonBuilder()
                                .setLabel(item.name)
                                .setCustomId(item.name)
                                .setStyle(ButtonStyle.Success)
                        ))
                    )
    
                await interaction.reply({
                    content: "",
                    embeds: [embed],
                    components: [buttons],
                    ephemeral: true
                })
            } else {
                await interaction.reply({
                    content: `\`[❌] У вас отсутствует настройка быстрых ответов. Воспользуйтесь командой: /fa создать\``,
                    ephemeral: true
                })
            }


            const filter = i => i.user.id === interaction.user.id;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async i => {
                try {
                    const index = moderator.fastaction.findIndex(field => field.name === i.customId)
                    if (index !== -1){
                        if (moderator.fastaction[index].embed){
                            const embedButton = {
                                author: {
                                    name: `${interaction.member.nickname !== null ? interaction.member.nickname : interaction.member.user.username}`,
                                    icon_url: interaction.user.displayAvatarURL(),
                                },
                                description: moderator.fastaction[index].content,
                                color: 0x32a8a0
                            }

                            await interaction.channel.send({
                                content: "",
                                embeds: [embedButton]
                            })
                        } else {
                            await interaction.channel.send({
                                content: `${moderator.fastaction[index].content}\n\n\`[Сообщение от модератора]:\` <@${interaction.member.id}>`
                            })
                        }
                        await i.reply({content: "`[✅] Ответ был успешно отправлен.`", ephemeral: true})
                    }
                } catch (error) {
                    console.error(error);
                }
            }); 
        } else if (interaction.options.getSubcommand() === "создать"){
            await interaction.deferReply({ ephemeral: false });

            var sentMessage = await interaction.channel.send(`**Введите название поля(60 секунд)**`);
            const collectorName = interaction.channel.createMessageCollector({ time: 60_000 });

            var newField = {}

            collectorName.on('collect', async m => {
                newField.name = m.content;
                await m.delete(1);
                await sentMessage.delete(1);
                collectorName.stop();
            });

            collectorName.on('end', async collected => {
                var sentValueMessage = await interaction.channel.send(`**Введите контент для поля "${newField.name}"(60 секунд)**`);
                const collectorValue = interaction.channel.createMessageCollector({ time: 60_000 });

                collectorValue.on('collect', async m => {
                    newField.content = m.content;
                    await m.delete(1);
                    await sentValueMessage.delete(1);

                    collectorValue.stop();
                });

                collectorValue.on('end', async collected => {
                    var sentInlineMessage = await interaction.channel.send(`**Отправлять это сообщение в Embed окне? Ответьте "Да" или "Нет".(60 секунд)**`);
                    const collectorInline = interaction.channel.createMessageCollector({ time: 60_000 });

                    collectorInline.on('collect', async m => {
                        const response = m.content.toLowerCase();
                        if (response === 'да') {
                            newField.embed = true;
                        } else if (response === 'нет') {
                            newField.embed = false;
                        } else {
                            await m.delete(1);
                            await m.channel.send("**Пожалуйста, ответьте 'Да' или 'Нет'.**");
                            return;
                        }
                        await m.delete(1)
                        await sentInlineMessage.delete(1);

                        if (!newField.name || !newField.content) return interaction.channel.send("**Одно из значений не было предоставлено.**");

                        const index = moderator.fastaction.findIndex(field => field.name === newField.name)
                        if (index !== -1) return await interaction.reply({
                            content: `\`[❌] Быстрый ответ с данным названием уже существует.\``,
                            ephemeral: true
                        })
                        
                        moderator.fastaction.push(newField)
                        await moderator.save()

                        await interaction.editReply(`**Новый быстрый ответ успешно добавлено.**`)
                        collectorInline.stop();
                    });
                });
            });
        } else if (interaction.options.getSubcommand() === "удалить"){
            if (!moderator.fastaction) return await interaction.reply({
                content: `\`[❌] У вас отсутствует настройка быстрых ответов. Воспользуйтесь командой: /fa создать\``,
                ephemeral: true
            })

            const name = interaction.options.getString("название");
            const index = moderator.fastaction.findIndex(field => field.name === name)
            if (index === -1) return await interaction.reply({
                content: `\`[❌] Быстрый ответ с данным названием не найден.\``,
                ephemeral: true
            })
            
            moderator.fastaction.splice(index, 1)

            await moderator.save()

            await interaction.reply({
                content: `\`[✅] Быстрый ответ \"${name}\" успешно удален.\``,
                ephemeral: true
            })
        } 
    }
}