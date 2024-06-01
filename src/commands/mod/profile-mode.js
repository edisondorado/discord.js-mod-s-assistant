const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { DiscordServersMods } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile-mode")
        .setDescription("Профиль модератора")
        .addUserOption(option => 
            option
                .setName("модератор")
                .setDescription("-")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("начальная_дата")
                .setDescription("Формат: dd-mm-yyyy")
                .setRequired(false))
        .addStringOption(option =>
            option
                .setName("конечная_дата")
                .setDescription("Формат: dd-mm-yyyy")
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        
        const [exist, server] = await doesServerExist(interaction.guild.id);
        if (!exist) {
            return interaction.editReply({
                content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``,
                ephemeral: true
            });
        }

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["profile_mode"]);
        if (!isMod) return;

        const target = await interaction.options.getMember("модератор");
        const begin_date = await interaction.options.getString("начальная_дата");
        const end_date = await interaction.options.getString("конечная_дата");

        const mod = await DiscordServersMods.findOne({
            id: target.id,
            server: interaction.guild.id
        });

        if (!mod) {
            return await interaction.editReply({
                content: "\`[❌] У данного пользователя отсутствует профиль модератора.\`",
                ephemeral: true
            });
        }

        const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
        let beginDate = sevenDaysAgo, endDate = Date.now();

        if (begin_date && end_date) {
            if (validateDate(begin_date) && validateDate(end_date)) {
                beginDate = convertDateToMilliseconds(begin_date);
                endDate = convertDateToMilliseconds(end_date);
            } else {
                return await interaction.editReply({
                    content: "\`[❌] Неверный формат даты.\`",
                    ephemeral: true
                });
            }
        }

        const infractionCount = [];

        if (mod.infractions.length > 0){
            for ( const infraction of mod.infractions ){
                if (infraction.date > beginDate && infraction.date < endDate){
                    if (server.profileMode.points[infraction.type]){
                        if (!infractionCount[infraction.type]) infractionCount[infraction.type] = 0
                        infractionCount[infraction.type] += server.profileMode.points[infraction.type];
                    }
                }
            }
        }
    
        const messagesDb = [];

        for (const message of mod.messages) {
            if (message.date > beginDate && message.date < endDate) {
                if (messagesDb[message.channel]) {
                    messagesDb[message.channel]++;
                } else {
                    messagesDb[message.channel] = 1;
                }
            }
        }

        const messageCounts = Object.keys(messagesDb).map(key => ({
            channelId: key,
            messages: messagesDb[key],
            points: messagesDb[key] <= server.profileMode.messages.limit ? messagesDb[key] * server.profileMode.points.message : server.profileMode.messages.limit * server.profileMode.points.message
        }))

        const hasRole = target.roles.cache.has(server.modRole);

        let strStat = "";
        for (const key in infractionCount) {
            strStat += `${key} - ${infractionCount[key].toFixed(2)}\n`;
        }

        const totalScores = Object.values(infractionCount).reduce((acc, curr) => acc + curr, 0);
        strStat += `\nTotal: ${totalScores.toFixed(2)}`;

        const embed = new EmbedBuilder()
            .setDescription(`**ID Discord:** ${target.id}\n\n**Действия за ${Math.floor((endDate - beginDate) / (1000 * 60 * 60 * 24))} дней:**\n${strStat}\n\n${messageCounts.map(item => `<#${item.channelId}>: \`${item.messages}\` сообщений - \`${item.points}\` баллов`).join('\n')}${hasRole ? "" : `\n\nОтсутствует роль модерации: <@&${server.modRole}>`}`)
            .setColor("Random")
            .setAuthor({ name: target.nickname, iconURL: target.displayAvatarURL() });

        await interaction.editReply({
            content: "",
            embeds: [embed]
        });
    }
};

function validateDate(dateString) {
    var dateRegex = /^\d{2}-\d{2}-\d{4}$/;

    if (!dateRegex.test(dateString)) {
        return false;
    }

    var parts = dateString.split("-");
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    var dateObject = new Date(year, month, day);

    if (dateObject.getFullYear() !== year || dateObject.getMonth() !== month || dateObject.getDate() !== day) {
        return false;
    }

    return true;
}

function convertDateToMilliseconds(dateString) {
    var parts = dateString.split("-");
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    var dateObject = new Date(year, month, day);

    return dateObject.getTime();
}
