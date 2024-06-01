const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        if (message.author.bot) return;
        const server = await DiscordServers.findOne({id: message.guild.id})
        if(!server || !server.logMessage) return;

        const channelLog = await message.guild.channels.cache.get(server.logMessage)
        if(!channelLog) return;

        const channel = await message.guild.channels.cache.get(message.channelId);
        if(channel.parentId === "926126774000177272" || channel.parentId === "1034056388491624528") return;

        var embed = new EmbedBuilder()
            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
            .setDescription(`**Сообщение от <@${message.author.id}>(\`${message.author.id}\`) было удалено в <#${message.channelId}>**`)
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })

        embed.addFields({
            name: "**Сообщение**",
            value: `\`\`\`\n${message.content}\n\`\`\``
        })

        embed.addFields(
            {
                name: "**Время**",
                value: `Создано: <t:${Math.floor(message.createdTimestamp/1000)}>\nУдалено: <t:${Math.floor(new Date().getTime()/1000)}>`
            },
            {
                name: "**ID**",
                value: `\`\`\`\nAuthor = ${message.author.id}\nMessage = ${message.id}\nChannel = ${message.channelId}\n\`\`\``
            }
        )

        await channelLog.send({
            content: "",
            embeds: [embed]
        })
    }
};