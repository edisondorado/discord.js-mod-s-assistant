const { SlashCommandBuilder } = require("discord.js");
const { DiscordServersBans } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const showError = require("../../dev/showError");
const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Разбанить пользователя в Discord сервере")
        .addStringOption(option => 
            option
                .setName("пользователь")
                .setDescription("ID пользователя, которого необходимо разбанить")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("Причина разбана")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server['unban']);
        if (!isMod) return;

        const target = interaction.options.getString("пользователь");
        const reason = interaction.options.getString("причина");

        const isBanned = await interaction.guild.bans.fetch(target);

        if (!isBanned) return interaction.reply({
            content: "\`[❌] Пользователь не имеет активной блокировке!\`",
            ephemeral: true
        })

        try{
            await interaction.guild.members.unban(target);
            await DiscordServersBans.deleteOne({ id: target, server: interaction.guild.id });

            await interaction.reply({content: "\`[✅] Пользователь успешно разбанен!\`", ephemeral: true});
            await logFunction(interaction.client, "unban", interaction.guild.id, target, interaction.member.id, reason);
        } catch(error){
            console.warn("[ERROR] Error occured while unban: ", error)
            await showError(error, "Произошла ошибка при разбане!", interaction)
        }

    }
}

function highestRole(user) {
    let highest = null;
    user.roles.cache.forEach(role => {
        if (!highest || role.position > highest.position) {
            highest = role;
        }
    });
    return highest;
}