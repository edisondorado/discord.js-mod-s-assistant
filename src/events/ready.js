const { Events } = require('discord.js');
const checkBans = require('../auto/unban');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
        const intervalId = setInterval(() => checkBans(client), 10 * 1000);
    }
};
