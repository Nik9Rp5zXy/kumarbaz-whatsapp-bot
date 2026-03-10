// Command router — dispatches to individual modules
const { getUser, addUser, updateBalance } = require('../database/db');
const { checkSpam } = require('../spam');
const { centeredBox, troll, getRandom } = require('./utils');

const economyHandler = require('./economy');
const gamblingHandler = require('./gambling');
const combatHandler = require('./combat');
const socialHandler = require('./social');
const hangmanHandler = require('./hangman');
const zooHandler = require('./zoo');
const milyonerHandler = require('./milyoner');
const weatherHandler = require('./weather');
const adminHandler = require('./admin');
const bankHandler = require('./bank');
const stockHandler = require('./stock');
const tournamentHandler = require('./tournament');

const handlers = [economyHandler, gamblingHandler, combatHandler, socialHandler, hangmanHandler, zooHandler, milyonerHandler, weatherHandler, bankHandler, stockHandler, tournamentHandler, adminHandler];

const handleCommand = async (msg, client) => {
    try {
        const body = msg.body;
        if (!body.startsWith('!')) return;

        const userId = msg._normalizedUserId || (msg.author || msg.from).replace(/@lid$/, '@c.us');
        const resolve = msg._resolveMentionedId || ((id) => id.replace(/@lid$/, '@c.us'));

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // Spam check
        const spamResult = checkSpam(userId, command);
        if (!spamResult.allowed) {
            if (spamResult.reason === 'ban') {
                return msg.reply(`🚫 Banlısın. ${spamResult.remaining}sn kaldı.\n${getRandom(troll.spam)}`);
            }
            if (spamResult.reason === 'hard_ban') {
                updateBalance(userId, -spamResult.penalty);
                return msg.reply(`🚨 HARD BAN! ${spamResult.remaining}sn yasak + ${spamResult.penalty}$ ceza.\n${getRandom(troll.spam)}`);
            }
            if (spamResult.reason === 'soft_ban') {
                return msg.reply(`⛔ ${spamResult.remaining}sn yasak.\n${getRandom(troll.spam)}`);
            }
            if (spamResult.reason === 'warning') {
                return msg.reply(`⚠️ ${getRandom(troll.spam)}`);
            }
            if (spamResult.reason === 'cooldown') {
                return; // Silent ignore
            }
        }

        let user = getUser(userId);
        if (!user) user = addUser(userId);

        // Try each handler sequentially
        for (const handler of handlers) {
            try {
                const result = await handler(command, args, msg, userId, user, resolve, client);
                if (result !== false) return;
            } catch (handlerErr) {
                console.error(`Handler error for !${command}:`, handlerErr);
                return msg.reply('⚠️ Bir hata oluştu. Tekrar dene.');
            }
        }
    } catch (e) {
        console.error('Komut Hatası:', e);
        msg.reply('⚠️ Bir hata oluştu ama ben yıkılmadım ayaktayım. Tekrar dene.');
    }
};

module.exports = { handleCommand };
