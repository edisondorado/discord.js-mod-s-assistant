const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rr")
        .setDescription("Снять организационные роли пользователю/себе")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(false)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member);

        var hasAccessRole = false;
        var accessRoles = [];

        for (const item of server.request_role){
            for (const role of item.hasAccess){
                if (interaction.member.roles.cache.has(role)){
                    hasAccessRole = true;
                    for (const roleId of item.roleId){
                        accessRoles.push(roleId);
                    }
                }
            }
        }

        const target = interaction.options.getMember("пользователь");
        
        if ((!isMod && !hasAccessRole) || !target){
            const roleIdArray = server.request_role.flatMap(role => role.roleId);

            roleIdArray.forEach(async item => {
                if (interaction.member.roles.cache.has(item)){
                    await interaction.member.roles.remove(item); 
                }
            })

            await interaction.reply({
                content: `\`[✅] Роли были успешно удалены!\``,
                ephemeral: false
            })
        } else {
            if (target.permissions.has(PermissionsBitField.All)) return await interaction.reply({
                content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
                ephemeral: true
            })
    
            if (interaction.member.id === interaction.client.id){
                return interaction.reply({
                    content: "\`[❌] Вы не можете использовать это на мне!\`",
                    ephemeral: true
                })
            }
            if (hasAccessRole){
                accessRoles.forEach(async item => {
                    if (target.roles.cache.has(item)){
                        await target.roles.remove(item);
                    }
                })
            } else {
                const roleIdArray = server.request_role.flatMap(role => role.roleId);

                roleIdArray.forEach(async item => {
                    if (target.roles.cache.has(item)){
                        await target.roles.remove(item); 
                    }
                })
            }
            
            await interaction.reply({
                content: `\`[✅] Роли были успешно удалены!\``,
                ephemeral: false
            })
        }
    }
}