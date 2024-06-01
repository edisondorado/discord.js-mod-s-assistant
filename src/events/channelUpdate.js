const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        const server = await DiscordServers.findOne({id: newChannel.guild.id})
        if(!server || !server.logChannel) return;

        const channelLog = await newChannel.guild.channels.cache.get(server.logChannel)
        if(!channelLog) return;

        const auditLogs = await newChannel.guild.fetchAuditLogs({ type: "11" });
        const channelUpdateLog = auditLogs.entries.first();

        const { executor } = channelUpdateLog;
        const member = await newChannel.guild.members.cache.get(executor.id);

        if (!member) return;

        var hasChange = false;

        var embed = new EmbedBuilder()
            .setAuthor({name: member.nickname, iconURL: member.displayAvatarURL()})
            .setDescription(`**<@${executor.id}> отредактировал канал** ${newChannel.name}**(\`${newChannel.id}\`)**`)
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: newChannel.guild.name, iconURL: newChannel.guild.iconURL() })

        if (oldChannel.name !== newChannel.name) {
            hasChange = true;
            embed.addFields({
                name: "**Название**",
                value: `\`${oldChannel.name} -> ${newChannel.name}\``
            })
        }

        if (oldChannel.parentId !== newChannel.parentId) {
            hasChange = true;
            embed.addFields({
                name: "**Раздел**",
                value: `<#${oldChannel.parentId}>(\`${oldChannel.parentId}\`)\` -> \`<#${newChannel.parentId}>(\`${newChannel.parentId}\`)`
            })
        }

        if (oldChannel.nsfw !== newChannel.nsfw) {
            hasChange = true;
            embed.addFields({
                name: "**NSFW**",
                value: `\`${oldChannel.nsfw} -> ${newChannel.nsfw}\``
            })
        }

        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
            hasChange = true;
            embed.addFields({
                name: "**rateLimitPerUser**",
                value: `\`${oldChannel.rateLimitPerUser} -> ${newChannel.rateLimitPerUser}\``
            })
        }

        if (hasChange){
            embed.addFields({
                name: "**ID**",
                value: `\`\`\`\nExecutor = ${executor.id}\nChannel = ${newChannel.id}\n\`\`\``
            })
    
            await channelLog.send({
                content: "",
                embeds: [embed]
            })
        }
    }
};