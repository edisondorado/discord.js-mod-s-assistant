const { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { DiscordServers, DiscordServersTicketBan, DiscordServersTicket, DiscordServersMods } = require("../../models/model");
const fs = require('fs');

async function CreateTicket(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const server = await DiscordServers.findOne({ id: interaction.guild.id });
    if (!server) return;

    const currentTimeInMillis = new Date().getTime();

    const hasBlock = await DiscordServersTicketBan.findOne({ guildId: interaction.guild.id, userId: interaction.member.id, expiresOn: { $gt: currentTimeInMillis } });
    if (hasBlock) {
        return await interaction.editReply({
            content: `\`[❌] У вас имеется активная блокировка тикетов!\`\n\n**Выдал:** <@${hasBlock.mod}>\n**Причина:** ${hasBlock.reason}\n**Истекает:** <t:${Math.floor(hasBlock.expiresOn / 1000)}:R>`,
        });
    }

    const channel = interaction.guild.channels.cache.get(server.ticketLogChannel);
    if (!channel) {
        return await interaction.editReply({
            content: "\`[❌] Произошла ошибка во время создания тикета! Сообщите об этом модерации.\`",
        });
    }

    const typeButton = interaction.customId.split("_").pop();

    const thread = await interaction.channel.threads.create({
        name: `${typeButton} | ${interaction.member.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.PrivateThread,
        reason: `Ticket from ${interaction.member.user.username}`,
        invitable: false,
    });

    const embedThread = {
        color: 0xffd817,
        title: `**🔨 | Ожидание модерации**`,
        description: "\`\`\`\nДо тех пор, пока модерация не принялась за ваш тикет - вы можете заранее расписать суть вашей проблемы.\n\`\`\`",
        timestamp: new Date().toISOString(),
        footer: {
            text: interaction.guild.name,
            icon_url: interaction.guild.iconURL(),
        },
    };

    const embedLog = {
        color: 0xffd817,
        title: `**📌 | Новый тикет**`,
        fields: [
            {
                name: "**Автор:**",
                value: `<@${interaction.member.id}> (\`${interaction.member.id}\`)`,
                inline: true,
            },
            {
                name: "**Тип тикета:**",
                value: `${typeButton}`,
                inline: true
            },
            {
                name: "**Создан:**",
                value: `<t:${Math.floor(currentTimeInMillis / 1000)}>`,
                inline: true
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: interaction.guild.name,
            icon_url: interaction.guild.iconURL(),
        },
    };

    const component = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`TakeTicket_${thread.id}`)
                .setLabel("Взять тикет")
                .setStyle(ButtonStyle.Success)
        );

    const botMessage = await thread.send({
        content: "",
        embeds: [embedThread]
    });

    const modMessage = await channel.send({
        content: `<@&${server.ticketRole}>`,
        embeds: [embedLog],
        components: [component]
    });

    await modMessage.pin();

    await thread.send(`<@${interaction.member.id}>`);

    await interaction.editReply({
        content: '`[✅] Тикет был успешно создан!`\n`Тикет:` <#' + thread.id + '>',
    });

    await DiscordServersTicket.create({
        guildId: interaction.guild.id,
        author: interaction.member.id,
        createdAt: currentTimeInMillis,
        threadId: thread.id,
        botMessageId: botMessage.id,
        modMessageId: modMessage.id,
        active: true
    });

};


async function AcceptTicket(interaction) {
    const server = await DiscordServers.findOne({ id: interaction.guild.id })
    if (!server) return;

    const hasRole = await interaction.member.roles.cache.has(server.ticketRole)
    if(!hasRole) return;

    const threadId = interaction.customId.split("_").pop();

    const thread = await interaction.guild.channels.fetch(threadId);

    const ticket = await DiscordServersTicket.findOne({
        guildId: interaction.guild.id,
        threadId: threadId
    })
    if (!ticket) return await interaction.reply({
        content: `\`[❌] Произошла ошибка при поиске тикета в базе данных!\``
    })

    const embedLog = interaction.message.embeds[0].data;

    embedLog.fields.push({ name: "Тикет был взят:", value: `<@${interaction.member.id}>` })
    embedLog.title = `✅ | Тикет рассматривает ${interaction.member.user.username}`
    embedLog.color = 0x00ff00;

    await interaction.message.edit({ embeds: [embedLog], components: [] })
        .then(async msg => {
            await msg.unpin()
        })

    ticket.mod = interaction.member.id;
    await ticket.save();

    await thread.members.add(interaction.member.id);
    await thread.send(`<@${interaction.member.id}>`)

    const botMessage = await thread.messages.fetch(ticket.botMessageId);
    let embed = botMessage.embeds[0].data;

    embed.title = `✅ | Тикет рассматривает ${interaction.member.user.username}`;
    embed.description = `Распишите суть проблемы, если еще не сделали это.\nКак только вы получите ответ на свой вопрос - нажмите кнопку ниже.`
    embed.color = 0x00ff00

    const component = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`CloseTicket_${thread.id}`)
                .setEmoji({name: "🔒"})
                .setLabel("Закрыть тикет")
                .setStyle(ButtonStyle.Secondary)
        )

    await botMessage.edit({ embeds: [embed], components: [component] });
}

async function CloseTicket(interaction){
    const server = await DiscordServers.findOne({ id: interaction.guild.id })
    if (!server) return;

    const threadId = interaction.customId.split("_").pop();
    const thread = await interaction.guild.channels.fetch(threadId);

    const ticket = await DiscordServersTicket.findOne({
        guildId: interaction.guild.id,
        threadId: threadId
    })

    ticket.active = false;
    await ticket.save();

    const messages = await thread.messages.fetch();

    const fileName = `messages_${threadId}.txt`;
    let formattedMessages = '';

    messages.forEach(message => {
        if (!message.author.bot){
            formattedMessages += `${message.author.username}(${message.author.id}): ${message.content}\n`;
        }
    });

    fs.writeFileSync(fileName, formattedMessages);

    const channel = await interaction.guild.channels.fetch(server.ticketLogChannel);

    await channel.send({
        content: `\`[✅] Тикет \`<#${threadId}>\` был закрыт.\``,
        files: [{
            attachment: fileName,
            name: `messages_${threadId}.txt`
        }]
    });

    fs.unlinkSync(fileName);

    const members = await thread.members.fetch();
    for (const [memberId, member] of members) {
        await thread.members.remove(memberId);
    }
    await thread.setLocked(true);

    if (formattedMessages !== ""){
        const moderator = await DiscordServersMods.findOne({
            server: interaction.guild.id,
            id: ticket.mod
        })
                    
        var newInfraction = { type: "ticket", mod: ticket.mod, date: new Date().getTime(), reason: "null" }

        if(!moderator){
            await DiscordServersMods.create({
                id: ticket.mod,
                server: interaction.guild.id,
                infractions: [newInfraction]
            })
        } else {
            await DiscordServersMods.findOneAndUpdate({ id: ticket.mod, server: interaction.guild.id }, { $push: { infractions: newInfraction } });
        }
    }
}

module.exports = { CreateTicket, AcceptTicket, CloseTicket };