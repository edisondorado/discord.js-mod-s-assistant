const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require("discord.js");
const { DiscordServers } = require("../models/model");
const ini = require("../config/bot.json");

async function settingUp(client, interaction){
    const doesExist = await DiscordServers.findOne({id: interaction.guild.id})
    if (doesExist) {
        console.warn("[ERROR] Server already exists.")

        const deleteDataAction = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("deleteData")
                    .setLabel("Удалить")
                    .setEmoji({name: "☢"})
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId("callDev")
                    .setLabel("Связаться с разработчиком")
                    .setEmoji({name: "📨"})
                    .setStyle(ButtonStyle.Success)
            )

        interaction.channel.send({
            content: `\`[❌] Ошибка при инициализации сервера, удалить настройки для исправления проблемы? (Все настройки будут удалены)\``,
            components: [deleteDataAction],
            ephemeral: true
        })

        client.on("interactionCreate", async interaction => {
            if (!interaction.isButton()) return;
            if (!interaction.member.permissions.has("ADMINISTRATOR")) return;

            if (interaction.customId === "deleteData"){
                try {
                    await DiscordServers.deleteOne({ id: interaction.guild.id });
                    interaction.reply({content: "\`[✅] Сервер был удален из базы данных, вам необходимо произвестно повторную настройку используя /setup\`"})
                } catch (error) {
                    console.error("Произошла ошибка при удалении записи из базы данных:", error);
                }
            } else if (interaction.customId === "callDev"){
                interaction.reply({content: `\`Связь с разработчиком:\` <@${ini.bot.dev}>`})
            }
        })
    } else {
        let newServer = {}

        try {
            const role = await interaction.guild.roles.create({
                name: 'Модератор',
                color: '#ce3b3b',
                reason: '[/setup] Настройка сервера'
            });
        
            console.log(`Роль ${role.name} успешно создана.`);

            newServer.modRole = role.id;
            ini.commands.forEach(item => {
                newServer[item] = role.id;
            })
        } catch (error) {
            console.error('Ошибка при создании роли:', error);
        }

        let category = interaction.guild.channels.cache.find(channel => channel.name === '” Log' && channel.type === 'GUILD_CATEGORY')

        if (!category){
            const createCategory = await interaction.guild.channels.create({
                name: "” Log",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: newServer.modRole,
                        allow: [PermissionsBitField.Flags.ViewChannel]
                    }
                ],
            });

            category = createCategory;
            newServer.logCategory = category.id;
        }

        const channels = [{name: "лог мод", value: "logMod"}]
        for (const ch of channels) {
            try {
                const channel = await interaction.guild.channels.create({
                    name: ch.name,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: newServer.modRole,
                            allow: [PermissionsBitField.Flags.ViewChannel]
                        }
                    ],
                })

                console.log(`Канал ${ch.name} успешно создан и добавлен в массив данных`)
                newServer[ch.value] = channel.id
            } catch (error){
                console.error(`[ERROR] Error occured while creatign channels. ${error}`)
            }
        }

        newServer.id = interaction.guild.id;

        const createServer = await DiscordServers.create(newServer);

        return createServer
    }
}

module.exports = settingUp;