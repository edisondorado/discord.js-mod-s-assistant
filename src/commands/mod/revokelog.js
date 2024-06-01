const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const { DiscordServersUsers } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("revokelog")
        .setDescription("Отозвать наказание из списка действий модерации")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(true))
        .addNumberOption(option =>
            option
                .setName("наказание")
                .setDescription("Номер наказание")
                .setRequired(true)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["revokelog"]);
        if (!isMod) return;

        const target = interaction.options.getMember("пользователь");
        const index = interaction.options.getNumber("наказание");

        const modHighest = highestRole(interaction.member);
        const targetHighest = highestRole(target); 

        if (modHighest.position < targetHighest.position) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на пользователе, у которого роль выше вашей!\`",
            ephemeral: true
        });

        if (target.permissions.has(PermissionsBitField.All)) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
            ephemeral: true
        });

        if (interaction.member.id === target.id){
            return interaction.reply({
                content: "\`[❌] Вы не можете использовать это на себе!\`",
                ephemeral: true
            })
        };

        if (interaction.member.id === interaction.client.id){
            return interaction.reply({
                content: "\`[❌] Вы не можете использовать это на мне!\`",
                ephemeral: true
            })
        };

        const user = await DiscordServersUsers.findOne({id: target.id, server: interaction.guild.id})

        if (!user){
            return interaction.reply({
                content: "\`[❌] У данного пользователя отсутствуют нарушения!\`",
                ephemeral: true
            })
        } else {
            user.infractions[index].revoked = true
            await user.save();
        }
        
        return interaction.reply({
            content: `\`[✅] Наказание успешно отозвано!\``,
            ephemeral: true
        })
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