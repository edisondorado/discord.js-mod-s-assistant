const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require("discord.js");
const { DiscordServers } = require("../../models/model");

const doesServerExist = require("../../middleware/doesServerExist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ignore-role")
        .setDescription("Роли игнорируемые наказания")
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("Список")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Добавить")
                .addStringOption(option => option
                    .setName('arole')
                    .setDescription('ID Роли')
                    .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Удалить")
                .addStringOption(option => option
                    .setName('rrole')
                    .setDescription('ID Роли')
                    .setRequired(true)
                )
        ),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.All)) return;

        const [exist, existServer] = await doesServerExist(interaction.guild.id)
        if (!exist) return interaction.reply({content: `\`[❌] Данный дискорд сервер не инициализирован для использования функций.\``, ephemeral: true})

        let ignoreRoles;

        if (existServer.ignoreRoles && existServer.ignoreRoles.length > 30){
            ignoreRoles = existServer.ignoreRoles.slice(1, 30);
        } else {
            ignoreRoles = existServer.ignoreRoles;
        }

        if (interaction.options.getSubcommand() === "list"){
            const embed = new EmbedBuilder()
                .setTitle("Список ролей(30):")
                .setDescription(`${ !existServer.ignoreRoles || ignoreRoles.length < 1 ? "-" : ignoreRoles.map(item => `<@&${item}> \`${item}\``).join("\n")}`)
                .setColor("Random")

            await interaction.reply({
                content: "",
                embeds: [embed],
                ephemeral: true
            })
                
        } else if (interaction.options.getSubcommand() === "add"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const role = interaction.options.getString("arole");

            const doesExist = await interaction.guild.roles.cache.has(role);
            if(!doesExist) return await interaction.reply({
                content: "\`[❌] Роль с данным ID не существует!\`",
                ephemeral: true
            });

            if (server.ignoreRoles.indexOf(role) === -1){
                server.ignoreRoles.push(role);
                await server.save()
                    .then(async () => {
                        await interaction.reply({
                            content: `\`[✅] Роль была успешно добавлена в список.\``,
                            ephemeral: true
                        });
                    })
                    .catch(async error => {
                        await interaction.reply({
                            content: "\`[❌] Произошла ошибка при использовании команды!\`",
                            ephemeral: true
                        });
                        console.error("/ignore-role add: ", error);
                    })
            } else {
                await interaction.reply({
                    content: `\`[❌] Данная роль уже имеется в списке! Для удаления, воспользуйтесь командой: /ignore-role remove\``,
                    ephemeral: true
                })
            }
        } else if (interaction.options.getSubcommand() === "remove"){
            const server = await DiscordServers.findOne({ id: interaction.guild.id })
            const role = interaction.options.getString("rrole");

            if (server.ignoreRoles.indexOf(role) === -1){
                await interaction.reply({
                    content: `\`[❌] Роль с данным ID отсутствует в списке! Для просмотра списка, используйте: /ignore-role list.\``,
                    ephemeral: true
                })
            } else {
                server.ignoreRoles = server.ignoreRoles.filter(r => r !== role);;
                await server.save()
                    .then(async () => {
                        await interaction.reply({
                            content: `\`[✅] Роль была успешно удалена.\``,
                            ephemeral: true
                        });
                    })
                    .catch(async error => {
                        await interaction.reply({
                            content: "\`[❌] Произошла ошибка при удалении команды!\`",
                            ephemeral: true
                        });
                        console.error("/ignore-role remove: ", error);
                    })
            }
        }
    }
}