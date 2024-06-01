const settingUp = require("../../setting/setup");

async function SettingsInteractionButtons(interaction){
    const customId = interaction.customId.substring(interaction.customId.indexOf("SettingsServer_") + "SettingsServer_".length);

    if (customId.startsWith("acceptBot")){
        const initializeSever = await interaction.reply({content: `\`[🛠] Настройка сервера..\``, ephemeral: true})
        await settingUp(interaction.client, interaction)
            .then(async (discordServer) => {
                await initializeSever.delete()
                if (discordServer.logMod && discordServer.modRole) interaction.channel.send(`\`[✅] Автоматическая настройка прошла успешна.\`\n\`Создан канал: \`<#${discordServer.logMod}>\n\`Создана роль: \`<@&${discordServer.modRole}>`)
            })
    } else if (customId.startsWith("declineBot")){
        await interaction.reply({
            content: "\`[💔] Вы отказались от меня.\`",
            ephemeral: true
        })
        await interaction.guild.leave()
    }
}

module.exports = { SettingsInteractionButtons }