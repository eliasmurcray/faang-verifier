import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import * as sqlite3 from 'sqlite3';
import { createTransport } from 'nodemailer';
import { formatTimestamp, generateVerificationCode } from './utils';
import { closeSync, openSync } from 'node:fs';

if (process.argv.length != 4) {
  console.error('Usage: %s %s <bot token> <gmail password>', process.argv[0], process.argv[1]);
  process.exit(1);
}

type User = {
  id?: string;
  email?: string;
  status?: number;
  code?: string;
  created_at?: string;
};

enum UserStatus {
  UNVERIFIED = 0,
  VERIFIED = 1,
  BANNED = 2,
};

const getUser = async (db: sqlite3.Database, id: string): Promise<User | null> => {
  return new Promise((resolve) => {
    db.get('SELECT * from users WHERE id = ?1', [id], (err: Error | null, row: User | null) => {
      if (err) {
        console.error(err);
        resolve(null);
        return;
      }
      resolve(row);
    });
  });
};

const faang = ['facebook.com', 'amazon.com', 'apple.com', 'netflix.com', 'google.com'];
const dbFilename = __dirname + '/users.db';
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status INTEGER NOT NULL,
  code TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;
const addUser = `
INSERT INTO  users (id, email, status, code, created_at)
  VALUES(?1, ?2, 0, ?3, ?4)
  ON CONFLICT(id) DO UPDATE SET
    email=excluded.email,
    status=excluded.status,
    code=excluded.code,
    created_at=excluded.created_at
  WHERE excluded.created_at > users.created_at`;

main();

async function main() {
  closeSync(openSync(dbFilename, 'a'));
  const db = await new sqlite3.Database(dbFilename, sqlite3.OPEN_READWRITE, (err: Error | null) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
  });
  console.log(`Database successfully initialized at ${dbFilename}`);
  console.log('Creating \'users\' table...');
  await new Promise<void>((resolve) => {
    db.run(createUsersTable, [], (err: Error | null) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      resolve();
    });
  });
  console.log('Table \'users\' created successfully');

  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'faangverifier@gmail.com',
      pass: process.argv[3],
    },
  });

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
    partials: [Partials.Channel],
  });

  client.on(Events.ClientReady, () => {
    if (client.user === null) {
      console.error('Client failed to initialize, user is null');
      process.exit(1);
    }
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (!message.channel.isDMBased() || message.author.bot) return;
    const user = await getUser(db, message.author.id);
    if (user && user.status === UserStatus.BANNED) return;
    const formattedTimestamp = formatTimestamp(+message.createdTimestamp);
    console.log(`\x1b[33m<Message>\x1b[0m [${formattedTimestamp}] ${message.author.username} (${message.author.id}): ${message.content}`);
    const args = message.content.split(' ');
    if (args.length != 2 || !args[0] || !args[1]) {
      message.reply('Run `verify <your faang email>` to begin the verification process.');
      return;
    }
    switch(args[0]) {
      case 'verify':
        const emailParts = args[1].split('@');
        if (emailParts.length != 2 || !emailParts[0] || !emailParts[1]) return;
        const domain = emailParts[1].toLowerCase();
        if (!faang.includes(domain) && 0) {
          message.reply(`Domain name '${domain}' not in whitelist.`);
          return;
        }

        const id = message.author.id;
        const email = args[1];
        const code = generateVerificationCode();
        const createdAt = Date.now().toString();
        db.run(addUser, [id, email, code, createdAt], (err: Error | null) => {
          if (err) {
            message.reply('Internal server error (0)');
            console.error(`Error inserting user '${id}': ${err}`);
            return;
          }
          transporter.sendMail({
            to: args[1],
            subject: 'Verify Your Email For "FAANG Interns and New Grads"',
            html: `Please use the following verification code for "FAANG Interns and New Grads":<br>${code}`,
          }).then(() => {
            message.reply(`Sent a verification code to ${email}. Run \`submit <code>\` to verify your account.`);
          }).catch((err: Error) => {
            message.reply('Internal server error (1)');
            console.error(`Error sending email '${email}': ${err}`);
          });
        });
        break;
      case 'submit':
        
        break;
      default:
        message.reply('Run `verify <your faang email>` to begin the verification process.');
    }
  });

  client.login(process.argv[2]);
}
