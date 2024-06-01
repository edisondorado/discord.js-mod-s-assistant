const { SlashCommandBuilder } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unmute")
        .setDescription("Снять мут пользователю")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которому необходимо снять мут")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("Причина снятия мута")
                .setRequired(true)),
    async execute(interaction){
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["unmute"]);
        if (!isMod) return;

        const target = interaction.options.getMember("пользователь");
        const reason = interaction.options.getString("причина");

        if (interaction.member.id === target.id){
            return interaction.reply({
                content: "\`[❌] Вы не можете использовать это на себе!\`",
                ephemeral: true
            })
        }

        if (interaction.member.id === interaction.client.id){
            return interaction.reply({
                content: "\`[❌] Вы не можете использовать это на мне!\`",
                ephemeral: true
            })
        }

        if (!target.isCommunicationDisabled()) return interaction.reply({content: `\`[❌] У данного пользователя отсутствует активная блокировка чата.\``,
            ephemeral: true
        }) 

        await target.timeout(null);

        await logFunction(interaction.client, "unmute", interaction.guild.id, target.id, interaction.member.id, reason);
        await interaction.reply({content: "\`[✅] Пользователю успешно снят мут!\`", ephemeral: true});
    }
}