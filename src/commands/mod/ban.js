const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServersBans } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const logFunction = require("../../log/logs");
const showError = require("../../dev/showError");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Забанить пользователя в Discord сервере")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которого необходимо забанить")
                .setRequired(true))
        .addNumberOption(option =>
            option
                .setName("дни")
                .setDescription("Время бана")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("Причина бана")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["ban"]);
        if (!isMod) return;

        var target;
        var onServer = false;
        if (interaction.options.getMember("пользователь") !== null) {
            target = interaction.options.getMember("пользователь");
            onServer = true;
        }
        else target = interaction.options.getUser("пользователь");

        const time = interaction.options.getNumber("дни");
        const reason = interaction.options.getString("причина");
        const maxDuration = 666;

        if (onServer){    
            if (target.permissions.has(PermissionsBitField.All)) return await interaction.reply({
                content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
                ephemeral: true
            })
    
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

            var hasProhibitedRole = false;
            for (const roleId of server.ignoreRoles) {
                const role = target.guild.roles.cache.find(r => r.id === roleId);
                if (role && target.roles.cache.has(role.id)) {
                    hasProhibitedRole = true;
                    break;
                }
            }
            
            if (hasProhibitedRole) return await interaction.reply({
                content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
                ephemeral: true
            });
        }

        if (time > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 120 дней или меньше!\`",
                ephemeral: true
            })
        }

        try{
            await interaction.guild.members.ban(target.id, { reason: reason })

            const currentTimeInMillis = new Date().getTime();

            await DiscordServersBans.findOneAndDelete({ id: target.id, server: interaction.guild.id })
    
            await DiscordServersBans.create({
                id: target.id,
                expiresOn: currentTimeInMillis + (time * 24 * 60 * 60 * 1000),
                reason: reason,
                server: interaction.guild.id,
                mod: interaction.member.id
            })

            await interaction.reply({content: "\`[✅] Пользователь успешно забанен!\`", ephemeral: true});
            await logFunction(interaction.client, "ban", interaction.guild.id, target.id, interaction.member.id, reason, time);
            
        } catch(error){
            console.warn("[ERROR] Error occured while ban: ", error)
            await showError(error, "Произошла ошибка при бане!", interaction)
        }
    }
}