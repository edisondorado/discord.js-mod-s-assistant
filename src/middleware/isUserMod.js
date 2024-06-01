const { DiscordServers } = require("../models/model");

async function isUserMod(guildId, member, role){
    if (!role){
        const server = await DiscordServers.findOne({id: guildId})
        if (!server) return;
        if (member.roles.cache.has(server.modRole)) return true
        return false
    } else {
        if (member.roles.cache.has(role)) return true
        return false
    }
}

module.exports = isUserMod;