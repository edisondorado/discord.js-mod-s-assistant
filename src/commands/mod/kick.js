const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Кикнуть пользователя из Discord сервера")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которого необходимо кикнуть")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("Причина кика")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["kick"]);
        if (!isMod) return;
        
        const target = interaction.options.getMember("пользователь");
        const reason = interaction.options.getString("причина");

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

        target.kick(reason);

        await logFunction(interaction.client, "kick", interaction.guild.id, target.id, interaction.member.id, reason);
        await interaction.reply({content: "\`[✅] Пользователь успешно исключен из дискорд сервера!\`", ephemeral: true});
    }
}