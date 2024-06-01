const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const isUserMod = require("../../middleware/isUserMod");
const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mclear")
        .setDescription("Удалить сообщения и/или все сообщения пользователя")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("-")
                .setRequired(false))
        .addNumberOption(option =>
            option
                .setName("количество")
                .setDescription("Количество сообщений")
                .setRequired(false)),
    async execute(interaction) {
        const [exist, server] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["mclear"]);
        if (!isMod) return;

        const target = interaction.options.getMember("пользователь");
        const amount = interaction.options.getNumber("количество");

        if (!amount || amount <= 0 || amount > 100) {
            return await interaction.reply({
                content: "\`[❌] Укажите количество сообщений для удаления (от 1 до 100).\`",
                ephemeral: true
            });
        }

        if (target){
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

            const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });
            const userMessages = fetchedMessages.filter(msg => msg.author.id === target.id);

            try {
                await interaction.channel.bulkDelete(userMessages, true);
                return interaction.reply({
                    content: `\`[✅] Успешно удалено ${userMessages.size} сообщений от пользователя: \`${target}`,
                    ephemeral: true
                })
            } catch (error) {
                console.error(error);
                return interaction.reply({
                    content: "\`[❌] Произошла ошибка при использовании команды!\`",
                    ephemeral: true
                })
            }
        } else {
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: amount });
            const recentMessages = fetchedMessages.filter(msg => (Date.now() - msg.createdTimestamp) < 1209600000);
            await interaction.channel.bulkDelete(recentMessages);

            return interaction.reply({
                content: `\`[✅] Успешно удалено ${amount} сообщений.\``,
                ephemeral: true
            })
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