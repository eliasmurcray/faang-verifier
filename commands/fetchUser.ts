import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField, GuildMember } from 'discord.js';
import * as sqlite3 from 'sqlite3';

type User = {
  id: string;
  email: string;
  status: number;
  code: string;
  created_at: string;
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

export const data = new SlashCommandBuilder()
  .setName('fetchuser')
  .setDescription('Fetch user information from Discord user ID')
  .addStringOption((option) => 
    option
      .setName('uid')
      .setDescription('Discord user ID')
      .setRequired(true));

export const execute = async(interaction: ChatInputCommandInteraction, db: sqlite3.Database) => {
  const member = interaction.member as GuildMember;
  if (member === null || !member.permissions.has([PermissionsBitField.Flags.Administrator])) {
    interaction.reply('You do not have the required permissions to use this command.');
    return;
  }
  const uid = interaction.options.getString('uid', true);
  const user = await getUserById(db, uid);
  if (user) {
    interaction.reply(`\`\`\`json\n${JSON.stringify(user, null, 2)}\`\`\``);
  } else {
    interaction.reply(`No user found with ID: ${uid}`);
  }
};
