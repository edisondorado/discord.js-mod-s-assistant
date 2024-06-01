const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("request-roles")
        .setDescription("Окно с запросом ролей")
        .addSubcommand(subcommand =>
            subcommand
                .setName("create")
                .setDescription("Создать окно"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("update")
                .setDescription("Обновить существующее окно")
                .addStringOption(option =>
                    option
                        .setName("ссылка")
                        .setDescription("Ссылка на сообщение")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Добавить роль")
                .addStringOption(option =>
                    option
                        .setName("роль")
                        .setDescription("Роль для выдачи(Можно перечислять через запятую с пробелом)")
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("роль_лидер")
                        .setDescription("Роль имеющая доступ на взаимодействием с запросом(Можно перечислять через запятую с пробелом)")
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("тег")
                        .setDescription("Тег для пользователя")
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName("название")
                        .setDescription("Название раздела в меню")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Удалить роль")
                .addStringOption(option =>
                    option
                        .setName("роль")
                        .setDescription("ID Роли")))
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Получить список ролей")),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, _] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        if(!server) return;

        if (interaction.options.getSubcommand() === "create"){
            const select = new StringSelectMenuBuilder()
                .setCustomId("selectRole")
                .addOptions(
                    server.request_role.map(item => (
                        new StringSelectMenuOptionBuilder()
                            .setLabel(item.name)
                            .setValue(item.roleId.join("_"))
                    ))
            );

            const resetRoles = new ButtonBuilder()
                .setCustomId("resetRoles")
                .setLabel("Сбросить роли")
                .setStyle(ButtonStyle.Danger)

            const row1 = new ActionRowBuilder()
                .addComponents(select);

            const row2 = new ActionRowBuilder()
                .addComponents(resetRoles);

            const embed = {
                title: "**📩 | Запрос роли**",
                color: 0xa84032,
                description: "**Для получения роли - выберите нужный пункт в меню ниже.**",
                timestamp: new Date().toISOString(),
                footer: {
                    text: interaction.guild.name,
                    icon_url: interaction.guild.iconURL()
                }
            }

            await interaction.channel.send({
                content: "",
                embeds: [embed],
                components: [row1, row2]
            })
    
            await interaction.reply({
                content: `\`[✅] Окно успешно создано!\``,
                ephemeral: true
            })
        } else if (interaction.options.getSubcommand() === "update") {
            const url = await interaction.options.getString("ссылка");
            const message = await getMessageFromUrl(interaction, url)
            if (!message) return await interaction.reply({
                content: `\`[❌] Не удалось загрузить сообщение из ссылки.\``,
                ephemeral: true
            })

            if (message.author.id !== interaction.client.user.id) return await interaction.reply({
                content: `\`[❌] Вы выбрали сообщение к которому у меня нет доступа.\``,
                ephemeral: true
            })

            const select = new StringSelectMenuBuilder()
                .setCustomId("selectRole")
                .addOptions(
                    server.request_role.map(item => (
                        new StringSelectMenuOptionBuilder()
                            .setLabel(item.name)
                            .setValue(item.roleId.join("_"))
                    ))
            );

            const resetRoles = new ButtonBuilder()
                .setCustomId("resetRoles")
                .setLabel("Сбросить роли")
                .setStyle(ButtonStyle.Danger)

            const row1 = new ActionRowBuilder()
                .addComponents(select);

            const row2 = new ActionRowBuilder()
                .addComponents(resetRoles);

            await message.edit({
                components: [row1, row2]
            })
            
            await interaction.reply({
                content: `\`[✅] Сообщение было успешно отредактировано!\``,
                ephemeral: true
            })
        } else if (interaction.options.getSubcommand() === "add") {
            const roleId = interaction.options.getString("роль");
            const roleLeader = interaction.options.getString("роль_лидер");
            const tag = interaction.options.getString("тег");
            var nameRole;
            nameRole = interaction.options.getString("название");

            server.request_role.push({
                name: nameRole,
                roleId: parseRoleIds(roleId),
                tag: tag,
                hasAccess: parseRoleIds(roleLeader)
            })

            await server.save()
            
            await interaction.reply({
                content: `\`[✅] Роль была успешно добавлена!\``,
                ephemeral: true
            })
        } else if (interaction.options.getSubcommand() === "remove") {
            const roleId = interaction.options.getString("роль");

            const foundRole = server.request_role.find(role => role.roleId.includes(roleId))

            if(foundRole){
                server.request_role = server.request_role.filter(role => !role.roleId.includes(roleId))
                await server.save()

                await interaction.reply({
                    content: `\`[✅] Роль была успешно удалена!\``,
                    ephemeral: true
                })
            } else {
                await interaction.reply({
                    content: `\`[❌] Роль не была найдена!\``,
                    ephemeral: true
                })
            }
        } else if (interaction.options.getSubcommand() === "list") {
            const requestRoles = server.request_role;

            let page = 1;

            let totalPages = Math.ceil(requestRoles.length / 15);
            if (totalPages === 0) {
                totalPages = 1;
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('backwardsInfraction')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('forwardInfraction')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Success)
            );
            
            const embedMessage = async (page, requestRoles) => {
                const itemsPerPage = 15

                const start = (page - 1) * itemsPerPage;
                const end = page * itemsPerPage;
                const requestRolesOnPage = requestRoles.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setTitle(`**Список ролей используемые в панели запросов(${requestRoles.length}):**`)
                    .setDescription(`${requestRolesOnPage.map((item, index) => `Название роли: ${item.name} | Роль: ${item.roleId.map(role => `<@&${role}>`).join(", ")} (\`${item.roleId.map(role => `${role}`).join(", ")}\`) | Тег: \`${item.tag}\` | Доступ: ${item.hasAccess.map(role => `<@&${role}>`).join(", ")}`).join("\n")}\n\nСтраница ${page}/${totalPages}`);

                return embed;
            }
            row.components[0].setDisabled(true);

            if (page === totalPages) {
                row.components[1].setDisabled(true);
            }

            await interaction.reply({ embeds: [await embedMessage(page, requestRoles)], components: [row], ephemeral: true  });

            const filter = i => (i.customId === 'forwardInfraction' || i.customId === 'backwardsInfraction') && i.user.id === interaction.user.id;

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                try {
                if (i.customId === 'forwardInfraction') {
                    page++;
                    if (page === 1) {
                        row.components[0].setDisabled(true);
                        row.components[1].setDisabled(false);
                    } else if (page === totalPages) {
                        row.components[0].setDisabled(false);
                        row.components[1].setDisabled(true);
                    } else {
                        row.components[0].setDisabled(false);
                        row.components[1].setDisabled(false);
                    }
                    await i.deferUpdate();
                    await interaction.editReply({ embeds: [await embedMessage(page, requestRoles)], components: [row] });
            }  if (i.customId === 'backwardsInfraction') {
                    page--;
                    if (page === 1) {
                        row.components[0].setDisabled(true);
                        row.components[1].setDisabled(false);
                    } else if (page === totalPages) {
                        row.components[0].setDisabled(false);
                        row.components[1].setDisabled(true);
                    } else {
                        row.components[0].setDisabled(false);
                        row.components[1].setDisabled(false);
                    }
                    await i.deferUpdate();
                    await interaction.editReply({ embeds: [await embedMessage(page, requestRoles)], components: [row] });
                }
                } catch (error) {
                    console.error(error);
                }
            }); 
        }
    }
}

async function getMessageFromUrl(interaction, url) {
    const parts = url.split('/');
    const guildId = parts[parts.indexOf('channels') + 1];
    const channelId = parts[parts.indexOf('channels') + 2];
    const messageId = parts[parts.length - 1];

    if (guildId !== interaction.guild.id) return null;

    const channel = await interaction.guild.channels.fetch(channelId);
    if (!channel) return null;

    const message = await channel.messages.fetch(messageId);
    if (!message) return null;

    return message;
}

function parseRoleIds(roleIdsString){
    if (roleIdsString.includes(",")){
        return roleIdsString.split(",").map(roleId => roleId.trim())
    } else {
        return [roleIdsString.trim()]
    }
}