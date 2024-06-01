const mongoose = require("mongoose");

const DiscordServers = mongoose.model("DiscordServers", new mongoose.Schema({
    id: {
        required: true,
        type: String,
    },
    isTest: {
        type: Boolean,
        default: false,
    },
    logCategory: String,
    logMod: String,
    modRole: String,
    ticketLogChannel: String,
    ticketRole: String,
    reportChannel: String,
    
    checkban: String,
    checkrole: String,
    embed: String,
    mclear: String,
    notify: String,
    profile_mode: String,
    revokelog: String,
    voteban: String,
    ban: String,
    kick: String,
    mute: String,
    unban: String,
    mpmute: String,
    unmpmute: String,
    mpmuterole: String,
    ticketban: String,
    unticketban: String,

    logMessage: String,
    logChannel: String,
    logRole: String,
    logVoice: String,
    logUsers: String,
    voiceRole: [{
        voice: {
            type: String,
            required: true
        },
        role: {
            type: String,
            required: true
        }
    }],

    requestChannel: String,
    requestRoleChannel: String,
    request_role: [{
        name: String,
        roleId: {
            type: [String],
        },
        tag: String,
        hasAccess: {
            type: [String]
        }
    }],

    profileMode: {
        points: {
            kick: Number,
            mute: Number,
            ticket: Number,
            ticketban: Number,
            voteban: Number,
            mpmute: Number,
            message: Number,
        },
        messages: {
            limit: Number,
            channels: {
                type: [String],
            },
        }
    },

    unmute: String,
    notifyChannel: {
        type: String,
        default: "0"
    },
    ignoreRoles: [{
        type: String
    }],
    logRolesChannel: {
        type: String,
        default: "0"
    },
    logRoles: [{
        type: String,
        default: []
    }]
}));

const DiscordServersBans = mongoose.model("DiscordServersBans", new mongoose.Schema({
    id: String,
    expiresOn: String,
    reason: String,
    server: String,
    mod: String
}));

const DiscordServersMute = mongoose.model("DiscordServersMute", new mongoose.Schema({
    userId: String,
    expiresOn: String,
    server: String
}));

const DiscordServersRoleRequest = mongoose.model("DiscordServersRoleRequest", new mongoose.Schema({
    userId: String,
    hasSent: String,
    guildId: String,
    active: Boolean
}));

const DiscordServersTicketBan = mongoose.model("DiscordServersTicketBan", new mongoose.Schema({
    guildId: String,
    userId: String,
    mod: String,
    reason: String,
    expiresOn: String,
}));

const DiscordServersTicket = mongoose.model("DiscordServersTicket", new mongoose.Schema({
    guildId: String,
    author: String,
    mod: String,
    createdAt: String,
    threadId: String,
    modMessageId: String,
    botMessageId: String,
    active: Boolean
}));

const DiscordServersVoteBan = mongoose.model("DiscordServersVoteBan", new mongoose.Schema({
    guildId: String,
    allowedToVote: String,
    userId: String,
    reason: String,
    messageId: String,
    channelId: String,
    time: String,
    expiresOn: String,
    voted: [{
        userId: {
            type: String,
            required: true
        },
        vote: {
            type: Boolean,
            required: true
        }
    }],
    activeUntil: String
}))

const DiscordServersMods = mongoose.model("DiscordServersMods", new mongoose.Schema({
    id: String,
    server: String,
    infractions: [{
        type: {
            type: String,
            required: true
        },
        mod: {
            type: String,
            required: true
        },
        date: {
            type: String,
            required: true
        },
        reason: {
            type: String,
            required: true
        }
    }],
    fastaction: [{
        name: String,
        content: String,
        embed: Boolean
    }],
    messages: [{
        channel: String,
        content: String,
        date: String
    }]
}));

const DiscordServersUsers = mongoose.model("DiscordServersUsers", new mongoose.Schema({
    id: String,
    infractions: [{
        type: {
            type: String,
            required: true
        },
        mod: {
            type: String,
            required: true
        },
        date: {
            type: String,
            required: true
        },
        time: {
            type: String,
        },
        reason: {
            type: String,
            required: true
        },
        revoked: {
            type: Boolean,
            default: false
        }
    }],
    server: String,
}))

module.exports = { DiscordServers, DiscordServersBans, DiscordServersMods, DiscordServersUsers, DiscordServersVoteBan, DiscordServersMute, DiscordServersTicket, DiscordServersRoleRequest, DiscordServersTicketBan };
