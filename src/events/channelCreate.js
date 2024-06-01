const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        const server = await DiscordServers.findOne({id: channel.guild.id})
        if(!server || !server.logChannel) return;

        const channelLog = await channel.guild.channels.cache.get(server.logChannel)
        if(!channelLog) return;

        const auditLogs = await channel.guild.fetchAuditLogs({ type: "10" });
        const channelUpdateLog = auditLogs.entries.first();

        const { executor } = channelUpdateLog;
        const member = await channel.guild.members.cache.get(executor.id);

        if (!member) return;

        const permissionOverwrites = channel.permissionOverwrites.cache;

        var embed = new EmbedBuilder()
            .setAuthor({name: member.nickname, iconURL: member.displayAvatarURL()})
            .setDescription(`**<@${executor.id}> создал канал** ${channel.name}**(\`${channel.id}\`)**`)
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: channel.guild.name, iconURL: channel.guild.iconURL() })


        for (const item of permissionOverwrites.values()) {
            let target;
            if (item.type === 0) {
                target = channel.guild.roles.cache.get(item.id);
            } else {
                target = await channel.guild.members.fetch(item.id).catch(console.error);
            }
            
            if (target) {
                const denyArray = item.deny.toArray();
                const allowArray = item.allow.toArray();
            
                const denyStr = denyArray.length > 0 ? denyArray.map(perm => `- ${perm}`).join("\n") : "";
                const allowStr = allowArray.length > 0 ? allowArray.map(perm => `+ ${perm}`).join("\n") : "";
        
                embed.addFields({
                    name: `${item.type === 0 ? `Роль -  ${target.name}` : `Пользователь - ${target.user.username}`}`,
                    value: `\`\`\`diff\n${denyStr}\n${allowStr}\`\`\``,
                    inline: true
                });
            }
        }

        embed.addFields({
            name: "**ID**",
            value: `\`\`\`\nExecutor = ${executor.id}\nChannel = ${channel.id}\n\`\`\``
        })

        await channelLog.send({
            content: "",
            embeds: [embed]
        })
    }
};