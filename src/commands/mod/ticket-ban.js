const ms = require("ms");
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");

const { DiscordServers, DiscordServersTicketBan } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");

const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticketban")
        .setDescription("Заблокировать доступ к тикетам")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которому необходимо выдать заблокировать доступ")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("время")
                .setDescription("5 s/m/h/d")
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("причина")
                .setDescription("-")
                .setRequired(true)),
    async execute(interaction){
        const server = await DiscordServers.findOne({ id: interaction.guild.id })
        if (!server) return await interaction.reply({
            content: "\`[❌] Сервер отсутствует в базе данных!\`",
            ephemeral: true
        })

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["ticketban"]);
        if (!isMod) return;

        var target;
        var onServer = false;
        if (interaction.options.getMember("пользователь") !== null) {
            target = interaction.options.getMember("пользователь");
            onServer = true;
        }
        else target = interaction.options.getUser("пользователь");

        const time = interaction.options.getString("время");
        const reason = interaction.options.getString("причина");
        const formattedDuration = ms(time);
        const maxDuration = ms("28 days");

        if (onServer){    
            if (target.permissions.has(PermissionsBitField.All)) return await interaction.reply({
                content: "\`[❌] Вы не можете использовать это на данном пользователе!\`",
                ephemeral: true
            })
            
            if (interaction.member.id === target.id){
                return interaction.reply({
                    content: "\`[❌] Вы не можете использовать это на себе!\`",
                    ephemeral: true
                })
            }
    
            if (interaction.client.id === target.id){
                return interaction.reply({
                    content: "\`[❌] Вы не можете использовать это на мне!\`",
                    ephemeral: true
                })
            }
        }

        if (formattedDuration > maxDuration){
            return interaction.reply({
                content: "\`[❌] Время должно быть 28 дней или меньше!\`",
                ephemeral: true
            })
        }

        await DiscordServersTicketBan.create({
            guildId: interaction.guild.id,
            userId: target.id,
            mod: interaction.member.id,
            reason: reason,
            expiresOn: new Date().getTime() + formattedDuration,
        })

        await interaction.reply({
            content: "\`[✅] Пользователю успешно выдана блокировка!\`", 
            ephemeral: true
        });

        await logFunction(interaction.client, "ticketban", interaction.guild.id, target.id, interaction.member.id, reason, time);
    }
}