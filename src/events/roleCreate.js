const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        const server = await DiscordServers.findOne({id: role.guild.id})
        if(!server || !server.logRole) return;

        const channelLog = await role.guild.channels.cache.get(server.logRole)
        if(!channelLog) return;

        const auditLogs = await role.guild.fetchAuditLogs({ type: "30" });
        const roleUpdateLog = auditLogs.entries.first();

        const { executor } = roleUpdateLog;
        const member = await role.guild.members.cache.get(executor.id);

        if (!member) return;

        var embed = new EmbedBuilder()
            .setAuthor({name: member.nickname, iconURL: member.displayAvatarURL()})
            .setDescription(`**<@${executor.id}> создал роль ${role.name}(\`${role.id}\`)**`)
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: role.guild.name, iconURL: role.guild.iconURL() })

        embed.addFields({
            name: "**ID**",
            value: `\`\`\`\nExecutor = ${executor.id}\nRole = ${role.id}\n\`\`\``
        })

        await channelLog.send({
            content: "",
            embeds: [embed]
        })
    }
};