import { Client, Collection, GatewayIntentBits, Partials, Events, REST, Routes, ChatInputCommandInteraction, SlashCommandBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import * as sqlite3 from 'sqlite3';
import { createTransport } from 'nodemailer';
import { formatTimestamp, generateVerificationCode } from './utils';
import { closeSync, openSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (process.argv.length != 4) {
  console.error('Usage: %s %s <bot token> <gmail password>', process.argv[0], process.argv[1]);
  process.exit(1);
}

type Command = {
  execute: (arg0: ChatInputCommandInteraction, arg1: sqlite3.Database) => Promise<void>;
  data: SlashCommandBuilder;
};

type User = {
  id: string;
  email: string;
  status: number;
  code: string;
  created_at: string;
};

enum UserStatus {
  UNVERIFIED = 0,
  VERIFIED = 1,
  BANNED = 2,
};

const getUserById = async (db: sqlite3.Database, id: string): Promise<User | null> => {
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

const getUserByEmail = async (db: sqlite3.Database, email: string): Promise<User | null> => {
  return new Promise((resolve) => {
    db.get('SELECT * from users WHERE email = ?1', [email], (err: Error | null, row: User | null) => {
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
const upsertUser = `
INSERT INTO  users (id, email, status, code, created_at)
  VALUES(?1, ?2, ?3, ?4, ?5)
  ON CONFLICT(id) DO UPDATE SET
    email=excluded.email,
    status=excluded.status,
    code=excluded.code,
    created_at=excluded.created_at
  WHERE TRUE`;

const welcomeMessage = `Congratulations! 🎉

You've been successfully verified. You now have access to all the features and channels available to verified users.

If you need any help or have questions, feel free to ask in the support channels or contact a staff member.

Welcome to the community!`;

main();

async function main() {
  console.log('Initializing database...');
  closeSync(openSync(dbFilename, 'a'));
  const db = await new sqlite3.Database(dbFilename, sqlite3.OPEN_READWRITE, (err: Error | null) => {
    if (err) {
      console.error('Error creating database: ' + err);
      process.exit(1);
    }
  });
  await new Promise<void>((resolve) => {
    db.run(createUsersTable, [], (err: Error | null) => {
      if (err) {
        console.error('Error creating users table: ' + err);
        process.exit(1);
      }
      resolve();
    });
  });
  console.log(`Database successfully initialized at ${dbFilename}`);

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
  
  // DM-based email authentication
  client.on(Events.MessageCreate, async (message) => {
    if (!message.channel.isDMBased() || message.author.bot) return;
    const userFromId = await getUserById(db, message.author.id);
    if (userFromId) {
      if (userFromId.status === UserStatus.BANNED) return;
      if (userFromId.status === UserStatus.VERIFIED) {
        message.reply('You are already verified.');
        return;
      }
    }
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
        
        if (userFromId) {
          if (userFromId.status === UserStatus.UNVERIFIED) {
            const diff = Date.now() - Number(userFromId.created_at);
            if (diff < 1000 * 60 * 10) {
              const minutes = diff / (60 * 1000);
              message.reply(`You must wait 10 minutes between verification requests. ${minutes > 9 ? 'Less than 1 minute' : Math.ceil(10 - minutes) + ' minutes'} remaining.`);
              return;
            }
          }
        }

        const userFromEmail = await getUserByEmail(db, email);
        if (userFromEmail && userFromEmail.status !== UserStatus.UNVERIFIED) {
          message.reply('Email already in use. If this is a mistake, please contact a Staff member.');
          return;
        }

        db.run(upsertUser, [id, email, UserStatus.UNVERIFIED, code, createdAt], (err: Error | null) => {
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
        if (!userFromId) {
          message.reply('User not found. Run `verify <your faang email>` to begin the verification process.');
          return;
        }
        if (args[1] != userFromId.code) {
          message.reply('Invalid code, please try again.');
          return;
        }
        db.run('UPDATE users SET status = ?1 WHERE id = ?2', [UserStatus.VERIFIED, message.author.id], (err: Error | null) => {
          if (err) {
            message.reply('Internal server error(2)');
            console.error(`Error updating user status ${id} (status=VERIFIED): ${err}`);
            return;
          }
          message.reply(welcomeMessage);
        });
        break;
      default:
        message.reply('Run `verify <your faang email>` to begin the verification process.');
    }
  });

  // Commands
  const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
  const collection = new Collection<string, Command>();
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = collection.get(interaction.commandName);
    if (!command) return;
    command.execute(interaction, db)
      .catch((error: Error) => {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
          interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      });
  });

  if (!existsSync(join(__dirname, 'commands'))) {
    console.log('Initializing Discord client...'); 
    client.login(process.argv[2]);
    return;
  }
  const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
  if (commandFiles.length === 0) {
    console.log('Initializing Discord client...'); 
    client.login(process.argv[2]);
    return;
  }
  for (const file of commandFiles) {
    const command = await import(join(__dirname, 'commands', file));
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
      collection.set(command.data.name, command);
      continue;
    }
    console.error(`The command at ${file} is missing a required "data" or "execute" property.`);
    process.exit(1);
  }
  if (process.argv[2] === undefined) return;
  const rest = new REST().setToken(process.argv[2]);
  console.log('Started refreshing application (/) commands.');
  rest.put(Routes.applicationCommands('1275322250333130803'), {
    body: commands,
  }).then(() => {
    console.log('Successfully reloaded application (/) commands.\nInitializing Discord client...');
    client.login(process.argv[2]);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
