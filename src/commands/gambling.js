const { updateBalance, recordWin, recordLoss } = require('../database/db');
const { sleep, centeredBox, troll, getRandom } = require('./utils');

// ─── Blackjack State ───
const activeBlackjack = {}; // userId -> { deck, playerHand, dealerHand, bet, msg, chatId }

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function cardValue(card) {
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    if (card.rank === 'A') return 11;
    return parseInt(card.rank);
}

function handValue(hand) {
    let total = hand.reduce((s, c) => s + cardValue(c), 0);
    let aces = hand.filter(c => c.rank === 'A').length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function handStr(hand, hideSecond = false) {
    if (hideSecond && hand.length >= 2) {
        return `${hand[0].rank}${hand[0].suit}  🂠`;
    }
    return hand.map(c => `${c.rank}${c.suit}`).join('  ');
}

function buildBJMsg(game, phase = 'playing') {
    const pVal = handValue(game.playerHand);
    const dVal = phase === 'playing' ? cardValue(game.dealerHand[0]) : handValue(game.dealerHand);
    const hideDealer = phase === 'playing';

    const lines = [
        `🃏 Krupiye: ${handStr(game.dealerHand, hideDealer)}`,
        hideDealer ? `   Değer: ${cardValue(game.dealerHand[0])} + ?` : `   Değer: ${dVal}`,
        ' ',
        `🧑 Sen: ${handStr(game.playerHand)}`,
        `   Değer: ${pVal}`,
        ' ',
        `💰 Bahis: ${game.bet} $`,
    ];

    if (phase === 'playing') {
        lines.push(' ', '!hit → Kart çek | !dur → Kal');
    }
    return centeredBox(lines, '♠ BLACKJACK ♠');
}

async function finishBlackjack(userId, game, msg) {
    // Dealer draws to 17
    while (handValue(game.dealerHand) < 17) {
        game.dealerHand.push(game.deck.pop());
    }

    const pVal = handValue(game.playerHand);
    const dVal = handValue(game.dealerHand);
    let resultText, net;

    if (pVal > 21) {
        // Player bust (handled before calling this, but just in case)
        updateBalance(userId, -game.bet);
        recordLoss(userId, game.bet);
        resultText = `💀 BATTM! (${pVal}) — ${getRandom(troll.lose)}`;
        net = `-${game.bet} $`;
    } else if (dVal > 21) {
        updateBalance(userId, game.bet);
        recordWin(userId, game.bet);
        resultText = `🎉 Krupiye battı! (${dVal})`;
        net = `+${game.bet} $`;
    } else if (pVal > dVal) {
        const winAmount = pVal === 21 && game.playerHand.length === 2 ? Math.floor(game.bet * 1.5) : game.bet;
        updateBalance(userId, winAmount);
        recordWin(userId, winAmount);
        resultText = pVal === 21 && game.playerHand.length === 2 ? '🃏 BLACKJACK! x1.5' : `🎉 Kazandın! (${pVal} > ${dVal})`;
        net = `+${winAmount} $`;
    } else if (pVal < dVal) {
        updateBalance(userId, -game.bet);
        recordLoss(userId, game.bet);
        resultText = `💀 Kaybettin (${pVal} < ${dVal}) — ${getRandom(troll.lose)}`;
        net = `-${game.bet} $`;
    } else {
        resultText = `🤝 Berabere! (${pVal} = ${dVal})`;
        net = '±0 $';
    }

    const lines = [
        `🃏 Krupiye: ${handStr(game.dealerHand)}`,
        `   Değer: ${dVal}`,
        ' ',
        `🧑 Sen: ${handStr(game.playerHand)}`,
        `   Değer: ${pVal}`,
        ' ',
        resultText,
        net,
    ];

    try { await game.msg.edit(centeredBox(lines, '♠ BLACKJACK SONUCU ♠')); } catch (e) { }
    delete activeBlackjack[userId];
}

module.exports = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'cf':
        case 'coinflip':
        case 'yazitura': {
            if (args.length < 1) return msg.reply('⚠️ Kullanım: !cf <miktar> [y/t]');
            let bet = parseInt(args[0]);
            if (args[0] === 'all' || args[0] === 'hepsi') bet = user.balance;
            if (isNaN(bet) || bet <= 0) return msg.reply('⚠️ Geçerli sayı gir.');
            if (bet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            const sentMsg = await msg.reply(centeredBox(['🪙 Para havada...'], 'YAZI TURA'));
            await sleep(1000);
            await sentMsg.edit(centeredBox(['🔄 Dönüyor...'], 'YAZI TURA'));
            await sleep(1000);

            const isHeads = Math.random() < 0.5;
            const outcome = isHeads ? 'YAZI' : 'TURA';
            let won = false;
            let playerChoice = null;

            if (args[1]) {
                if (args[1].toLowerCase().startsWith('y')) playerChoice = 'YAZI';
                if (args[1].toLowerCase().startsWith('t')) playerChoice = 'TURA';
            }
            won = playerChoice ? (playerChoice === outcome) : (Math.random() < 0.5);

            if (won) {
                updateBalance(userId, bet);
                recordWin(userId, bet);
                await sentMsg.edit(centeredBox([`🪙 ${outcome} 🪙`, getRandom(troll.win), `+${bet} $`], 'YAZI TURA'));
            } else {
                updateBalance(userId, -bet);
                recordLoss(userId, bet);
                await sentMsg.edit(centeredBox([`🪙 ${outcome} 🪙`, getRandom(troll.lose), `-${bet} $`], 'YAZI TURA'));
            }
            return;
        }

        case 'zar':
        case 'dice': {
            if (args.length < 1) return msg.reply('⚠️ Kullanım: !zar <miktar>');
            let dBet = parseInt(args[0]);
            if (args[0] === 'all' || args[0] === 'hepsi') dBet = user.balance;
            if (isNaN(dBet) || dBet <= 0) return msg.reply('⚠️ Sayı girmeyi öğren.');
            if (dBet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            const diceMsg = await msg.reply(centeredBox(['🎲 Sallıyorum...'], 'ZAR OYUNU'));
            await sleep(1500);

            const userRoll = Math.floor(Math.random() * 6) + 1;
            const botRoll = Math.floor(Math.random() * 6) + 1;

            if (userRoll === botRoll) {
                await diceMsg.edit(centeredBox([`Sen: ${userRoll} 🎲`, `Ben: ${botRoll} 🎲`, 'Berabere kaldık...', 'Paranı geri al git.'], 'ZAR OYUNU'));
            } else if (userRoll > botRoll) {
                updateBalance(userId, dBet);
                recordWin(userId, dBet);
                await diceMsg.edit(centeredBox([`Sen: ${userRoll} 🎲`, `Ben: ${botRoll} 🎲`, getRandom(troll.win), `+${dBet} $`], 'ZAR OYUNU'));
            } else {
                updateBalance(userId, -dBet);
                recordLoss(userId, dBet);
                await diceMsg.edit(centeredBox([`Sen: ${userRoll} 🎲`, `Ben: ${botRoll} 🎲`, getRandom(troll.lose), `-${dBet} $`], 'ZAR OYUNU'));
            }
            return;
        }

        case 'slots':
        case 'slot': {
            if (args.length < 1) return msg.reply('⚠️ Kullanım: !slot <miktar>');
            let sBet = parseInt(args[0]);
            if (args[0] === 'all' || args[0] === 'hepsi') sBet = user.balance;
            if (isNaN(sBet) || sBet <= 0) return msg.reply('⚠️ Düzgün sayı gir.');
            if (sBet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            updateBalance(userId, -sBet);

            const symbols = ['🍒', '🍋', '🍇', '🍉', '⭐', '💎'];
            const slotMsg = await msg.reply(centeredBox(['| ❓ | ❓ | ❓ |', '🎰 Dönüyor...'], 'SLOT MAKİNESİ'));

            await sleep(1000);
            const r1 = symbols[Math.floor(Math.random() * symbols.length)];
            await slotMsg.edit(centeredBox([`| ${r1} | ❓ | ❓ |`, '🎰 Dönüyor...'], 'SLOT MAKİNESİ'));
            await sleep(1000);
            const r2 = symbols[Math.floor(Math.random() * symbols.length)];
            await slotMsg.edit(centeredBox([`| ${r1} | ${r2} | ❓ |`, '🎰 Dönüyor...'], 'SLOT MAKİNESİ'));
            await sleep(1000);
            const r3 = symbols[Math.floor(Math.random() * symbols.length)];

            let multiplier = 0;
            if (r1 === r2 && r2 === r3) multiplier = 20;
            else if (r1 === r2 || r2 === r3 || r1 === r3) multiplier = 1.5;

            const slotRes = `| ${r1} | ${r2} | ${r3} |`;

            if (multiplier > 0) {
                const winnings = Math.floor(sBet * multiplier);
                updateBalance(userId, winnings);
                recordWin(userId, winnings - sBet);
                await slotMsg.edit(centeredBox([slotRes, ' ', multiplier >= 10 ? '🚨 JACKPOT! 🚨' : getRandom(troll.win), `KAZANÇ: ${winnings} $`, `NET: +${winnings - sBet} $`], 'SLOT MAKİNESİ'));
            } else {
                recordLoss(userId, sBet);
                await slotMsg.edit(centeredBox([slotRes, ' ', getRandom(troll.lose), `-${sBet} $`], 'SLOT MAKİNESİ'));
            }
            return;
        }

        // ─── BLACKJACK ───
        case 'bj':
        case 'blackjack': {
            if (activeBlackjack[userId]) return msg.reply('⚠️ Zaten aktif bir elin var! !hit veya !dur yaz.');

            if (args.length < 1) return msg.reply('⚠️ Kullanım: !bj <miktar>');
            let bjBet = parseInt(args[0]);
            if (args[0] === 'all' || args[0] === 'hepsi') bjBet = user.balance;
            if (isNaN(bjBet) || bjBet <= 0) return msg.reply('⚠️ Geçerli bahis gir.');
            if (bjBet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            const deck = createDeck();
            const playerHand = [deck.pop(), deck.pop()];
            const dealerHand = [deck.pop(), deck.pop()];

            const game = { deck, playerHand, dealerHand, bet: bjBet, msg: null, chatId: msg.from };
            activeBlackjack[userId] = game;

            // Check instant blackjack
            if (handValue(playerHand) === 21) {
                const bjMsg = await msg.reply(buildBJMsg(game, 'done'));
                game.msg = bjMsg;
                await finishBlackjack(userId, game, msg);
                return;
            }

            const bjMsg = await msg.reply(buildBJMsg(game, 'playing'));
            game.msg = bjMsg;
            return;
        }

        case 'hit':
        case 'cek': {
            const game = activeBlackjack[userId];
            if (!game) return msg.reply('⚠️ Aktif Blackjack elin yok. !bj <miktar> ile başla.');

            game.playerHand.push(game.deck.pop());
            const val = handValue(game.playerHand);

            if (val > 21) {
                // Bust
                try { await game.msg.edit(buildBJMsg(game, 'done')); } catch (e) { }
                updateBalance(userId, -game.bet);
                recordLoss(userId, game.bet);
                delete activeBlackjack[userId];
                return msg.reply(centeredBox([
                    `💀 BATTM! (${val})`, getRandom(troll.lose), `-${game.bet} $`
                ], '♠ BLACKJACK ♠'));
            }

            if (val === 21) {
                // Auto-stand at 21
                await finishBlackjack(userId, game, msg);
                return;
            }

            try { await game.msg.edit(buildBJMsg(game, 'playing')); } catch (e) { }
            return msg.reply(`🃏 Kart çekildi! Değer: ${val}. !hit veya !dur`);
        }

        case 'dur':
        case 'stand': {
            const game = activeBlackjack[userId];
            if (!game) return msg.reply('⚠️ Aktif Blackjack elin yok.');

            await finishBlackjack(userId, game, msg);
            return;
        }

        default:
            return false;
    }
};
