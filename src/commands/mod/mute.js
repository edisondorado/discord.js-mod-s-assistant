const ms = require("ms");
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Замутить пользователя")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которому необходимо выдать мут")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("время")
                .setDescription("Длительность мута(5 s/m/h/d)")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("Причина мута")
                .setRequired(true)),
    async execute(interaction){
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["mute"]);
        if (!isMod) return;

        const target = interaction.options.getMember("пользователь");
        const time = interaction.options.getString("время");
        const reason = interaction.options.getString("причина");
        const formattedDuration = ms(time);
        const maxDuration = ms("28 days");

        if (target.isCommunicationDisabled()) return interaction.reply({content: `\`[❌] У данного пользователя имеется активная блокировка чата.\``,
            ephemeral: false
        }) 
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

        if (formattedDuration > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 28 дней или меньше!\`",
                ephemeral: true
            })
        }

        await target.timeout(formattedDuration, reason)

        await logFunction(interaction.client, "mute", interaction.guild.id, target.id, interaction.member.id, reason, time);
        await interaction.reply({content: "\`[✅] Пользователю успешно выдан мут!\`", ephemeral: false});
    }
}