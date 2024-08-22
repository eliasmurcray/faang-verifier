"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.data = void 0;
const discord_js_1 = require("discord.js");
const getUserById = async (db, id) => {
    return new Promise((resolve) => {
        db.get('SELECT * from users WHERE id = ?1', [id], (err, row) => {
            if (err) {
                console.error(err);
                resolve(null);
                return;
            }
            resolve(row);
        });
    });
};
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('fetchuser')
    .setDescription('Fetch user information from Discord user ID')
    .addStringOption((option) => option
    .setName('uid')
    .setDescription('Discord user ID')
    .setRequired(true));
const execute = async (interaction, db) => {
    const uid = interaction.options.getString('uid', true);
    const user = await getUserById(db, uid);
    if (user) {
        interaction.reply(`\`\`\`json\n${JSON.stringify(user, null, 2)}\`\`\``);
    }
    else {
        interaction.reply(`No user found with ID: ${uid}`);
    }
};
exports.execute = execute;
