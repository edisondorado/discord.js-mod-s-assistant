const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ini = require('../config/bot.json');

async function showError(error, text, interaction){
    const displayError = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId("displayError")
                .setEmoji({name: "🕯"})
                .setLabel("Код ошибки")
                .setStyle(ButtonStyle.Danger)
        )

    await interaction.channel.send({
        content: `\`[❌] ${text}\``,
        components: [displayError]
    });
}

module.exports = showError;