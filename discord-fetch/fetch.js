const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const announceChannelId = process.env.ANNOUNCE_CHANNEL_ID;
const activityChannelId = process.env.ACTIVITY_CHANNEL_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

async function gather() {
  try {
    await client.login(token);
    console.log('✅ Бот вошёл в Discord');

    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch({ withPresences: true });
    console.log(`🌐 Сервер: ${guild.name}`);

    const totalMembers = guild.memberCount;
    const onlineCount = guild.members.cache.filter(m => ['online','idle','dnd'].includes(m.presence?.status)).size;
    const voiceCount = guild.voiceStates.cache.size;

    // --- Сообщения канала объявлений ---
    let messages = [];
    if (announceChannelId) {
      try {
        console.log('🔔 Проверка канала объявлений:', announceChannelId);
        const channel = await client.channels.fetch(announceChannelId);
        console.log('Канал объявлений найден:', channel.name);

        if (channel.isTextBased()) {
          const fetched = await channel.messages.fetch({ limit: 5 });
          console.log('Количество сообщений в объявлении:', fetched.size);

          messages = fetched.map(m => ({
            author: m.author.username,
            avatar: m.author.displayAvatarURL(),
            content: m.content,
            time: m.createdAt.toISOString(),
            attachments: Array.from(m.attachments.values()).map(a => ({
              url: a.url,
              contentType: a.contentType
            }))
          }));
        }
      } catch (err) {
        console.error('Ошибка получения сообщений объявлений:', err.message);
      }
    } else {
      console.warn('⚠️ ANNOUNCE_CHANNEL_ID не задан');
    }

    // --- Последнее сообщение из приватного канала активности ---
    let activityMessage = null;
    let activityStatus = 'Нет данных';
    if (activityChannelId) {
      try {
        console.log('🎯 Проверка канала активности:', activityChannelId);
        const activityChannel = await client.channels.fetch(activityChannelId);
        console.log('Канал активности найден:', activityChannel.name);

        if (activityChannel.isTextBased()) {
          const lastMsg = await activityChannel.messages.fetch({ limit: 1 });
          console.log('Количество сообщений в активности:', lastMsg.size);

          const msg = lastMsg.first();
          console.log('Объект последнего сообщения:', msg);

          if (msg) {
            activityMessage = msg.content || null;
            activityStatus = msg.content ? msg.content : 'Сообщение без текста';
            console.log('Содержимое активности:', activityMessage);
          } else {
            activityStatus = 'В канале активности нет сообщений или бот не имеет доступа';
            console.log('⚠️', activityStatus);
          }
        }
      } catch (err) {
        activityStatus = 'Ошибка доступа к каналу активности';
        console.error('Ошибка получения активности:', err.message);
      }
    } else {
      console.warn('⚠️ ACTIVITY_CHANNEL_ID не задан');
      activityStatus = 'ACTIVITY_CHANNEL_ID не задан';
    }

    // --- Сбор всех данных ---
    const out = {
      updated_at: new Date().toISOString(),
      totalMembers,
      onlineCount,
      voiceCount,
      messages,
      activityMessage,
      activityStatus
    };

    fs.writeFileSync('../data.json', JSON.stringify(out, null, 2));
    console.log('✅ data.json обновлён');

    await client.destroy();
    process.exit(0);

  } catch (err) {
    console.error('Ошибка в gather():', err);
    process.exit(1);
  }
}

gather();
