const { getUser, addUser, updateBalance, setDaily } = require('../database/db');
const { centeredBox, troll, getRandom, getTitle } = require('./utils');

const ADMINS = ['905510395152@c.us'];

module.exports = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'daily':
        case 'gunluk': {
            const now = Date.now();
            const lastDaily = user.last_daily || 0;
            const cooldown = 24 * 60 * 60 * 1000;

            if (now - lastDaily < cooldown) {
                const remaining = cooldown - (now - lastDaily);
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                return msg.reply(`⏳ ${getRandom(troll.cooldown)}\n(${hours}sa ${minutes}dk kaldı)`);
            }
            const reward = 500;
            updateBalance(userId, reward);
            setDaily(userId);
            return msg.reply(centeredBox(['   💰   ', ' GÜNLÜK ', '  ÖDÜL  ', ` +${reward} $ `], 'BAŞARILI'));
        }

        case 'balance':
        case 'cash':
        case 'bakiye':
        case 'param': {
            const mentioned = msg.mentionedIds && msg.mentionedIds[0];
            if (mentioned) {
                const targetId = resolve(mentioned);
                let targetUser = getUser(targetId);
                if (!targetUser) targetUser = addUser(targetId);
                const targetTitle = getTitle(targetUser.balance);
                const targetArt = [
                    `👤 @${targetId.split('@')[0]}`,
                    ` 💸 ${targetUser.balance} $ `,
                    targetTitle,
                    '      '
                ];
                return msg.reply(centeredBox(targetArt, 'CÜZDAN'), null, { mentions: [mentioned] });
            }
            const title = getTitle(user.balance);
            const balanceArt = ['      ', ` 💸 ${user.balance} $ `, title, '      '];
            return msg.reply(centeredBox(balanceArt, 'CÜZDAN'));
        }

        case 'menu':
        case 'menü':
        case 'dashboard': {
            const title = getTitle(user.balance);
            const isAdmin = ADMINS.includes(userId) ? ' 👑' : '';
            const menuArt = [
                `👤 @${userId.split('@')[0]}${isAdmin}`,
                `${title}`,
                `💸 Para: ${user.balance} $`,
                `💬 Mesaj: ${user.msg_count || 0}`,
                `🏆 ${user.games_won || 0}W / ${user.games_lost || 0}L`,
                user.spouse ? `💍 Eş: @${user.spouse.split('@')[0]}` : '',
                ' ',
                '--- OYUNLAR ---',
                '🎲 !yazitura · !slot · !zar',
                '⚔️ !duello · !soygun',
                ' ',
                '--- SOSYAL ---',
                '🎯 !rulet · !boss',
                '🔮 !falci · !kader',
                '💍 !evlilik · !profil',
                '🏴‍☠️ !wanted · !unvan',
                ' ',
                '--- DİĞER ---',
                '💰 !gunluk · !siralama',
                '🏧 !transfer · !yardim',
                '🏦 !banka · !yatir · !cek',
                '📈 !borsa · !al · !sat',
                '🏆 !turnuva · !katil',
                '❌ !iptal',
            ].filter(l => l !== '');
            return msg.reply(centeredBox(menuArt, 'KUMARBAZ PROFİLİ'));
        }

        case 'transfer':
        case 'gonder': {
            // Flexible argument parsing: !transfer @user 100  OR  !transfer 100 @user
            const mentioned = msg.mentionedIds && msg.mentionedIds[0];
            if (!mentioned) return msg.reply('⚠️ Kime göndereceksin hayalet avcısı?\nKullanım: !transfer @kullanıcı <miktar>');

            // Find the numeric argument (could be at any position)
            let amount = NaN;
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num) && !arg.includes('@')) {
                    amount = num;
                    break;
                }
            }

            if (isNaN(amount) || amount <= 0) return msg.reply('⚠️ Miktar gir miktar.\nKullanım: !transfer @kullanıcı <miktar>');
            if (amount > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            const targetId = resolve(mentioned);
            if (targetId === userId) return msg.reply('⚠️ Kendine mi para göndereceksin? Deli misin?');

            let targetUser = getUser(targetId);
            if (!targetUser) targetUser = addUser(targetId);

            updateBalance(userId, -amount);
            updateBalance(targetId, amount);

            return msg.reply(centeredBox([
                'Para Transferi', 'Gitti paracıklar...',
                `Gönderilen: ${amount} $`, `Alan: @${targetId.split('@')[0]}`
            ], 'BANKA'), null, { mentions: [mentioned] });
        }

        default:
            return false; // not handled
    }
};
