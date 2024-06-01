const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require("discord.js");
const { DiscordServers, DiscordServersRoleRequest } = require("../../models/model");
const isUserMod = require("../../middleware/isUserMod");

async function requestRoles(interaction) {
    const server = await DiscordServers.findOne({ id: interaction.guild.id });
    if (!server) return;

    const [targetId, ...roles] = extractValues(interaction.customId);
    const isMod = await isUserMod(interaction.guild.id, interaction.member);

    let targetRole;
    
    for (const roleId of roles[0]) {
        const matchingRoles = server.request_role.filter(role => role.roleId.includes(roleId));
        console.log(roleId)
        if (matchingRoles.length === 1) {
            targetRole = matchingRoles[0];
            break;
        }
    }

    console.log(targetRole)
    
    const doesHaveAccess = hasAccessRole(interaction.member, targetRole.hasAccess);

    if (!isMod && !doesHaveAccess) {
        return await interaction.reply({
            content: `\`[❌] У вас отсутствует доступ на одобрение запросов!\``,
            ephemeral: true
        });
    }

    const target = await interaction.guild.members.cache.get(targetId);
    if (!target) {
        return await interaction.reply({
            content: `\`[❌] Заявка рассматривалась слишком долго и/или пользователь вышел из Discord сервера!\``,
            ephemeral: true
        });
    }

    if (interaction.customId.startsWith("AcceptRole_")) {
        for (const roleId of roles) {
            await target.roles.add(roleId);
        }
        await interaction.message.delete();
        await interaction.channel.send({
            content: `\`[✅] \`<@${interaction.member.id}>\` одобрил запрос пользователя \`<@${targetId}>\` с ником ${target.nickname}\``
        });

        await DiscordServersRoleRequest.findOneAndUpdate(
            {
                userId: targetId,
                guildId: interaction.guild.id,
                active: true
            },
            { $set: { active: false } },
            { new: true }
        );
    }

    if (interaction.customId.startsWith("DeclineRole_")) {
        await interaction.message.delete();
        await interaction.channel.send({
            content: `\`[❌] \`<@${interaction.member.id}>\` отклонил запрос пользователя \`<@${targetId}>\` с ником ${target.nickname}\``
        });

        await DiscordServersRoleRequest.findOneAndUpdate(
            {
                userId: targetId,
                guildId: interaction.guild.id,
                active: true
            },
            { $set: { active: false } },
            { new: true }
        );

        await interaction.reply({
            content: `\`[✅] Вы успешно отклонили запрос пользователя.\``,
            ephemeral: true
        });
    }

    if (interaction.customId.startsWith("TrashRole_")) {
        await interaction.message.delete();
        await interaction.channel.send({
            content: `\`[🗑️] \`<@${interaction.member.id}>\` удалил запрос пользователя \`<@${targetId}>\` с ником ${target.nickname}\``
        });

        await DiscordServersRoleRequest.findOneAndUpdate(
            {
                userId: targetId,
                guildId: interaction.guild.id,
                active: true
            },
            { $set: { active: false } },
            { new: true }
        );

        await interaction.reply({
            content: `\`[✅] Вы успешно удалили запрос пользователя.\``,
            ephemeral: true
        });
    }

    if (interaction.customId.startsWith("StatsRole_")) {
        const server = await DiscordServers.findOne({ id: interaction.guild.id });
        const channel = await interaction.guild.channels.cache.get(server.requestRoleChannel);
        if (channel) {
            await channel.send({
                content: `\`[📨] \`<@${targetId}>\`: \`<@${interaction.member.id}>\` запросил вашу статистику для выдачи роли.\``
            });

            await interaction.reply({
                content: `\`[✅] Вы успешно запросили статистику у пользователя в канале: \`<#${channel.id}>`,
                ephemeral: true
            });
        }
    }
}


async function modalRoles(interaction){
    const server = await DiscordServers.findOne({ id: interaction.guild.id })
    if (!server.requestChannel) return;

    const doesChannelExist = await interaction.guild.channels.cache.has(server.requestChannel)
    if(!doesChannelExist) return;

    const activeRequest = await DiscordServersRoleRequest.findOne(
        {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
            active: true
        }
    );

    if (activeRequest && new Date().getTime() - activeRequest.hasSent < 24 * 60 * 60 * 1000) return await interaction.reply({
        content: "`[❌] У вас уже имеется активная заявка на выдачу роли!`",
        ephemeral: true
    })

    await DiscordServersRoleRequest.create({
        userId: interaction.member.id,
        guildId: interaction.guild.id,
        hasSent: new Date().getTime(),
        active: true
    })

    const channel = await interaction.guild.channels.cache.get(server.requestChannel);
    const parts = interaction.customId.split("_");
    const roleIds = parts.slice(1, 3);
    
    let targetRole;
    
    for (const roleId of roleIds) {
        const matchingRoles = server.request_role.filter(role => role.roleId.includes(roleId));
        
        if (matchingRoles.length === 1) {
            targetRole = matchingRoles[0];
            break;
        }
    }

    const nick = interaction.fields.getTextInputValue("nick");
    const rank = interaction.fields.getTextInputValue("rank");

    if (!/^[1-9]$/.test(rank)) return await interaction.reply({
        content: `\`[❌] Вы ввели некорректный ранг! Используйте: 1-9\``,
        ephemeral: true
    })

    if (!isNickNameFormat(nick)) return await interaction.reply({
        content: `\`[❌] Вы ввели некорректный никнейм! Используйте формат: Nick_Name\``,
        ephemeral: true
    })

    const roleIdArray = server.request_role.flatMap(role => role.roleId);
    
    if (hasAccessRole(interaction.member, roleIdArray)) return await interaction.reply({
        content: `\`[❌] У вас уже имеется организационная роль. Воспользуйтесь кнопкой ниже для сброса ролей.\``,
        ephemeral: true
    })

    await interaction.member.setNickname(`${targetRole.tag}[${rank}] ${nick}`)

    const embed = new EmbedBuilder()
        .setTitle("**📩 | Запрос роли**")
        .addFields(
            {
                name: "**Пользователь:**",
                value: `<@${interaction.member.id}>`,
                inline: true,
            },
            {
                name: "**Никнейм:**",
                value: `${interaction.member.nickname}`,
                inline: true
            },
            {
                name: "**Роль:**",
                value: `${roleIds.map(item => `<@&${item}>`).join(", ")}`,
                inline: true
            },
            {
                name: "**Взаимодействие:**",
                value: `\`[✅] - одобрить роль\`\n\`[❌] - отказать в выдачи роли\`\n\`[🗑️] - удалить запрос\`\n\`[📨] - запросить статистику\``,
                inline: false
            },
        )

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`AcceptRole_${interaction.member.id}_${roleIds.join("_")}`)
                .setEmoji({ name: "✅" })
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`DeclineRole_${interaction.member.id}_${roleIds.join("_")}`)
                .setEmoji({ name: "❎" })
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`TrashRole_${interaction.member.id}_${roleIds.join("_")}`)
                .setEmoji({ name: "🗑️" })
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`StatsRole_${interaction.member.id}_${roleIds.join("_")}`)
                .setEmoji({ name: "📨" })
                .setStyle(ButtonStyle.Secondary),
        )

    await channel.send({
        content: `${targetRole.hasAccess.map(item => `<@&${item}>`).join(", ")}`,
        embeds: [embed],
        components: [buttons]
    })
        .then(async (message) => {
            await message.pin()
        })

    await interaction.reply({
        content: `\`[✅] Заявка успешно создана! Ожидайте ее рассмотрения.\``,
        ephemeral: true
    })
}

async function menuRoles(interaction){
    const roleId = interaction.values[0];

    const activeRequest = await DiscordServersRoleRequest.findOne(
        {
            userId: interaction.member.id,
            guildId: interaction.guild.id,
            active: true
        }
    );

    if (activeRequest && new Date().getTime() - activeRequest.hasSent < 24 * 60 * 60 * 1000) return await interaction.reply({
        content: "`[❌] У вас уже имеется активная заявка на выдачу роли!`",
        ephemeral: true
    })

    const selectRoleModal = new ModalBuilder()
        .setCustomId(`selectRole_${roleId}`)
        .setTitle("Запрос роли");

    const rankInput = new TextInputBuilder()
        .setCustomId("rank")
        .setLabel("Ранг во фракции:")
        .setPlaceholder("1-9")
        .setStyle(TextInputStyle.Short);

    const nickInput = new TextInputBuilder()
        .setCustomId("nick")
        .setLabel("Никнейм:")
        .setPlaceholder("Alan_Butler")
        .setStyle(TextInputStyle.Short);

    const rankActionRow = new ActionRowBuilder().addComponents(rankInput);
    const nickActionRow = new ActionRowBuilder().addComponents(nickInput);

    selectRoleModal.addComponents(rankActionRow, nickActionRow);

    await interaction.showModal(selectRoleModal);
}

function isNickNameFormat(input) {
    const regex = /^(?:[A-Z][a-z]*_?[A-Z][a-z]*|[A-Z][a-z]* [A-Z][a-z]*)$/;
    return regex.test(input);
}

function extractValues(inputString) {
    const parts = inputString.split('_');
    const firstValue = parts[1];
    const subsequentValues = parts.slice(2);
    return [firstValue, subsequentValues];
}

function hasAccessRole(member, rolesObject){
    const userRoles = member.roles.cache;

    let hasRole = false;

    rolesObject.forEach(item => {
        if (userRoles.has(item)){
            hasRole = true;
        }
    });
    if (hasRole) return true
    else return false;
}

module.exports = {requestRoles, modalRoles, menuRoles};