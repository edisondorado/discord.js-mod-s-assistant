const { EmbedBuilder } = require("discord.js");

async function editEmbed(interaction) {
    const args = interaction.customId.split("_").pop().split(`-`);
        
    const channelId = args[0];
    const messageId = args[1];

    const channel = await interaction.guild.channels.cache.get(channelId)
    const message = await channel.messages.fetch(messageId)

    const title = interaction.fields.getTextInputValue("titleInput");
    const description = interaction.fields.getTextInputValue("descriptionInput");
    const img = interaction.fields.getTextInputValue("imageInput");

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(0x00FF00)

    if (!message) return await interaction.reply({
        content: `\`[❌] Сообщение не было найдено!\``,
        ephemeral: true
    })

    if (img !== null){
        embed.setImage(img);
    }

    await message.edit({
        content: "",
        embeds: [embed]
    })

    await interaction.reply({
        content: `\`[✅] Embed-окно успешно отредактировано!\``,
        ephemeral: true
    })
}

module.exports = editEmbed;