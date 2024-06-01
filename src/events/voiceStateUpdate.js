const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        const server = await DiscordServers.findOne({id: newState.guild.id})
        if (!server || !server.voiceRole) return;
        for(const item of server.voiceRole){
            const user = await newState.guild.members.cache.get(newState.id);
            if(!user) return; 
            if (!oldState.channelId){
                if(newState.channelId === item.voice){
                    await user.roles.add(item.role)
                }
            } else if (!newState.channelId){
                if (oldState.channelId === item.voice){
                    await user.roles.remove(item.role)
                }
            }
        }

        if(!server || !server.logVoice) return;

        const channelLog = await newState.guild.channels.cache.get(server.logVoice)
        if(!channelLog) return;

        const target = await newState.guild.members.cache.get(newState.id);
        if(!target) return;

        var embed = new EmbedBuilder()
            .setAuthor({name: target.nickname, iconURL: target.displayAvatarURL()})
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: newState.guild.name, iconURL: newState.guild.iconURL() })

        if (oldState.channelId === newState.channelId) return;

        if (!oldState.channelId && newState.channelId){
            embed.setDescription(`**<@${target.id}> зашел в <#${newState.channelId}>(\`${newState.channelId}\`)**`)
            embed.addFields({
                name: "**Канал**",
                value: `<#${newState.channelId}>`
            })
        } else if(!newState.channelId && oldState.channelId){
            embed.setDescription(`**<@${target.id}> вышел из <#${oldState.channelId}>(\`${oldState.channelId}\`)**`)
            embed.addFields({
                name: "**Канал**",
                value: `<#${oldState.channelId}>`
            })
        } else if(newState.channelId && oldState.channelId){
            embed.setDescription(`**<@${target.id}> перешел с <#${oldState.channelId}>(\`${oldState.channelId}\`) в <#${newState.channelId}>(\`${newState.channelId}\`)**`)
            embed.addFields(
                {
                    name: "**Старый канал**",
                    value: `<#${oldState.channelId}>`,
                    inline: true
                },
                {
                    name: "**Новый канал**",
                    value: `<#${newState.channelId}>`,
                    inline: true
                }
            )
        }

        embed.addFields(
            {
                name: "**ID**",
                value: `\`\`\`\nUser = ${newState.id}\n${newState.channelId && oldState.channelId ? `Old = ${oldState.channelId}\nNew = ${newState.channelId}` : `Channel = ${!newState.channelId && oldState.channelId ? oldState.channelId : newState.channelId}`}\`\`\``
            }
        )

        await channelLog.send({
            content: "",
            embeds: [embed]
        })
    }
};