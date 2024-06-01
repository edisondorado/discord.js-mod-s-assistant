const { DiscordServers } = require("../models/model");

async function doesServerExist(guildId){
    const server = await DiscordServers.findOne({ id: guildId })
    if (server){
        return [true, server]
    } else {
        return [false, null]
    }
}

module.exports = doesServerExist;