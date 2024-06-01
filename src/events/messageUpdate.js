const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        if (newMessage.author.bot) return;
        const server = await DiscordServers.findOne({id: newMessage.guild.id})
        if(!server || !server.logMessage) return;

        const channelLog = await newMessage.guild.channels.cache.get(server.logMessage)
        if(!channelLog) return;

        const channel = await newMessage.guild.channels.cache.get(newMessage.channelId);
        if(channel.parentId === "926126774000177272" || channel.parentId === "1034056388491624528") return;

        var hasChange = false;

        var embed = new EmbedBuilder()
            .setAuthor({name: newMessage.author.username, iconURL: newMessage.author.displayAvatarURL()})
            .setDescription(`**Сообщение от <@${newMessage.author.id}>(\`${newMessage.author.id}\`) было отредактировано в <#${newMessage.channelId}>**`)
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: newMessage.guild.name, iconURL: newMessage.guild.iconURL() })

        if (oldMessage.content !== newMessage.content){
            hasChange = true;
            embed.addFields(
                {
                    name: "**До**",
                    value: `\`\`\`\n${oldMessage.content}\n\`\`\``
                },
                {
                    name: "**После**",
                    value: `\`\`\`\n${newMessage.content}\n\`\`\``
                },
            )
        }

        if (hasChange){
            embed.addFields(
                {
                    name: "**Время**",
                    value: `Создано: <t:${Math.floor(newMessage.createdTimestamp/1000)}>`
                },
                {
                    name: "**ID**",
                    value: `\`\`\`\nAuthor = ${newMessage.author.id}\nMessage = ${newMessage.id}\nChannel = ${newMessage.channelId}\n\`\`\``
                }
            )
    
            await channelLog.send({
                content: "",
                embeds: [embed]
            })
        }
    }
};