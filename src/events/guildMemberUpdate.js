const { Events, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../models/model");

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (oldMember.roles.cache.size !== newMember.roles.cache.size){
            const server = await DiscordServers.findOne({ id: newMember.guild.id })
            if (!server) return;

            const channel = await newMember.guild.channels.cache.get(server.logRolesChannel);
            if(!channel) return;

            const doesGotRole = oldMember.roles.cache.size < newMember.roles.cache.size;
            
            let updateRole;
            
            if (doesGotRole) {
                updateRole = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            } else {
                updateRole = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id))
            }
            updateRole.forEach(async role => {
                if (server.logRoles.indexOf(role.id) !== -1) await channel.send(`\`[${doesGotRole ? "✅" : "❌"}]\` <@${newMember.id}> (\`${newMember.nickname}\`) была ${doesGotRole ? "`получена`" : "`снята`"} роль <@&${role.id}>(\`${role.name}\`)`)
            })
        }
        
        if (oldMember.nickname !== newMember.nickname){

            const server = await DiscordServers.findOne({id: newMember.guild.id})
            if(!server || !server.logUsers) return;
    
            const channelLog = await newMember.guild.channels.cache.get(server.logUsers)
            if(!channelLog) return;
    
            var embed = new EmbedBuilder()
                .setAuthor({name: newMember.nickname, iconURL: newMember.displayAvatarURL()})
                .setDescription(`**<@${newMember.id}>(\`${newMember.id}\`) обновил профиль**`)
                .addFields(
                    {
                        name: "**Старый никнейм**",
                        value: `${oldMember.nickname}`,
                        inline: true
                    },
                    {
                        name: "**Новый никнейм**",
                        value: `${newMember.nickname}`,
                        inline: true
                    },
                    {
                        name: "**ID**",
                        value: `\`\`\`\nUser = ${newMember.id}\n\`\`\``
                    }
                )
                .setTimestamp()
                .setColor("Random")
                .setFooter({ text: newMember.guild.name, iconURL: newMember.guild.iconURL() })

            await channelLog.send({
                content: "",
                embeds: [embed]
            })
        }
    }
};