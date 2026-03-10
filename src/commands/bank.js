const { getUser, addUser, updateBalance, getBankAccount, bankDeposit, bankWithdraw, calcInterest } = require('../database/db');
const { centeredBox, troll, getRandom } = require('./utils');

module.exports = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'banka':
        case 'bank':
        case 'hesap': {
            const account = getBankAccount(userId);
            if (!account || account.amount <= 0) {
                return msg.reply(centeredBox([
                    '🏧 BANKA HESABI',
                    ' ',
                    'Hesabınız boş.',
                    ' ',
                    '!yatir <miktar> ile',
                    'para yatırabilirsiniz.'
                ], 'BANKA'));
            }
            const interest = calcInterest(account);
            const total = account.amount + interest;
            const hours = ((Date.now() - account.deposited_at) / (1000 * 60 * 60)).toFixed(1);
            const rate = (Math.min(parseFloat(hours) * 1, 50)).toFixed(1);
            return msg.reply(centeredBox([
                '🏧 BANKA HESABI',
                ' ',
                `💵 Anapara: ${account.amount} $`,
                `📈 Faiz: +${interest} $ (%${rate})`,
                `💰 Toplam: ${total} $`,
                ' ',
                `⏱️ Süre: ${hours} saat`,
            ], 'BANKA'));
        }

        case 'yatir':
        case 'deposit': {
            let amount = parseInt(args[0]);
            if (args[0] === 'hepsi' || args[0] === 'all') amount = user.balance;
            if (isNaN(amount) || amount <= 0) return msg.reply('⚠️ Miktar gir.\nKullanım: !yatir <miktar> veya !yatir hepsi');
            if (amount > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            updateBalance(userId, -amount);
            bankDeposit(userId, amount);

            const account = getBankAccount(userId);
            return msg.reply(centeredBox([
                '🏧 PARA YATIRILDI',
                ' ',
                `💵 Yatırılan: ${amount} $`,
                `🏦 Bankadaki: ${account.amount} $`,
                ' ',
                'Saatte %1 faiz işler.',
                'Maks %50 faiz kazanabilirsin.'
            ], 'BANKA'));
        }

        case 'cek':
        case 'withdraw': {
            let amount;
            if (args[0] === 'hepsi' || args[0] === 'all') {
                const account = getBankAccount(userId);
                if (!account) return msg.reply('⚠️ Bankada paran yok ki.');
                amount = account.amount + calcInterest(account);
            } else {
                amount = parseInt(args[0]);
            }
            if (isNaN(amount) || amount <= 0) return msg.reply('⚠️ Miktar gir.\nKullanım: !cek <miktar> veya !cek hepsi');

            const result = bankWithdraw(userId, amount);
            if (!result) return msg.reply('⚠️ Bankada o kadar paran yok.');

            updateBalance(userId, amount);

            return msg.reply(centeredBox([
                '🏧 PARA ÇEKİLDİ',
                ' ',
                `💵 Çekilen: ${amount} $`,
                `📈 Faiz kazancı: +${result.interest} $`,
                `🏦 Kalan: ${result.remaining} $`,
            ], 'BANKA'));
        }

        case 'faiz': {
            return msg.reply(centeredBox([
                '📈 FAİZ BİLGİSİ',
                ' ',
                '🕐 Saatte %1 basit faiz',
                '📊 Maksimum %50 (50 saat)',
                ' ',
                'Örnek:',
                '1000$ → 1 saat → 1010$',
                '1000$ → 10 saat → 1100$',
                '1000$ → 50 saat → 1500$',
                ' ',
                '!yatir <miktar> ile başla',
                '!cek <miktar> ile çek',
            ], 'FAİZ ORANI'));
        }

        default:
            return false;
    }
};
