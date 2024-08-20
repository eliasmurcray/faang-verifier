const { Client, GatewayIntentBits, Partials } = require('discord.js');
// lol
const whitelist = ['facebook.com', 'amazon.com', 'apple.com', 'netflix.com', 'google.com'];
function formatTimestamp(timestamp) {
  const pad = v => `0${v}`.slice(-2);
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
if (process.argv.length != 3) {
  console.error('Usage: %s %s <bot token>', process.argv[0], process.argv[1]);
  process.exit(1);
}
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});
client.on('ready', (...args) => {
  console.log(`Logged in as ${client.user.tag}`);
});
client.on('messageCreate', (message) => {
  if (!message.channel.isDMBased() || message.author.bot) return;
  const formattedTimestamp = formatTimestamp(message.createdTimestamp);
  console.log(`[${formattedTimestamp}] ${message.author.username}: ${message.content}`);
  const args = message.content.split(' ');
  if (args.length != 2) {
    message.reply('Run `verify <faang email>` to begin the verification process.');
    return;
  }
  switch(args[0]) {
    case 'verify':
      const emailParts = args[1].split('@');
      if (emailParts.length != 2) return
      const domain = emailParts[1].toLowerCase();
      if (!whitelist.includes(domain)) return;
      console.log(domain);
      // send email with auth code
      // add to sqlite db
      break;
    case 'code':
      // TODO(eliasmurcray): handle auth code
      break;
    default:
      message.reply('Run `verify <faang email>` to begin the verification process.');
  }
});
client.login(process.argv[2]);
