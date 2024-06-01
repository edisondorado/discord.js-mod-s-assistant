const { Events } = require("discord.js");
const embed = require("./cmds/embed");
const isUserMod = require('../middleware/isUserMod');
const { DiscordServers, DiscordServersMods } = require("../models/model");

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.content === "HI"){
            message.channel.send(`Hi!`);
        }

        const server = await DiscordServers.findOne({ id: message.guild.id })

        const mod = await DiscordServersMods.findOne({ id: message.author.id, server: message.guild.id })
        if (mod){
            if (server.profileMode.messages.channels.includes(message.channel.id)){
                mod.messages.push({
                    channel: message.channel.id,
                    content: message.content,
                    date: new Date().getTime()
                })
                await mod.save()
            }
        }

        const isMod = await isUserMod(message.guild.id, message.member, server["embed"]);
        if (!isMod) return;
        if (message.content.startsWith("/embed")) return embed(message);
    }
}