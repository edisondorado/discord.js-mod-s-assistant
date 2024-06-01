const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const { DiscordServers } = require("../../models/model");
const doesServerExist = require("../../middleware/doesServerExist")

module.exports = {
    data: new SlashCommandBuilder()
        .setName("log-role")
        .setDescription("Роли, которые используются в логировании по выдаче/снятии")
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Список")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Добавить")
                .addStringOption(option => option
                    .setName('arole')
                    .setDescription('ID Роли')
                    .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Удалить")
                .addStringOption(option => option
                    .setName('rrole')
                    .setDescription('ID Роли')
                    .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("channel")
                .setDescription("Сменить канал")
                .addStringOption(option => option
                    .setName('channel')
                    .setDescription('ID Канала')
                    .setRequired(true)
                )
        ),        
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, existServer] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        if (interaction.options.getSubcommand() === "list"){
            let page = 1;
            var logRoles = existServer.logRoles

            let totalPages = Math.ceil(logRoles.length / 15);
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
            
            const embedMessage = async (page, logRoles) => {
                const itemsPerPage = 15

                const start = (page - 1) * itemsPerPage;
                const end = page * itemsPerPage;
                const logRolesOnPage = logRoles.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setTitle(`**Список ролей(${logRoles.length}):**`)
                    .setDescription(`${logRolesOnPage.map((item, index) => `<@&${item}> (\`${item}\`)`).join("\n")}\n\nСтраница ${page}/${totalPages}`);

                return embed;
            }
            row.components[0].setDisabled(true);

            if (page === totalPages) {
                row.components[1].setDisabled(true);
            }

            await interaction.reply({ embeds: [await embedMessage(page, logRoles)], components: [row], ephemeral: true  });

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
                    await interaction.editReply({ embeds: [await embedMessage(page, logRoles)], components: [row] });
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
                    await interaction.editReply({ embeds: [await embedMessage(page, logRoles)], components: [row] });
                }
                } catch (error) {
                    console.error(error);
                }
            }); 
        } else if (interaction.options.getSubcommand() === "add"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const role = interaction.options.getString("arole");

            const doesExist = await interaction.guild.roles.cache.has(role);
            if(!doesExist) return await interaction.reply({
                content: "\`[❌] Роль с данным ID не существует!\`",
                ephemeral: true
            });

            if (server.logRoles.indexOf(role) === -1){
                server.logRoles.push(role);
                await server.save()
                    .then(async () => {
                        await interaction.reply({
                            content: `\`[✅] Роль была успешно добавлена в список.\``,
                            ephemeral: true
                        });
                    })
                    .catch(async error => {
                        await interaction.reply({
                            content: "\`[❌] Произошла ошибка при использовании команды!\`",
                            ephemeral: true
                        });
                        console.error("/log-role add: ", error);
                    })
            } else {
                await interaction.reply({
                    content: `\`[❌] Данная роль уже имеется в списке! Для удаления, воспользуйтесь командой: /log-role remove\``,
                    ephemeral: true
                })
            }
        } else if (interaction.options.getSubcommand() === "remove"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const role = interaction.options.getString("rrole");

            if (server.logRoles.indexOf(role) === -1){
                await interaction.reply({
                    content: `\`[❌] Роль с данным ID отсутствует в списке! Для просмотра списка, используйте: /log-role list.\``,
                    ephemeral: true
                })
            } else {
                server.logRoles = server.logRoles.filter(r => r !== role);;
                await server.save()
                    .then(async () => {
                        await interaction.reply({
                            content: `\`[✅] Роль была успешно удалена.\``,
                            ephemeral: true
                        });
                    })
                    .catch(async error => {
                        await interaction.reply({
                            content: "\`[❌] Произошла ошибка при удалении команды!\`",
                            ephemeral: true
                        });
                        console.error("/log-role remove: ", error);
                    })
            }
        } else if (interaction.options.getSubcommand() === "channel"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const channel = interaction.options.getString("channel");

            if (channel === server.logRolesChannel) return await interaction.reply({
                content: "\`[❌] Введенный ID не отличается от текущего значения. Пожалуйста, укажите другой ID канала для замены!\`",
                ephemeral: true
            });

            const doesExist = await interaction.guild.channels.cache.has(channel);

            if (!doesExist) return await interaction.reply({
                content: "\`[❌] Канал с данным ID отсутствует на сервере!\`",
                ephemeral: true
            });

            server.logRolesChannel = channel;
            await server.save()
                .then(async () => {
                    await interaction.reply({
                        content: `\`[✅] Канал был успешно изменен.\``,
                        ephemeral: true
                    });
                })
        }
    }
}