const { getUser, addUser, updateBalance } = require('../database/db');
const { centeredBox } = require('./utils');

const ADMINS = ['905510395152@c.us'];

module.exports = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'admin_ekle':
        case 'addmoney': {
            if (!ADMINS.includes(userId)) return msg.reply('⚠️ Sadece adminler kullanabilir.');
            const addTarget = msg.mentionedIds && msg.mentionedIds[0];
            if (!addTarget) return msg.reply('⚠️ Kime para ekleyeceğimi söylemedin.\nKullanım: !admin_ekle @kisi <miktar>');

            // Find numeric argument anywhere
            let addAmount = NaN;
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num) && !arg.includes('@')) {
                    addAmount = num;
                    break;
                }
            }
            if (isNaN(addAmount)) return msg.reply('⚠️ Miktar gir.');

            const normAddTarget = resolve(addTarget);
            let targetUserAdd = getUser(normAddTarget);
            if (!targetUserAdd) targetUserAdd = addUser(normAddTarget);

            updateBalance(normAddTarget, addAmount);
            return msg.reply(`✅ @${normAddTarget.split('@')[0]} hesabına ${addAmount} $ eklendi.`, null, { mentions: [addTarget] });
        }

        case 'admin_sil':
        case 'removemoney': {
            if (!ADMINS.includes(userId)) return msg.reply('⚠️ Sadece adminler kullanabilir.');
            const remTarget = msg.mentionedIds && msg.mentionedIds[0];
            if (!remTarget) return msg.reply('⚠️ Kimden para sileceğimi söylemedin.\nKullanım: !admin_sil @kisi <miktar>');

            let remAmount = NaN;
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num) && !arg.includes('@')) {
                    remAmount = num;
                    break;
                }
            }
            if (isNaN(remAmount)) return msg.reply('⚠️ Miktar gir.');

            const normRemTarget = resolve(remTarget);
            let targetUserRem = getUser(normRemTarget);
            if (!targetUserRem) targetUserRem = addUser(normRemTarget);

            updateBalance(normRemTarget, -remAmount);
            return msg.reply(`✅ @${normRemTarget.split('@')[0]} hesabından ${remAmount} $ silindi.`, null, { mentions: [remTarget] });
        }

        default:
            return false;
    }
};
