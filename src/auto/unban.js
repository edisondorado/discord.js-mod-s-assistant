const logFunction = require("../log/logs");
const { DiscordServersBans, DiscordServersVoteBan, DiscordServersMute, DiscordServers, DiscordServersMods } = require("../models/model")

async function checkBans(client){
    try {
        const currentTimeInMillis = new Date().getTime();

        const users = await DiscordServersBans.find({ expiresOn: { $lt: currentTimeInMillis } })
        
        users.forEach(async item => {
            const guild = await client.guilds.fetch(item.server);
            await guild.members.unban(item.id);

            await DiscordServersBans.deleteOne({ id: item.id, server: item.server });

            await logFunction(client, "unban", item.server, item.id, "SYSTEM", "Истек срок бана");
        })

        const votes = await DiscordServersVoteBan.find({ activeUntil: { $lt: currentTimeInMillis } })
        votes.forEach(async item => {
            const countTrue = item.voted.filter(item => item.vote === true).length;
            const countFalse = item.voted.filter(item => item.vote === false).length;

            if (countTrue === countFalse || countFalse > countTrue ) {
                const guild = await client.guilds.fetch(item.guildId);
                const channels = await guild.channels.cache.get(item.channelId);
                await channels.messages.fetch(item.messageId)
                    .then(async (message) => {
                        let embed = message.embeds[0].data;
                        embed.description += `\n\n**Голосование было закончено - отказано(${countTrue === countFalse ? "50/50" : "Большинство против" }).**`
                        await message.edit({
                            embeds: [embed],
                            components: []
                        })
                    })
                    .catch((err) => {
                        console.warn(err);
                    })
                    .finally(async () => {
                        await DiscordServersVoteBan.findOneAndDelete({ guildId:item.guildId, userId: item.userId })
                    })
            } else if (countTrue) {
                if (!item.guildId) return;
                const guild = await client.guilds.fetch(item.guildId).catch(async (err) => await DiscordServersVoteBan.findOneAndDelete({ guildId: item.guildId, userId: item.userId }));
                if(!guild) return;
                const channels = await guild.channels.cache.get(item.channelId);
                const message = await channels.messages.fetch(item.messageId);
                let embed = message.embeds[0].data;
                embed.description += `\n\n**Голосование было закончено - одобрено.**`

                const regex = /<@(\d+)>/;

                var match;

                if (embed.fields[0].name === "Одобрили:"){
                    match = embed.fields[0].value.match(regex);
                } else {
                    match = embed.fields[1].value.match(regex);
                }

                if (match){
                    const mod = await DiscordServersMods.findOne({ server: item.guildId, id: match[1] })
                    
                    var newInfraction = { type: "voteban", mod: match[1], date: new Date().getTime(), reason: item.reason }

                    if(!mod){
                        await DiscordServersMods.create({
                            id: match[1],
                            server: item.guildId,
                            infractions: [newInfraction]
                        })
                    } else {
                        await DiscordServersMods.findOneAndUpdate({ id: match[1], server: item.guildId }, { $push: { infractions: newInfraction } });
                    }
                }

                await DiscordServersVoteBan.findOneAndDelete({ guildId: item.guildId, userId: item.userId })
                    .then(async () => {
                        await message.edit({
                            embeds: [embed],
                            components: []
                        })
                    })
                
                await guild.members.ban(item.userId,{ reason: item.reason });

                await DiscordServersBans.findOneAndDelete({ id: item.userId, server: item.guildId })
        
                await DiscordServersBans.create({
                    id: item.userId,
                    expiresOn: item.expiresOn,
                    reason: item.reason,
                    server: item.guildId,
                    mod: "VOTE-SYSTEM"
                })
    
                await logFunction(client, "voteban", item.guildId, item.userId, "VOTE-SYSTEM", item.reason, item.time);
            }
        })

        const mutes = await DiscordServersMute.find({ expiresOn: { $lt: currentTimeInMillis } })
        mutes.forEach(async item => {
            const server = await DiscordServers.findOne({ id: item.server })
            const guild = await client.guilds.fetch(item.server);
            const member = guild.members.cache.get(item.userId);
            const roleToRemove = guild.roles.cache.get(server.mpmuterole);

            if (member && member.roles){
                await member.roles.remove(roleToRemove);
            }

            await DiscordServersMute.deleteOne({ userId: item.userId, server: item.server });

            await logFunction(client, "unmpmute", item.server, item.userId, "SYSTEM", "Истек срок мута");
        })
    } catch (error) {
        console.error('Произошла ошибка:', error);
    }
}

module.exports = checkBans;