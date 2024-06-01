const { Events } = require("discord.js");
const { DiscordServers } = require("../models/model");
const ini = require('../config/bot.json');

const isUserMod = require("../middleware/isUserMod");

const { ActionInteractionButton, ActionInteractionModal } = require("./systems/ActionInteraction");
const { SettingsInteractionButtons } = require("./systems/SettingsInteraction");
const createEmbed = require("./systems/CreateEmbed");
const editEmbed = require("./systems/EditEmbed");
const moderationButtons = require("./systems/ModerationButtons");
const {requestRoles, modalRoles, menuRoles} = require("./systems/RequestRoles");
const CreateTicketWindow = require("./systems/CreateTicketWindow");
const { CreateTicket, AcceptTicket, CloseTicket } = require("./systems/CreateTicket");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const isMod = await isUserMod(interaction.guild.id, interaction.member);

        if (interaction.customId && interaction.customId.startsWith("SettingsServer_")) return await SettingsInteractionButtons(interaction);

        if (interaction.isButton()){
            if (interaction.customId.startsWith("TicketButton")) return await CreateTicket(interaction);
            if (interaction.customId.startsWith("TakeTicket_")) return await AcceptTicket(interaction);
            if (interaction.customId.startsWith("CloseTicket_")) return await CloseTicket(interaction);

            if (interaction.customId.startsWith("deleteNotify_") || interaction.customId.startsWith("acceptVoteBan_") || interaction.customId.startsWith("declineVoteBan_")) return await moderationButtons(interaction);

            if (interaction.customId === "displayError" && interaction.member.id === ini.bot.dev){
                await interaction.channel.send(`Ошибка: ${error}`);
            }

            if (interaction.customId === "resetRoles") {
                const server = await DiscordServers.findOne({ id: interaction.guild.id });
                if (!server) return;

                var anythingRemoved = false;

                for (const role of server.request_role) {
                    for (const item of role.roleId) {
                        if (interaction.member.roles.cache.has(item)) {
                            anythingRemoved = true;
                            await interaction.member.roles.remove(item);
                        }
                    }
                }

                if (anythingRemoved) {
                    await interaction.reply({
                        content: `\`[✅] Роли были успешно удалены!\``,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `\`[❌] Отсутствуют роли, которые можно снять!\``,
                        ephemeral: true
                    });
                }
            }

            if (
                interaction.customId.startsWith("AcceptRole_") ||
                interaction.customId.startsWith("DeclineRole_") ||
                interaction.customId.startsWith("TrashRole_") ||
                interaction.customId.startsWith("StatsRole_")
            ) return await requestRoles(interaction);

            if (interaction.customId.startsWith("Action_") && isMod) return await ActionInteractionButton(interaction);
        }

        if (interaction.isModalSubmit()){
            if (interaction.customId === "CreateTicket") return await CreateTicketWindow(interaction);
            if (interaction.customId === "createEmbed") return await createEmbed(interaction);
            if (interaction.customId.startsWith("editEmbed_")) return await editEmbed(interaction);
            if (interaction.customId.startsWith("Action_") && isMod) return await ActionInteractionModal(interaction);
            if (interaction.customId.startsWith("selectRole_")) return await modalRoles(interaction);

            if (interaction.customId.startsWith("Report_")){
                const targetId = interaction.customId.split("_").pop();
                const server = await DiscordServers.findOne({ id: interaction.guild.id })
                if (!server.reportChannel) return await interaction.reply({
                    content: `\`[❌] Произошла ошибка при репорте пользователя, сообщите об этом модерации.\``,
                    ephemeral: true
                })

                const channel = interaction.guild.channels.get(server.reportChannel);
                if (!channel) return await interaction.reply({
                    content: `\`[❌] Произошла ошибка при репорте пользователя, сообщите об этом модерации.\``,
                    ephemeral: true
                })

                const reason = interaction.fields.getTextInputValue("reasonReport");

                const embed = {
                    title: `🚫 | Репорт пользователя`,
                    fields: [
                        {
                            name: `**📩 | Отправил:**`,
                            value: `<@${interaction.member.id}>`,
                            inline: true,
                        },
                        {
                            name: `**🔨 | Цель:**`,
                            value: `<@${targetId}>`,
                            inline: true,
                        },
                        {
                            name: `**❓ | Причина:**`,
                            reason: reason,
                            inline: true
                        }
                    ]
                }

                await channel.send({
                    content: "",
                    embeds: [embed]
                })
            }
        }

        if (interaction.isStringSelectMenu()){
            if (interaction.customId === "selectRole") return await menuRoles(interaction);
        }

        if (interaction.isChatInputCommand()){
            const command = interaction.client.commands.get(interaction.commandName);
            try{
                await command.execute(interaction)
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: '\`[❌] Произошла ошибка во время использования команды!\`', ephemeral: true });
                } else {
                    await interaction.reply({ content: '\`[❌] Произошла ошибка во время использования команды!\`', ephemeral: true });
                }
            }
        }
    }
};