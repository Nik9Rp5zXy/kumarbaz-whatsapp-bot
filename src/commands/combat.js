const { getUser, addUser, updateBalance, recordWin, recordLoss, getWanted, removeWanted } = require('../database/db');
const { sleep, centeredBox, troll, getRandom } = require('./utils');

const pendingDuels = {};

module.exports = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'duello':
        case 'vs':
        case 'w': {
            const opponentId = msg.mentionedIds && msg.mentionedIds[0];
            if (!opponentId) return msg.reply('⚠️ Kendi kendine mi dövüşeceksin? Birini etiketle.\nKullanım: !duello @kisi <miktar>');
            const normOpponentId = resolve(opponentId);
            if (normOpponentId === userId) return msg.reply('⚠️ Mazoşist misin? Başkasını etiketle.');

            // Find numeric argument anywhere in args
            let duelBet = NaN;
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num) && !arg.includes('@')) {
                    duelBet = num;
                    break;
                }
            }
            if (isNaN(duelBet) || duelBet <= 0) return msg.reply('⚠️ Kaç parasına kapışacaksınız?\nKullanım: !duello @kisi <miktar>');
            if (duelBet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            let opponent = getUser(normOpponentId);
            if (!opponent) opponent = addUser(normOpponentId);
            if (opponent.balance < duelBet) return msg.reply('⚠️ Rakibinin parası yok, fakirle dans edilmez.');

            pendingDuels[normOpponentId] = { challenger: userId, amount: duelBet, timestamp: Date.now() };
            return msg.reply(`⚔️ @${normOpponentId.split('@')[0]}, @${userId.split('@')[0]} sana meydan okudu!\n\n💰 Bahis: ${duelBet} $\n\nKabul etmek için **!kabul** yaz.`, null, { mentions: [opponentId, userId] });
        }

        case 'kabul':
        case 'accept': {
            const duel = pendingDuels[userId];
            if (!duel) return msg.reply('⚠️ Kimse sana meydan okumamış. Hayal görme.');

            const challenger = getUser(duel.challenger);
            const acceptor = getUser(userId);
            if (!challenger || !acceptor || challenger.balance < duel.amount || acceptor.balance < duel.amount) {
                delete pendingDuels[userId];
                return msg.reply('⚠️ Birinizin parası bitmiş. Düello iptal.');
            }

            delete pendingDuels[userId];

            const duelMsg = await msg.reply(centeredBox([
                `@${challenger.id.split('@')[0]} vs @${acceptor.id.split('@')[0]}`,
                '⚔️ KAPIŞMA BAŞLIYOR! ⚔️',
                `Bahis: ${duel.amount} $`
            ], 'DAŞŞAK DÜELLOSU'));

            await sleep(2000);

            const chSize = (Math.random() * 25 + 5).toFixed(1);
            const acSize = (Math.random() * 25 + 5).toFixed(1);
            let finalCh = parseFloat(chSize);
            let finalAc = parseFloat(acSize);
            if (finalCh === finalAc) finalCh += 0.1;

            let winnerId, loserId;
            if (finalCh > finalAc) { winnerId = duel.challenger; loserId = userId; }
            else { winnerId = userId; loserId = duel.challenger; }

            updateBalance(winnerId, duel.amount);
            updateBalance(loserId, -duel.amount);
            recordWin(winnerId, duel.amount);
            recordLoss(loserId, duel.amount);

            await duelMsg.edit(centeredBox([
                '🍆 SONUÇLAR 🍆',
                `@${challenger.id.split('@')[0]}: ${chSize} kg`,
                `@${acceptor.id.split('@')[0]}: ${acSize} kg`,
                ' ', `Kazanan: @${winnerId.split('@')[0]}`,
                'Sebep: Daha ağır bastı.'
            ], 'DAŞŞAK KONUŞUR'));
            return;
        }

        case 'soygun':
        case 'cal':
        case 'steal': {
            const soygunVictimId = msg.mentionedIds && msg.mentionedIds[0];
            if (!soygunVictimId) return msg.reply('⚠️ Kimi soyacaksın hayalet?\nKullanım: !soygun @kullanıcı');
            const normVictimId = resolve(soygunVictimId);
            if (normVictimId === userId) return msg.reply('⚠️ Kendini soyup sonsuz para döngüsü mü yapacan?');

            let sVictim = getUser(normVictimId);
            if (!sVictim || sVictim.balance < 100) return msg.reply('⚠️ Adamda para yok sal garibanı.');
            if (user.balance < 100) return msg.reply('⚠️ Cebinde 100 doların yok, hırsızlığa kalkışıyorsun.');

            const wanted = getWanted(normVictimId);
            const bonusMultiplier = wanted ? 1.5 : 1.0;

            const soygunSuccess = Math.random() < 0.4;

            if (soygunSuccess) {
                let stolen = Math.floor(sVictim.balance * (0.1 + Math.random() * 0.2));
                stolen = Math.floor(stolen * bonusMultiplier);
                updateBalance(normVictimId, -stolen);
                updateBalance(userId, stolen);
                recordWin(userId, stolen);

                const lines = ['🔫 SOYGUN TAMAM 🔫', `Çalınan: ${stolen} $`, 'Temiz iş oldu.'];
                if (wanted) {
                    lines.push(' ', `🏴‍☠️ WANTED BONUS: +%50`);
                    updateBalance(userId, wanted.bounty);
                    removeWanted(normVictimId);
                    lines.push(`Ödül: +${wanted.bounty} $`);
                }
                return msg.reply(centeredBox(lines, 'SUÇ DÜNYASI'));
            } else {
                const penalty = 250;
                updateBalance(userId, -penalty);
                recordLoss(userId, penalty);
                return msg.reply(centeredBox(['🚔 ENSELENDİN! 🚔', 'Rüşvet verdin de yırttın.', `Zarar: -${penalty} $`], 'HAPİSHANE'));
            }
        }

        default:
            return false;
    }
};
