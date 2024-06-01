const fs = require('fs');

const embedHelp = [
    "/embed help - отобразить это сообщение",
    "/embed reset - сбросить embed",
    "/embed preview - предпросмотр сообщения, с отображением названий пунктов",
    "/embed send - отправить сообщение содержащие embed",
    "/embed read [message url] - считать embed из сообщения по ссылке",
    "/embed set",
    "       color [hex color] - установить цвет(пример: #ff00ff, без \"#\")",
    "       title [title] - установить заголовок (без форматирования)",
    "       description [description] - установить описание (с форматированием)",
    "       image/thumbnail [image url] - установить изображение/миниатюру",
    "       url [url] - установить ссылку",
    " ", 
    "       footer",
    "               text [text] - установить текст нижнего колонтитула",
    "               icon [image url] - установить изображение нижнего колонтитула",
    " ",
    "       author",
    "               name [name] - установить имя автора",
    "               icon [image url] - установить изображение автора",
    "               url [url] - установить ссылку автора",
    "/embed add",
    "       timestamp - добавить timestamp с текущим временем",
    "       field - добавить поле в embed (интерактивная команда)",
    "/embed edit [url] - изменить существующее сообщение",
    "       field [id] - изменить поле под номером id, см. /embed preview",
    "/embed remove [point] - удалить пункт, см. /embed preview",
    "/embed remove field [id] - удалить поле под номером id, см. /embed preview');",
]

async function embed(message){
    const guildId = message.guild.id;
    const args = message.content.split(' ');
    if (!args) return;
    const command = args.shift().toLowerCase();
    if (!command) return;

    switch (command) {
        case '/embed':
            const subcommand = args.shift().toLowerCase();
            switch (subcommand) {
                case 'help':
                    await message.channel.send(`\`\`\`\n${embedHelp.map(item => item).join("\n")}\n\`\`\``);
                    break;
                case 'reset':
                    const embed = {
                        color: 0x0099ff,
                        title: 'Титульное название',
                        description: 'Описание окна',
                        fields: [
                            {
                                name: 'Первое название',
                                value: 'Первое значение'
                            },
                            {
                                name: 'Второе название',
                                value: 'Второе значение'
                            },
                            {
                                name: 'Третье название',
                                value: 'Третье значение'
                            },
                            {
                                name: 'Четвертое название',
                                value: 'Четвертое значение'
                            },
                        ],
                        image: {
                            url: 'https://images-ext-1.discordapp.net/external/7p4hstADylDV-9Jbibp--CX8J1Uzel5ZRq71sQ8sKp0/https/png.pngtree.com/thumb_back/fw800/background/20230825/pngtree-mountain-landscape-with-forest-and-clouds-in-the-sky-2d-game-image_13246437.jpg?format=webp&width=863&height=485',
                        },
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: 'Какой-то нижний колонтитул'
                        },
                    };
        
                    await saveEmbed(guildId, embed);
        
                    await message.channel.send("**Embed-окно было успешно сброшено.**")
                    break;
                case 'preview':
                    var [result, savedEmbed] = await loadEmbed(guildId);
                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                    if (savedEmbed.title) savedEmbed.title = `[title] ${savedEmbed.title}`
                    if (savedEmbed.description) savedEmbed.description = `[description] ${savedEmbed.description}`
                    if (savedEmbed.fields) {
                        savedEmbed.fields.forEach((item, index) => {
                            savedEmbed.fields[index].name = `[${index}] [field][name] ${item.name}`
                            savedEmbed.fields[index].value = `[${index}] [field][value] ${item.value}`
                        })
                    }
                    if (savedEmbed.footer) {
                        if (savedEmbed.footer.text) savedEmbed.footer.text = `[footer][text] ${savedEmbed.footer.text}`
                    }

                    await message.channel.send({
                        content: "",
                        embeds: [savedEmbed]
                    })
                    break;
                case 'send':
                    var [result, savedEmbed] = await loadEmbed(guildId);
                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                    await message.channel.send({
                        content: "",
                        embeds: [savedEmbed]
                    })
                    break;
                case 'read':
                    const messageUrl = args.shift();
                    if (!messageUrl) return;
                    const embedFromUrl = await getEmbedFromUrl(message, messageUrl);
                    if (!embedFromUrl) return await message.channel.send("**Не удалось загрузить embed по ссылке.**");
                    await saveEmbed(guildId, embedFromUrl);
        
                    await message.channel.send("**Embed-окно было успешно загружено из ссылки.**")
                    break;
                case 'set':
                    const subsubcommand = args.shift().toLowerCase();
                    switch (subsubcommand) {
                        case 'color':
                            const color = args.shift();
                            if (!color) return;
                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                            
                            savedEmbed.color = parseInt(color, 16);

                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Цвет успешно изменен.**`)
                            break;
                        case 'title':
                            const title = args.join(' ');
                            if (!title) return;

                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                            savedEmbed.title = title;
                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Заголовок успешно изменен.**`)
                            break;
                        case 'description':
                            const description = args.join(' ');
                            if (!description) return;

                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                            savedEmbed.description = description;
                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Описание успешно изменено.**`)
                            break;
                        case 'image':
                            const image = args.shift();
                            if (!image) return;

                            if (!image.startsWith("http")) return message.channel.send("**Используйте прямую ссылку на изображение.**")
                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                            
                            savedEmbed.image = {}
                            savedEmbed.image.url = image

                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Картинка успешно изменена.**`)
                            break;
                        case 'thumbnail':
                            const thumbnail = args.shift();
                            if (!thumbnail) return;

                            if (!thumbnail.startsWith("http")) return message.channel.send("**Используйте прямую ссылку на изображение.**")
                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                            
                            savedEmbed.thumbnail = {}
                            savedEmbed.thumbnail.url = thumbnail

                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Превью-картинка успешно изменена.**`)
                            break;
                        case 'url':
                            const url = args.shift();
                            if (!url) return;

                            if (!url.startsWith("http")) return message.channel.send("**Полученое значение не является ссылкой.**")
                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                            
                            savedEmbed.url = url

                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Ссылка успешно изменена.**`)
                            break;
                        case "footer":
                            const subsubsubcommand = args.shift().toLowerCase();
                            switch(subsubsubcommand){
                                case "text":
                                    const text = args.join(' ');
                                    if (!text) return;
                                    var [result, savedEmbed] = await loadEmbed(guildId);
                                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                                    if (savedEmbed.footer){
                                        savedEmbed.footer.text = text;
                                    } else {
                                        savedEmbed.footer = {};
                                        savedEmbed.footer.text = text;
                                    }

                                    await saveEmbed(guildId, savedEmbed);

                                    message.channel.send(`**Текст нижнего колонтитула успешно изменен.**`)
                                    break;
                                case "icon":
                                    const icon = args.shift();
                                    if (!icon) return;
        
                                    if (!icon.startsWith("http")) return message.channel.send("**Используйте прямую ссылку на изображение.**")
                                    var [result, savedEmbed] = await loadEmbed(guildId);
                                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                                    if (savedEmbed.footer){
                                        savedEmbed.footer.icon_url = icon;
                                    } else {
                                        savedEmbed.footer = {};
                                        savedEmbed.footer.icon_url = icon;
                                    }

                                    await saveEmbed(guildId, savedEmbed);

                                    message.channel.send(`**Изображение нижнего колонтитула успешно изменено.**`)
                                    break;
                                default:
                                    message.channel.send('**Неизвестная подкоманда для "/embed set footer"**');
                            }
                        case "author":
                            const subsubsubsubcommand = args.shift().toLowerCase();
                            switch(subsubsubsubcommand){
                                case "name":
                                    const name = args.join(' ');
                                    if (!name) return;
                                    var [result, savedEmbed] = await loadEmbed(guildId);
                                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")
                                    if (savedEmbed.author){
                                        savedEmbed.author.name = name;
                                    } else {
                                        savedEmbed.author = {};
                                        savedEmbed.author.name = name;
                                    }

                                    await saveEmbed(guildId, savedEmbed);

                                    message.channel.send(`**Имя автора успешно изменено.**`)
                                    break;
                                case "icon":
                                    const icon = args.shift();
                                    if (!icon) return;
        
                                    if (!icon.startsWith("http")) return message.channel.send("**Используйте прямую ссылку на изображение.**")
                                    var [result, savedEmbed] = await loadEmbed(guildId);
                                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                                    if (savedEmbed.author){
                                        savedEmbed.author.icon_url = icon;
                                    } else {
                                        savedEmbed.author = {};
                                        savedEmbed.author.icon_url = icon;
                                    }

                                    await saveEmbed(guildId, savedEmbed);

                                    message.channel.send(`**Изображение автора успешно изменено.**`)
                                    break;
                                case "url":
                                    const url = args.shift();
                                    if (!url) return;
        
                                    if (!url.startsWith("http")) return message.channel.send("**Полученое значение не является ссылкой.**")
                                    var [result, savedEmbed] = await loadEmbed(guildId);
                                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                                    if (savedEmbed.author){
                                        savedEmbed.author.url = icon;
                                    } else {
                                        savedEmbed.author = {};
                                        savedEmbed.author.url = icon;
                                    }

                                    await saveEmbed(guildId, savedEmbed);

                                    message.channel.send(`**Ссылка на автора успешно изменена.**`)
                                    break;
                                default:
                                    message.channel.send('**Неизвестная подкоманда для "/embed set author"**');
                            }
                        default:
                            message.channel.send('**Неизвестная подкоманда для "/embed set"**');
                    }
                    break;
                case 'add':
                    const addSubcommand = args.shift().toLowerCase();
                    switch (addSubcommand) {
                        case 'timestamp':
                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                            savedEmbed.timestamp = new Date().toISOString(),

                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**Timestamp успешно обновлен.**`)
                            break;
                        case 'field':
                            var [result, savedEmbed] = await loadEmbed(guildId);
                            if (!result) return await message.reply("**Отсутствует загруженный embed.**");

                            var newField = {};

                            var sentMessage = await message.channel.send(`**Введите название поля**`);
                            const collectorName = message.channel.createMessageCollector({ time: 30_000 });

                            collectorName.on('collect', async m => {
                                newField.name = m.content;
                                await m.delete(1);
                                await sentMessage.delete(1);
                                collectorName.stop();
                            });

                            collectorName.on('end', async collected => {
                                var sentValueMessage = await message.channel.send(`**Введите значение для поля "${newField.name}"**`);
                                const collectorValue = message.channel.createMessageCollector({ time: 30_000 });

                                collectorValue.on('collect', async m => {
                                    newField.value = m.content;
                                    await m.delete(1);
                                    await sentValueMessage.delete(1);

                                    collectorValue.stop();
                                });

                                collectorValue.on('end', async collected => {
                                    var sentInlineMessage = await message.channel.send(`**Установить это поле в одной строке (inline)? Ответьте "Да" или "Нет".**`);
                                    const collectorInline = message.channel.createMessageCollector({ time: 30_000 });

                                    collectorInline.on('collect', async m => {
                                        const response = m.content.toLowerCase();
                                        if (response === 'да') {
                                            newField.inline = true;
                                        } else if (response === 'нет') {
                                            newField.inline = false;
                                        } else {
                                            await m.delete(1);
                                            await m.channel.send("**Пожалуйста, ответьте 'Да' или 'Нет'.**");
                                            return;
                                        }
                                        await m.delete(1)
                                        await sentInlineMessage.delete(1);

                                        if (!newField.name || !newField.value) return message.channel.send("**Одно из значений не было предоставлено.**");
                                        if (savedEmbed.fields){
                                            savedEmbed.fields.push(newField)
                                        } else {
                                            savedEmbed.fields = [newField]
                                        }

                                        await saveEmbed(guildId, savedEmbed);

                                        message.channel.send(`**Новое поле успешно добавлено.**`)
                                        collectorInline.stop();
                                    });
                                });
                            });
                            break;
                        default:
                            message.channel.send('Неизвестная подкоманда для "/embed add"');
                    }
                    break;
                case 'edit':
                    
                    const messageUrlToEdit = args.shift();
                    if (!messageUrlToEdit) return;
                    var [result, savedEmbed] = await loadEmbed(guildId);
                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                    switch(messageUrlToEdit){
                        case "field":
                            const fieldToEdit = args.shift().toLowerCase();
                            if (!fieldToEdit) return;

                            if (!savedEmbed.fields[fieldToEdit]) return message.channel.send(`**Поле под номером ${fieldToEdit} не существует.**`)

                            var newField = {};

                            var sentMessage = await message.channel.send(`**Введите название поля**`);
                            const collectorName = message.channel.createMessageCollector({ time: 30_000 });

                            collectorName.on('collect', async m => {
                                newField.name = m.content;
                                await m.delete(1);
                                await sentMessage.delete(1);
                                collectorName.stop();
                            });

                            collectorName.on('end', async collected => {
                                var sentValueMessage = await message.channel.send(`**Введите значение для поля "${newField.name}"**`);
                                const collectorValue = message.channel.createMessageCollector({ time: 30_000 });

                                collectorValue.on('collect', async m => {
                                    newField.value = m.content;
                                    await m.delete(1);
                                    await sentValueMessage.delete(1);

                                    collectorValue.stop();
                                });

                                collectorValue.on('end', async collected => {
                                    var sentInlineMessage = await message.channel.send(`**Установить это поле в одной строке (inline)? Ответьте "Да" или "Нет".**`);
                                    const collectorInline = message.channel.createMessageCollector({ time: 30_000 });

                                    collectorInline.on('collect', async m => {
                                        const response = m.content.toLowerCase();
                                        if (response === 'да') {
                                            newField.inline = true;
                                        } else if (response === 'нет') {
                                            newField.inline = false;
                                        } else {
                                            await m.delete(1);
                                            await m.channel.send("**Пожалуйста, ответьте 'Да' или 'Нет'.**");
                                            return;
                                        }
                                        await m.delete(1)
                                        await sentInlineMessage.delete(1);

                                        if (!newField.name || !newField.value) return message.channel.send("**Одно из значений не было предоставлено.**");
                                        savedEmbed.fields[fieldToEdit] = newField

                                        await saveEmbed(guildId, savedEmbed);

                                        message.channel.send(`**Поле успешно отредактировано.**`)
                                        collectorInline.stop();
                                    });
                                });
                            });
                            break;
                        default:
                            const parts = messageUrlToEdit.split('/');
                            const guildInLink = parts[parts.indexOf('channels') + 1];
                            const channelId = parts[parts.indexOf('channels') + 2];
                            const messageId = parts[parts.length - 1];

                            if (guildInLink !== message.guild.id) return await message.channel.send("**Невозможно найти Embed из другого Discord сервера.**");;

                            const channel = await message.guild.channels.fetch(channelId);
                            if (!channel) return await message.channel.send("**Не удалось загрузить embed по ссылке. Канал не существует.**");;

                            const messageEmbed = await channel.messages.fetch(messageId);
                            if (!messageEmbed) return await message.channel.send("**Не удалось загрузить embed по ссылке. Сообщение не существует.**");;

                            if (messageEmbed.author.id !== message.client.user.id) return await message.channel.send("**Вы выбрали сообщение к которому у меня нет доступа.**")


                            await messageEmbed.edit({ embeds: [savedEmbed] })
                
                            await message.channel.send("**Embed-окно по ссылке было успешно отредактировано.**")
                    }
                    break;
                case 'remove':
                    const pointToRemove = args.shift().toLowerCase();
                    var [result, savedEmbed] = await loadEmbed(guildId);
                    if (!result) return await message.reply("**Отсутствует загруженный embed.**")

                    switch(pointToRemove){
                        case "field":
                            const fieldToRemove = args.shift().toLowerCase();
                            if (!savedEmbed.fields[fieldToRemove]) return message.channel.send(`**Поле под номером ${fieldToRemove} не существует.**`)

                            delete savedEmbed.fields.splice(fieldToRemove, fieldToRemove+1);
                        
                            await saveEmbed(guildId, savedEmbed);
                            message.channel.send(`**Поле под номером ${fieldToRemove} успешно удалено.**`)
                            break;
                        default:
                            if (!savedEmbed[pointToRemove]) return message.channel.send()
                            delete savedEmbed[pointToRemove]

                            await saveEmbed(guildId, savedEmbed);

                            message.channel.send(`**${pointToRemove} успешно удалено.**`)

                    }
                    break;
                default:
                    message.channel.send('Неизвестная подкоманда для "/embed"');
            }
            break;
        default:
            message.channel.send('Неизвестная команда');
    }
}

async function getEmbedFromUrl(message, url) {
    const parts = url.split('/');
    const guildId = parts[parts.indexOf('channels') + 1];
    const channelId = parts[parts.indexOf('channels') + 2];
    const messageId = parts[parts.length - 1];

    if (guildId !== message.guild.id) return null;

    const channel = await message.guild.channels.fetch(channelId);
    if (!channel) return null;

    const messageEmbed = await channel.messages.fetch(messageId);
    if (!messageEmbed) return null;

    return messageEmbed.embeds.length > 0 ? messageEmbed.embeds[0] : null;
}

async function saveEmbed(guildId, data){
    fs.writeFileSync(`${guildId}.json`, JSON.stringify(data));
}

async function loadEmbed(guildId){
    try {
        const data = JSON.parse(fs.readFileSync(`${guildId}.json`));
        return [true, data]
    } catch (error) {
        console.log(error);
        return [false, null]
    }
}

module.exports = embed;