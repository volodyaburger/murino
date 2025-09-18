const fs = require('fs');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const announceChannelId = process.env.ANNOUNCE_CHANNEL_ID;

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

    const totalMembers = guild.memberCount;
    const onlineCount = guild.members.cache.filter(m => ['online','idle','dnd'].includes(m.presence?.status)).size;
    const voiceCount = guild.voiceStates.cache.size;

    // Сообщения канала объявлений
    let messages = [];
    if (announceChannelId) {
      try {
        const channel = await client.channels.fetch(announceChannelId);
        if (channel.isTextBased()) {
          const fetched = await channel.messages.fetch({ limit: 5 });
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
    }

    const out = {
      updated_at: new Date().toISOString(),
      totalMembers,
      onlineCount,
      voiceCount,
      messages
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
