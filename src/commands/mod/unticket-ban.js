const { SlashCommandBuilder,  PermissionsBitField } = require("discord.js");
const { DiscordServers, DiscordServersTicketBan } = require("../../models/model");

const isUserMod = require("../../middleware/isUserMod");

const logFunction = require("../../log/logs");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unticketban")
        .setDescription("Восстановить доступ к тикетам")
        .addUserOption(option => 
            option
                .setName("пользователь")
                .setDescription("Пользователь, которому необходимо восстановить доступ")
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

        const isMod = await isUserMod(interaction.guild.id, interaction.member, server["unticketban"]);
        if (!isMod) return;

        var target;
        var onServer = false;
        if (interaction.options.getMember("пользователь") !== null) {
            target = interaction.options.getMember("пользователь");
            onServer = true;
        }
        else target = interaction.options.getUser("пользователь");

        const reason = interaction.options.getString("причина");

        const currentTimeInMillis = new Date().getTime();
        const hasBlock = await DiscordServersTicketBan.findOne({ guildId: interaction.guild.id, userId: target.id, expiresOn: { $gt: currentTimeInMillis } })
        if (!hasBlock) return await interaction.reply({
            content: "\`[❌] У пользователя отсутствует активная блокировка тикетов.\`",
            ephemeral: true
        })

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

        await DiscordServersTicketBan.findOneAndDelete({
            guildId: interaction.guild.id, 
            userId: target.id
        })

        await interaction.reply({
            content: "\`[✅] Пользователю успешно снята блокировка!\`", 
            ephemeral: true
        });
        await logFunction(interaction.client, "unticketban", interaction.guild.id, target.id, interaction.member.id, reason);
    }
}