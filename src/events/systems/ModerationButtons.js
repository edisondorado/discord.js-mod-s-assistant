const { PermissionsBitField } = require("discord.js");
const { DiscordServersBans, DiscordServers, DiscordServersVoteBan } = require("../../models/model");
const isUserMod = require("../../middleware/isUserMod");
const logFunction = require("../../log/logs");

async function moderationButtons(interaction){
    const targetId = interaction.customId.split("_").pop();
    const server = await DiscordServers.findOne({ id: interaction.guild.id })

    if (interaction.customId.startsWith("deleteNotify_")){
        const isMod = await isUserMod(interaction.guild.id, interaction.member);
        if (!isMod) return;

        const [userId, modId] = extractDynamicValues(interaction.customId);

        if (interaction.member.id !== modId) return;

        const message = interaction.message;

        await message.edit({components: [], content: ""})

        await interaction.reply({
            content: `\`[❌] \`<@${userId}>\` оповещение было отозвано модератором \`<@${interaction.member.id}>\`!\``
        })
    } else if (interaction.customId.startsWith("acceptVoteBan_") || interaction.customId.startsWith("declineVoteBan_")){
        const hasAccessBan = await isUserMod(interaction.guild.id, interaction.member, server["ban"]);
        const isMod = await isUserMod(interaction.guild.id, interaction.member);
        if (!isMod) return;

        const vote = await DiscordServersVoteBan.findOne({ guildId: interaction.guild.id, userId: targetId })
        if (!vote) return await interaction.reply({
            content: `\`[❌] Произошла ошибка, начните голосование заново.\``,
            ephemeral: true
        })

        const isVote = interaction.customId.startsWith("acceptVoteBan_");

        if (hasAccessBan || interaction.member.permissions.has(PermissionsBitField.All)){
            if (isVote){
                const channels = await interaction.guild.channels.cache.get(interaction.channel.id);
                const message = await channels.messages.fetch(interaction.message.id);

                let embed = message.embeds[0].data;
                embed.description += `\n\n**Голосование было закончено раньше модератором <@${interaction.member.id}>. (Заблокирован)**`
                await message.edit({
                    embeds: [embed],
                    components: []
                })

                await interaction.guild.members.ban(targetId, { reason: vote.reason })
    
                await DiscordServersBans.findOneAndDelete({ id: targetId, server: interaction.guild.id })
        
                await DiscordServersBans.create({
                    id: targetId,
                    expiresOn: vote.expiresOn,
                    reason: vote.reason,
                    server: interaction.guild.id,
                    mod: interaction.member.id
                })
    
                await interaction.reply({content: "\`[✅] Пользователь успешно забанен!\`", ephemeral: true});
                await logFunction(interaction.client, "ban", interaction.guild.id, targetId, interaction.member.id, vote.reason, vote.time);
            } else {
                const channels = await interaction.guild.channels.cache.get(interaction.channel.id);
                const message = await channels.messages.fetch(interaction.message.id);

                let embed = message.embeds[0].data;
                embed.description += `\n\n**Голосование было закончено раньше модератором <@${interaction.member.id}>. (Отказано)**`

                await DiscordServersVoteBan.findOneAndDelete({ guildId: interaction.guild.id, userId: targetId })
                    .then(async () => {
                        await message.edit({
                            embeds: [embed],
                            components: []
                        })
                    })
            }
        } else{
            if (vote.voted.some(user => user.userId === interaction.member.id)) return await interaction.reply({
                content: `\`[❌] Вы уже проголосовали!\``,
                ephemeral: true
            })

            const channels = await interaction.guild.channels.cache.get(interaction.channel.id);
            const message = await channels.messages.fetch(interaction.message.id);

            let embed = message.embeds[0].data;
            
            let approvedField = embed.fields.find(field => field.name === "Одобрили:");
            let rejectedField = embed.fields.find(field => field.name === "Отказали:");

            if (isVote) {
                approvedField.value += `\n<@${interaction.member.id}>`;
            } else if (!isVote) {
                if (rejectedField === " ") rejectedField.value = `<@${interaction.member.id}>`;
                else rejectedField.value += `\n<@${interaction.member.id}>`;
            }

            await message.edit({
                embeds: [embed]
            })

            
            vote.voted.push({userId: interaction.member.id, vote: isVote})
            await vote.save()
                .then(async () => {
                    await interaction.reply({
                        content: `\`[✅] Вы успешно проголосовали!\``,
                        ephemeral: true
                    })
                })
        }
    }
}

function extractDynamicValues(variable){
    const regex = /_(\d+)_(\d+)/;

    const match = variable.match(regex);

    if (match){
        return [match[1], match[2]];
    } else {
        return [];
    }
}

module.exports = moderationButtons;