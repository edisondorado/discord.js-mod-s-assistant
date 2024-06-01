const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Message, PermissionsBitField } = require("discord.js");
const ms = require("ms");

const { DiscordServersBans, DiscordServersUsers, DiscordServers } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");
const logFunction = require("../../log/logs");
const showError = require("../../dev/showError");

async function ActionInteractionButton(interaction){
    
    const customId = interaction.customId.substring(interaction.customId.indexOf("Action_") + "Action_".length);
    const targetId = customId.split("_").pop();
    const target = await interaction.guild.members.cache.get(targetId);

    const server = await DiscordServers.findOne({ id: interaction.guild.id })

    if (!customId.startsWith("reload") && !customId.startsWith("avatar") && !customId.startsWith("mod")){
        const isMod = await isUserMod(interaction.guild.id, interaction.member, server[(customId.split("_"))[0]]);
        if (!isMod) return;

        const modHighest = highestRole(interaction.member);
        const targetHighest = highestRole(target);

        if (modHighest.position < targetHighest.position) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на пользователе, у которого роль выше вашей!\`",
            ephemeral: true
        })
        
        if (target.permissions.has(PermissionsBitField.All)) return await interaction.reply({
            content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
            ephemeral: true
        })
    }

    if (customId.startsWith("kick")){
        const kickModal = new ModalBuilder()
            .setCustomId(`Action_kick_${targetId}`)
            .setTitle("Кикнуть пользователя");

        const reasonInput = new TextInputBuilder()
            .setCustomId("reasonKickAction")
            .setLabel("Причина:")
            .setStyle(TextInputStyle.Short);

        const reasonActionRow = new ActionRowBuilder().addComponents(reasonInput);

        kickModal.addComponents(reasonActionRow);

        await interaction.showModal(kickModal);
    } else if (customId.startsWith("ban")) {
        const banModal = new ModalBuilder()
            .setCustomId(`Action_ban_${targetId}`)
            .setTitle("Забанить пользователю");

        const timeInput = new TextInputBuilder()
            .setCustomId("timeBanAction")
            .setLabel("Количество дней:")
            .setStyle(TextInputStyle.Short);

        const reasonInput = new TextInputBuilder()
            .setCustomId("reasonBanAction")
            .setLabel("Причина:")
            .setStyle(TextInputStyle.Short);

        const timeActionRow = new ActionRowBuilder().addComponents(timeInput);
        const reasonActionRow = new ActionRowBuilder().addComponents(reasonInput);

        banModal.addComponents(timeActionRow, reasonActionRow);

        await interaction.showModal(banModal);
    } else if (customId.startsWith("mute")) {
        const muteModal = new ModalBuilder()
            .setCustomId(`Action_mute_${targetId}`)
            .setTitle("Выдать мут пользователю");

        const timeInput = new TextInputBuilder()
            .setCustomId("timeMuteAction")
            .setLabel("Время:")
            .setPlaceholder("15m / 4h / 2d")
            .setStyle(TextInputStyle.Short);

        const reasonInput = new TextInputBuilder()
            .setCustomId("reasonMuteAction")
            .setLabel("Причина:")
            .setStyle(TextInputStyle.Short);

        const timeActionRow = new ActionRowBuilder().addComponents(timeInput);
        const reasonActionRow = new ActionRowBuilder().addComponents(reasonInput);

        muteModal.addComponents(timeActionRow, reasonActionRow);

        await interaction.showModal(muteModal);
    } else if (customId.startsWith("unmute")) {
        const unmuteModal = new ModalBuilder()
            .setCustomId(`Action_unmute_${targetId}`)
            .setTitle("Размутить пользователя");

        const reasonInput = new TextInputBuilder()
            .setCustomId("reasonUnmuteAction")
            .setLabel("Причина:")
            .setStyle(TextInputStyle.Short);

        const reasonActionRow = new ActionRowBuilder().addComponents(reasonInput);

        unmuteModal.addComponents(reasonActionRow);

        await interaction.showModal(unmuteModal);
    } else if (customId.startsWith("avatar")) {
        const avatar = await target.displayAvatarURL({ size: 2048, dynamic: true });

        const embed = new EmbedBuilder()
            .setTitle(`Аватар:`)
            .setImage(avatar)
            .setFooter({ text: target.displayName, iconURL: target.displayAvatarURL() });

        await interaction.reply({
            content: "",
            embeds: [embed],
            ephemeral: true
        });
    } else if (customId.startsWith("reload")) {
        const channels = await interaction.guild.channels.cache.get(interaction.channel.id);
        const message = await channels.messages.fetch(interaction.message.id);

        const tar = await interaction.guild.members.fetch(targetId)
            .catch(error => {
                console.error(`Error fetching member: ${error}`);
                return null;
            });

        const roles = tar.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.id);

        const user = await DiscordServersUsers.findOne({ id: targetId })

        const createdAtUnix = Math.floor(target.user.createdAt.getTime() / 1000);
        const joinedAtUnix = Math.floor(target.joinedAt.getTime() / 1000);

        const hasMute = target.isCommunicationDisabled();

        if (message instanceof Message && message.embeds.length > 0) {
            const buttons1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`Action_kick_${targetId}`)
                        .setEmoji({ name: "🥾" })
                        .setLabel("Кикнуть")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`Action_mute_${targetId}`)
                        .setEmoji({ name: "🔈" })
                        .setLabel("Выдать мут")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(hasMute ? true : false),
                    new ButtonBuilder()
                        .setCustomId(`Action_unmute_${targetId}`)
                        .setEmoji({ name: "🔊" })
                        .setLabel("Снять мут")
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(hasMute ? false : true),
                    new ButtonBuilder()
                        .setCustomId(`Action_ban_${targetId}`)
                        .setEmoji({ name: "🔨" })
                        .setLabel("Забанить")
                        .setStyle(ButtonStyle.Danger),
                )

            const buttons2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`Action_reload_${targetId}`)
                        .setEmoji({ name: "🔄" })
                        .setLabel("Обновить")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`Action_avatar_${targetId}`)
                        .setEmoji({ name: "🖼" })
                        .setLabel("Аватар")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`Action_mod_${targetId}`)
                        .setEmoji({ name: "📕" })
                        .setLabel("Действия модерации")
                        .setStyle(ButtonStyle.Secondary),
                )

            const embed = new EmbedBuilder()
                .setDescription(`**Discord ID:** ${targetId}\n**Роли:** ${roles.map(item => `<@&${item}>`)}\n**Создан аккаунт:** <t:${createdAtUnix}:D>\n**Подключен к серверу:** <t:${joinedAtUnix}:D>\n**Нарушений:** ${user ? user.infractions.length : "0"}`)
                .setColor("Random")
                .setTimestamp()
                .setAuthor({ name: tar.user.username, iconURL: tar.displayAvatarURL() })

            const isTargetMod = await target.roles.cache.has(server.modRole)

            await message.edit({ 
                content: "",
                embeds: [embed],
                components: isTargetMod ? [buttons2] : [buttons1, buttons2]
            });
            await interaction.reply({
                content: "\`[✅] Информация успешно обновлена.\`",
                ephemeral: true
            });
        }

    } else if (customId.startsWith("mod")) {
        const user = await DiscordServersUsers.findOne({ id: targetId, server: interaction.guild.id })

        if (!user) return interaction.reply({
            content: "\`[❌] У пользователя отсутствует история наказаний!\`",
            ephemeral: true
        })

        const infractions = user.infractions;

        let page = 1;

        let totalPages = Math.ceil(infractions.length / 15);
        if (totalPages === 0) {
            totalPages = 1;
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('backwardsInfraction')
                    .setEmoji('◀️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('forwardInfraction')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Success)
        );
        
        const embedMessage = async (page, infractions) => {
            const itemsPerPage = 15

            const start = (page - 1) * itemsPerPage;
            const end = page * itemsPerPage;
            const infractionsOnPage = infractions.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTimestamp()
                .setTitle(`**Список нарушений от пользователя(${infractions.length}):**`)
                .setDescription(`${infractionsOnPage.map((item, index) => `${item.revoked === true ? "~~" : ""}\`[${index}]\` /${item.type} | ${item.reason} ${item.time ? `| ${item.time} ` : ""}| <@${item.mod}> | <t:${Math.floor(item.date / 1000)}>${item.revoked === true ? "~~" : ""}`).join("\n")}\n\nСтраница ${page}/${totalPages}`);

            return embed;
        }
        row.components[0].setDisabled(true);

        if (page === totalPages) {
            row.components[1].setDisabled(true);
        }

        await interaction.reply({ embeds: [await embedMessage(page, infractions)], components: [row] });

        const filter = i => (i.customId === 'forwardInfraction' || i.customId === 'backwardsInfraction') && i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            try {
            if (i.customId === 'forwardInfraction') {
                page++;
                if (page === 1) {
                    row.components[0].setDisabled(true);
                    row.components[1].setDisabled(false);
                } else if (page === totalPages) {
                    row.components[0].setDisabled(false);
                    row.components[1].setDisabled(true);
                } else {
                    row.components[0].setDisabled(false);
                    row.components[1].setDisabled(false);
                }
                await i.deferUpdate();
                await interaction.editReply({ embeds: [await embedMessage(page, infractions)], components: [row] });
         }  if (i.customId === 'backwardsInfraction') {
                page--;
                if (page === 1) {
                    row.components[0].setDisabled(true);
                    row.components[1].setDisabled(false);
                } else if (page === totalPages) {
                    row.components[0].setDisabled(false);
                    row.components[1].setDisabled(true);
                } else {
                    row.components[0].setDisabled(false);
                    row.components[1].setDisabled(false);
                }
                await i.deferUpdate();
                await interaction.editReply({ embeds: [await embedMessage(page, infractions)], components: [row] });
            }
            } catch (error) {
                console.error(error);
            }
        }); 
    }
}

async function ActionInteractionModal(interaction) {
    const customId = interaction.customId.substring(interaction.customId.indexOf("Action_") + "Action_".length);
    const targetId = customId.split("_").pop();
    const target = await interaction.guild.members.cache.get(targetId);

    if (customId.startsWith("kick")) {
        const reason = interaction.fields.getTextInputValue("reasonKickAction");

        await target.kick(reason);

        await logFunction(interaction.client, "kick", interaction.guild.id, target.id, interaction.member.id, reason);
        await interaction.reply({content: "\`[✅] Пользователь успешно исключен из дискорд сервера!\`", ephemeral: true});
    } else if (customId.startsWith("mute")) {
        const reason = interaction.fields.getTextInputValue("reasonMuteAction");
        const time = interaction.fields.getTextInputValue("timeMuteAction");

        const formattedDuration = ms(time);
        const maxDuration = ms("28 days");

        if (formattedDuration > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 28 дней или меньше!\`",
                ephemeral: true
            })
        }

        await target.timeout(formattedDuration, reason)

        await logFunction(interaction.client, "mute", interaction.guild.id, target.id, interaction.member.id, reason, time);
        await interaction.reply({content: "\`[✅] Пользователю успешно выдан мут!\`", ephemeral: true});
    } else if (customId.startsWith("unmute")) {
        const reason = interaction.fields.getTextInputValue("reasonUnmuteAction");

        await target.timeout(null)

        await logFunction(interaction.client, "unmute", interaction.guild.id, target.id, interaction.member.id, reason);
        await interaction.reply({content: "\`[✅] Пользователю успешно снят мут!\`", ephemeral: true});
    } else if (customId.startsWith("ban")) {
        const reason = interaction.fields.getTextInputValue("reasonBanAction");
        const time = interaction.fields.getTextInputValue("timeBanAction");
        const maxDuration = 120;

        if (time > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 120 дней или меньше!\`",
                ephemeral: true
            })
        }

        try{
            await target.ban({ reason: reason })

            const currentTimeInMillis = new Date().getTime();

            await DiscordServersBans.findOneAndDelete({ id: target.id, server: interaction.guild.id })
    
            await DiscordServersBans.create({
                id: target.id,
                expiresOn: currentTimeInMillis + (time * 24 * 60 * 60 * 1000),
                reason: reason,
                server: interaction.guild.id,
                mod: interaction.member.id.id
            })

            await interaction.reply({content: "\`[✅] Пользователь успешно забанен!\`", ephemeral: true});
            await logFunction(interaction.client, "ban", interaction.guild.id, target.id, interaction.member.id, reason, time);
            
        } catch(error){
            console.warn("[ERROR] Error occured while ban: ", error)
            await showError(error, "Произошла ошибка при бане!", interaction)
        }
    }
}

function highestRole(user) {
    let highest = null;
    user.roles.cache.forEach(role => {
        if (!highest || role.position > highest.position) {
            highest = role;
        }
    });
    return highest;
}

module.exports = { ActionInteractionButton, ActionInteractionModal };