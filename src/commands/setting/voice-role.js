const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("voice-role")
        .setDescription("Временные роли для голосовых каналов")
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Список каналов")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Добавить канал")
                .addChannelOption(option => option
                    .setName('канал')
                    .setDescription('-')
                    .setRequired(true)
                )
                .addRoleOption(option => option
                    .setName("роль")
                    .setDescription("-")
                    .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Удалить канал - роль")
                .addRoleOption(option => option
                    .setName('роль')
                    .setDescription('-')
                    .setRequired(true)
                )
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, existServer] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        if (interaction.options.getSubcommand() === "list"){
            const voiceRoles = existServer.voiceRole;
            let page = 1;

            let totalPages = Math.ceil(voiceRoles.length / 15);
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
            
            const embedMessage = async (page, voiceRoles) => {
                const itemsPerPage = 15

                const start = (page - 1) * itemsPerPage;
                const end = page * itemsPerPage;
                const voiceRolesOnPage = voiceRoles.slice(start, end);

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setTitle(`**Список временных ролей(${voiceRoles.length}):**`)
                    .setDescription(`${voiceRolesOnPage.map((item, index) => `<#${item.voice}>(\`${item.voice}\`) - <@&${item.role}>(\`${item.role}\`)`).join("\n")}\n\nСтраница ${page}/${totalPages}`);

                return embed;
            }
            row.components[0].setDisabled(true);

            if (page === totalPages) {
                row.components[1].setDisabled(true);
            }

            await interaction.reply({ embeds: [await embedMessage(page, voiceRoles)], components: [row], ephemeral: true  });

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
                    await interaction.editReply({ embeds: [await embedMessage(page, voiceRoles)], components: [row] });
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
                    await interaction.editReply({ embeds: [await embedMessage(page, voiceRoles)], components: [row] });
                }
                } catch (error) {
                    console.error(error);
                }
            }); 
        } else if (interaction.options.getSubcommand() === "add"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const role = interaction.options.getRole("роль");
            const channel = interaction.options.getChannel("канал");

            var found = false;
            for(const item of server.voiceRole){
                if (item.role === role.id || item.voice === channel.id) {
                    found = true;
                    break;
                }
            }

            if (found) return await interaction.reply({
                content: `\`[❌] Данная роль уже имеется в списке! Для удаления, воспользуйтесь командой: /voice-role remove\``,
                ephemeral: true
            })

            server.voiceRole.push({role: role.id, voice: channel.id})

            await server.save();
            
            await interaction.reply({
                content: "\`[✅] Роль для голосового канала успешно добавлена.\`"
            })

        } else if (interaction.options.getSubcommand() === "remove"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const role = interaction.options.getRole("роль");

            var found = false;
            for(const item of server.voiceRole){
                if (item.role === role.id || item.voice === channel.id) {
                    found = true;
                    break;
                }
            }

            if (!found) return await interaction.reply({
                content: `\`[❌] Данной роли нет в списке! Для добавления, воспользуйтесь командой: /voice-role add\``,
                ephemeral: true
            })

            server.voiceRole = server.voiceRole.filter(r => r.role !== role.id);;
            await server.save()
            await interaction.reply({
                content: `\`[✅] Роль была успешно удалена.\``,
                ephemeral: true
            });
        }
    }
}