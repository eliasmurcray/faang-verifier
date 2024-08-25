import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import * as sqlite3 from 'sqlite3';

export const data = new SlashCommandBuilder()
  .setName('blacklist')
  .setDescription('Get server blacklist');

export const execute = async(interaction: ChatInputCommandInteraction, _db: sqlite3.Database) => {
  interaction.reply(`\`\`\`sarahlim1029\`\`\``);
};
