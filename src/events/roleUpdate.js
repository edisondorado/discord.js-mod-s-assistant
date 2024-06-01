const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        const server = await DiscordServers.findOne({id: oldRole.guild.id})
        if(!server || !server.logRole) return;

        const channelLog = await newRole.guild.channels.cache.get(server.logRole)
        if(!channelLog) return;

        const auditLogs = await newRole.guild.fetchAuditLogs({ type: "31" });
        const roleUpdateLog = auditLogs.entries.first();

        const { executor } = roleUpdateLog;
        const member = await newRole.guild.members.cache.get(executor.id);

        var embed = new EmbedBuilder()
            .setAuthor({name: member.nickname, iconURL: member.displayAvatarURL()})
            .setDescription(`**<@${executor.id}> изменил роль <@&${newRole.id}>**`)
            .setTimestamp()
            .setColor("Random")
            .setFooter({ text: newRole.guild.name, iconURL: newRole.guild.iconURL() })

        if (!member) return;

        var hasChanged = false;

        if (oldRole.name !== newRole.name){
            hasChanged = true;
            embed.addFields({
                name: "**Название**",
                value: `\`${oldRole.name} -> ${newRole.name}\``
            })
        }

        if (oldRole.color !== newRole.color){
            hasChanged = true;
            embed.addFields({
                name: "**Цвет**",
                value: `\`${oldRole.color} -> ${newRole.color}\``
            })
        }

        if (oldRole.icon !== newRole.icon){
            hasChanged = true;
            embed.addFields({
                name: "**Иконка**",
                value: `\`${oldRole.icon} -> ${newRole.icon}\``
            })
        }

        if (oldRole.icon !== newRole.icon){
            hasChanged = true;
            embed.addFields({
                name: "**Позиция**",
                value: `\`${oldRole.rawPosition} -> ${newRole.rawPosition}\``
            })
        }

        if (oldRole.icon !== newRole.icon){
            hasChanged = true;
            embed.addFields({
                name: "**Пингуемая(Mentionable)**",
                value: `\`${oldRole.mentionable} -> ${newRole.mentionable}\``
            })
        }

        if (oldRole.permissions.toArray().length !== newRole.permissions.toArray().length) {
            hasChanged = true;
            embed.addFields(
                {
                    name: "**До:**",
                    value: `\`\`\`\n${oldRole.permissions.toArray().map(item => item).join("\n")}\n\`\`\``,
                    inline: true
                },
                {
                    name: "**После:**",
                    value: `\`\`\`\n${newRole.permissions.toArray().map(item => item).join("\n")}\n\`\`\``,
                    inline: true
                },
            )
        }

        if (hasChanged){
            embed.addFields({
                name: "**ID**",
                value: `\`\`\`\nExecutor = ${executor.id}\nRole = ${newRole.id}\n\`\`\``
            })
    
            await channelLog.send({
                content: "",
                embeds: [embed]
            })
        }
    }
};