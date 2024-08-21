const { Client, GatewayIntentBits, Partials } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { formatTimestamp } = require('./utils.js');
const fs = require('node:fs');

if (process.argv.length != 3) {
  console.error('Usage: %s %s <bot token>', process.argv[0], process.argv[1]);
  process.exit(1);
}

const faang = ['facebook.com', 'amazon.com', 'apple.com', 'netflix.com', 'google.com'];
const dbFilename = __dirname + '/users.db';

main();

async function main() {
  fs.closeSync(fs.openSync(dbFilename, 'a'));
  const db = await new sqlite3.Database(dbFilename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
  console.log(`Database ready at ${dbFilename}`);

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
      message.reply('Run `verify <your faang email>` to begin the verification process.');
      return;
    }
    switch(args[0]) {
      case 'verify':
        const emailParts = args[1].split('@');
        if (emailParts.length != 2) return
        const domain = emailParts[1].toLowerCase();
        if (!faang.includes(domain)) {
          message.reply('Domain name is non-FAANG.');
          return;
        }
        console.log(domain);
        // add to sqlite db
        // send email with auth code
        break;
      case 'code':
        // TODO(eliasmurcray): handle auth code
        break;
      default:
        message.reply('Run `verify <your faang email>` to begin the verification process.');
    }
  });

  client.login(process.argv[2]);
}
