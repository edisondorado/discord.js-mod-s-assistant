const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const { DiscordServersUsers } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("infractions")
        .setDescription("Список нарушений пользователя")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member);
        if (!isMod) return;

        var target; 
        if (interaction.options.getMember("пользователь") !== null) target = interaction.options.getMember("пользователь")
        else target = interaction.options.getUser("пользователь")

        const user = await DiscordServersUsers.findOne({ id: target.id, server: interaction.guild.id })

        if (!user) return interaction.reply({
            content: "\`[❌] У пользователя отсутствует история наказаний!\`",
            ephemeral: true
        })

        const infractions = user.infractions;

        let page = 1;

        let totalPages = Math.ceil(infractions.length / 15);
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
        
        const embedMessage = async (page, infractions) => {
            const itemsPerPage = 15

            const start = (page - 1) * itemsPerPage;
            const end = page * itemsPerPage;
            const infractionsOnPage = infractions.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTimestamp()
                .setTitle(`**Список нарушений от пользователя(${infractions.length}):**`)
                .setDescription(`${infractionsOnPage.map((item, index) => `${item.revoked === true ? "~~" : ""}\`[${index}]\` /${item.type} | ${item.reason} ${item.time ? `| ${item.time} ` : ""}| <@${item.mod}> | <t:${Math.floor(item.date / 1000)}>${item.revoked === true ? "~~" : ""}`).join("\n")}\n\nСтраница ${page}/${totalPages}`);

            return embed;
        }
        row.components[0].setDisabled(true);

        if (page === totalPages) {
            row.components[1].setDisabled(true);
        }

        await interaction.reply({ embeds: [await embedMessage(page, infractions)], components: [row], ephemeral: false  });

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
                await interaction.editReply({ embeds: [await embedMessage(page, infractions)], components: [row] });
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
                await interaction.editReply({ embeds: [await embedMessage(page, infractions)], components: [row] });
            }
            } catch (error) {
                console.error(error);
            }
        }); 
    }
}