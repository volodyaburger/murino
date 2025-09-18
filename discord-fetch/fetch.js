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
  await client.login(token);

  const guild = await client.guilds.fetch(guildId);
  await guild.members.fetch();

const totalMembers = guild.memberCount;

const onlineCount = guild.members.cache.filter(
  m => m.presence?.status && m.presence.status !== 'offline'
).size;

const voiceCount = guild.channels.cache
  .filter(ch => ch.isVoiceBased())
  .reduce((acc, ch) => acc + ch.members.size, 0);


  let messages = [];
  if (announceChannelId) {
    const channel = await client.channels.fetch(announceChannelId);
    if (channel.isTextBased()) {
      const fetched = await channel.messages.fetch({ limit: 5 });
      messages = fetched.map(m => ({
        author: m.author.username,
        avatar: m.author.displayAvatarURL(),
        content: m.content,
        time: m.createdAt.toISOString()
        attachments: m.attachments.map(a => ({ url: a.url, contentType: a.contentType }))
      }));
    }
  }

  const out = { updated_at: new Date().toISOString(), totalMembers, onlineCount, voiceCount, messages };
  fs.writeFileSync('../data.json', JSON.stringify(out, null, 2));
  console.log("data.json updated");
  await client.destroy();
  process.exit(0);
}

gather().catch(console.error);
