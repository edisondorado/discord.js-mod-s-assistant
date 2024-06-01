const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const tags = {
    "pravo": "926126773144530991",
    "autoschool": "926126773144530989",
    "sfpd": "926126773119385649",
    "lspd": "926126773144530984",
    "lvpd": "926126773119385647",
    "rcsd": "926126773119385648",
    "fbi": "926126773144530988",
    "stsostav_mu": "1048695945845538857",
    "sk": "1143075442648166410",
    "delta": "930463526802292796",
    "tsr": "926126773119385644",
    "lsa": "926126773094191123",
    "sfa": "926126773094191122",
    "lsmc": "926126773094191121",
    "sfmc": "1143075085826138142",
    "lvmc": "926126773094191119",
    "stsostav_smi": "926126773094191118",
    "smi_ls": "926126773094191117",
    "smi_sf": "1135685493493862400",
    "smi_lv": "1135685690290602035"
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("checkrole")
        .setDescription("Получить список пользователей с ролью")
        .addStringOption(option => 
            option
                .setName("роль")
                .setDescription("ID Роли")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return await interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["checkrole"]);
        if (!isMod) return;

        var roleId = await interaction.options.getString("роль");

        if (tags[roleId]){
            var roleId = tags[roleId];
        }

        const roleExist = await interaction.guild.roles.cache.has(roleId)
        if(!roleExist) return await interaction.reply({
            content: "\`[❌] Роль с данным ID не существует!\`",
            ephemeral: true
        })

        const role = await interaction.guild.roles.fetch(roleId);

        const membersWithRole = await role.members.map(member => member.user);

        let page = 1;

        let totalPages = Math.ceil(membersWithRole.length / 15);
        if (totalPages === 0) {
            totalPages = 1;
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('backwards')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('forward')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Success)
        );
        
        const embedMessage = async (page, membersWithRole) => {
            const itemsPerPage = 15

            const start = (page - 1) * itemsPerPage;
            const end = page * itemsPerPage;
            const usersOnPage = membersWithRole.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor('#8AC7DB')
                .setTimestamp()
                .setTitle(`**Список пользователей с ролью(${membersWithRole.length}):**`)
                .setDescription(`${usersOnPage.map(user => `<@${user.id}> (\`${user.id}\`)`).join("\n")}\n\nСтраница ${page}/${totalPages}`);

            return embed;
        }
        row.components[0].setDisabled(true);

        if (page === totalPages) {
            row.components[1].setDisabled(true);
        }

        await interaction.reply({ embeds: [await embedMessage(page, membersWithRole)], components: [row] });

        const filter = i => (i.customId === 'forward' || i.customId === 'backwards') && i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            try {
            if (i.customId === 'forward') {
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
                await interaction.editReply({ embeds: [await embedMessage(page, membersWithRole)], components: [row] });
         }  if (i.customId === 'backwards') {
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
                await interaction.editReply({ embeds: [await embedMessage(page, membersWithRole)], components: [row] });
            }
            } catch (error) {
                console.error(error);
            }
        }); 
    }
}