const { EmbedBuilder } = require("discord.js");

async function createEmbed(interaction) {
    const title = interaction.fields.getTextInputValue("titleInput");
    const description = interaction.fields.getTextInputValue("descriptionInput");
    const img = interaction.fields.getTextInputValue("imageInput");

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x00FF00)

    if (img !== null && img !== "" && img !== " " ){
        embed.setImage(img);
    }

    await interaction.channel.send({
        content: "",
        embeds: [embed]
    })

    await interaction.reply({
        content: `\`[✅] Embed-окно успешно создано!\``,
        ephemeral: true
    })
}

module.exports = createEmbed;