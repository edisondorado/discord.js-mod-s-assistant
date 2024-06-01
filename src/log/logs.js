const { EmbedBuilder, DiscordAPIError } = require("discord.js");
const { DiscordServers, DiscordServersUsers, DiscordServersMods } = require("../models/model");

async function logFunction(client, type, guildId, userId, mod, reason, time) {
    try {
        const server = await DiscordServers.findOne({ id: guildId })

        const guild = await client.guilds.fetch(guildId);

        let user;
        try {
            user = await guild.members.fetch(userId);
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 10007) {
                user = null;
            } else {
                console.error('Произошла другая ошибка:', error);
            }
        }
        
        const currentTimeInMillis = new Date().getTime();
        let moderator;
        try {
            if (mod === "SYSTEM" || mod === "VOTE-SYSTEM"){
                moderator = null;
            } else {
                moderator = await guild.members.fetch(mod);
                const user = await DiscordServersMods.findOne({ server: guildId, id: moderator.id })
                
                var newInfraction = { type: type, mod: mod, date: currentTimeInMillis, reason: reason }

                if(!user){
                    await DiscordServersMods.create({
                        id: moderator.id,
                        server: guildId,
                        infractions: [newInfraction]
                    })
                } else {
                    await DiscordServersMods.findOneAndUpdate({ id: moderator.id, server: guildId }, { $push: { infractions: newInfraction } });
                }
            }
        } catch (error) {
            if (error instanceof DiscordAPIError && error.code === 10007) {
                moderator = null;
            }
        }    

        const dbUser = await DiscordServersUsers.findOne({id: userId, server: guildId})
        const logMod = await client.channels.cache.get(server.logMod);


        if (!dbUser){
            await DiscordServersUsers.create({
                id: userId,
                server: guildId,
                infractions: [
                    {
                        type: type,
                        mod: `${mod}`,
                        date: `${currentTimeInMillis}`,
                        time: time ? time : null,
                        reason: reason
                    }
                ]
            })
        } else {
            dbUser.infractions.push({ type: type, mod: mod, time: time ? time : null, date: currentTimeInMillis, reason: reason })
            await dbUser.save();
        }

        if (!logMod) return;

        const embed = new EmbedBuilder()
            .setTitle("⚠ • Модерация")
            .setColor(0xf17070)
            .setThumbnail(user ? user.displayAvatarURL() : moderator ? moderator.displayAvatarURL() : client.user.displayAvatarURL())
            .addFields(
                {
                    name: "Пользователь:",
                    value: `<@${userId}>`,
                    inline: true
                },
                {
                    name: "Действие:",
                    value: `/${type}`,
                    inline: true,
                },
                {
                    name: "Модератор:",
                    value: `${moderator ? `<@${mod}>` : `${mod}`} `,
                    inline: true,
                },
                {
                    name: "Причина:",
                    value: `${reason}`,
                    inline: false
                }
            )

        if (type === "mute" || type === "mpmute" || type === "ticketban") {
            embed.addFields(
                {
                    name: "Время:",
                    value: `${time}`,
                    inline: false
                }
            )
        } else if (type === "ban" || type === "voteban") {
            embed.addFields(
                {
                    name: "Время:",
                    value: `${time} дней`,
                    inline: false
                }
            )
        } 

        embed.addFields(
            {
                name: "ID:",
                value: `\`\`\`\nUser: \`${userId}\`\nMod: \`${mod}\`\n\`\`\``,
                inline: false
            }
        )

        await logMod.send({content: "", embeds: [embed]});

    } catch (error) {
        console.error(`Error occurred while logging: ${error}`);
    }
}

module.exports = logFunction;

