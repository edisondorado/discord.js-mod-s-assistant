const ms = require("ms");
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const { DiscordServersMute } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");
const isUserMod = require("../../middleware/isUserMod");

const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mpmute")
        .setDescription("Замутить пользователя через роль")
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

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["mpmute"]);
        if (!isMod) return;

        const target = interaction.options.getMember("пользователь");
        const time = interaction.options.getString("время");
        const reason = interaction.options.getString("причина");
        const formattedDuration = ms(time);
        const maxDuration = ms("28 days");

        const modHighest = highestRole(interaction.member);
        const targetHighest = highestRole(target);

        if (modHighest.position < targetHighest.position) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на пользователе, у которого роль выше вашей!\`",
            ephemeral: true
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
        await DiscordServersMute.create({
            userId: target.id,
            expiresOn: new Date().getTime() + formattedDuration,
            server: interaction.guild.id
        })
        await target.roles.add(server.mpmuterole);

        await logFunction(interaction.client, "mpmute", interaction.guild.id, target.id, interaction.member.id, reason, time);
        await interaction.reply({content: "\`[✅] Пользователю успешно выдан мут!\`", ephemeral: true});
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