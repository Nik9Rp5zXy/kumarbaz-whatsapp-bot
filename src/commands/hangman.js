const { getUser, addUser, updateBalance, recordWin, recordLoss } = require('../database/db');
const { centeredBox, troll, getRandom } = require('./utils');

const pendingChallenge = {};   // targetId -> { challenger, bet, chatId, timestamp }
const pendingWordSelection = {}; // challengerId -> { targetId, bet, chatId }
const activeGames = {};        // chatId -> { word, guessedLetters, wrongLetters, wrongCount, setter, guesser, bet, msg, hints }

const MAX_WRONG = 6;

const HANGMAN_ART = [
    ['  ┌───┐', '  │    ', '  │    ', '  │    ', '  └────'],
    ['  ┌───┐', '  │   O', '  │    ', '  │    ', '  └────'],
    ['  ┌───┐', '  │   O', '  │   |', '  │    ', '  └────'],
    ['  ┌───┐', '  │   O', '  │  /|', '  │    ', '  └────'],
    ['  ┌───┐', '  │   O', '  │  /|\\', '  │    ', '  └────'],
    ['  ┌───┐', '  │   O', '  │  /|\\', '  │  /  ', '  └────'],
    ['  ┌───┐', '  │   X', '  │  /|\\', '  │  / \\', '  └────'],
];

function normalize(str) {
    return str.toUpperCase().replace(/İ/g, 'I');
}

function getWordDisplay(word, guessed) {
    return word.split('').map(ch => {
        if (ch === ' ') return '  ';
        return guessed.has(normalize(ch)) ? ch : '_';
    }).join(' ');
}

function isWordComplete(word, guessed) {
    return word.split('').every(ch => ch === ' ' || guessed.has(normalize(ch)));
}

function buildGameMsg(game) {
    const art = HANGMAN_ART[Math.min(game.wrongCount, MAX_WRONG)];
    const display = getWordDisplay(game.word, game.guessedLetters);
    const wrong = game.wrongLetters.length > 0 ? game.wrongLetters.join(', ') : '-';

    const lines = [
        ...art, ' ',
        display, ' ',
        `Yanlış: ${wrong} (${game.wrongCount}/${MAX_WRONG})`,
        `Bahis: ${game.bet > 0 ? game.bet + ' $' : 'Bedava'}`,
        ' ',
        `Belirleyen: @${game.setter.split('@')[0]}`,
        `Tahmin eden: @${game.guesser.split('@')[0]}`,
    ];

    if (game.hints.length > 0) {
        lines.push(' ', '💡 İpuçları:');
        game.hints.forEach(h => lines.push(`  → ${h}`));
    }
    lines.push(' ', '!tahmin <harf/kelime>');
    return centeredBox(lines, 'ADAM ASMACA');
}

async function endGame(chatId, game, result, msg) {
    const totalPot = game.bet * 2;
    const display = game.word.split('').join(' ');

    if (result === 'win') {
        if (totalPot > 0) {
            updateBalance(game.guesser, totalPot);
            recordWin(game.guesser, game.bet);
            recordLoss(game.setter, game.bet);
        }
        const art = HANGMAN_ART[Math.min(game.wrongCount, MAX_WRONG)];
        try {
            await game.msg.edit(centeredBox([
                '🎉 TEBRİKLER! 🎉', ' ', ...art, ' ',
                `Kelime: ${display}`, ' ',
                `Kazanan: @${game.guesser.split('@')[0]}`,
                totalPot > 0 ? `Kazanç: +${totalPot} $` : 'Bedava oyun',
            ], 'ADAM ASMACA - BİTTİ'));
        } catch (e) { }
        delete activeGames[chatId];
        return msg.reply(`🎉 Kelime bilindi! ${totalPot > 0 ? `+${totalPot} $` : ''}`);
    } else {
        if (totalPot > 0) {
            updateBalance(game.setter, totalPot);
            recordWin(game.setter, game.bet);
            recordLoss(game.guesser, game.bet);
        }
        const art = HANGMAN_ART[MAX_WRONG];
        try {
            await game.msg.edit(centeredBox([
                '💀 ASILAN SEN! 💀', ' ', ...art, ' ',
                `Kelime: ${display}`, ' ',
                `Kaybeden: @${game.guesser.split('@')[0]}`,
                totalPot > 0 ? `Kayıp: -${game.bet} $` : 'Bedava oyun',
            ], 'ADAM ASMACA - BİTTİ'));
        } catch (e) { }
        delete activeGames[chatId];
        return msg.reply(`💀 Asıldın! Kelime: ${game.word}`);
    }
}

// ─── Main handler ───
const handler = async (command, args, msg, userId, user, resolve, client) => {
    const chatId = msg.from;

    switch (command) {
        case 'adamasmaca':
        case 'aa': {
            if (activeGames[chatId]) return msg.reply('⚠️ Bu grupta zaten aktif adam asmaca var!');

            const targetMention = msg.mentionedIds && msg.mentionedIds[0];
            if (!targetMention) return msg.reply('⚠️ Kullanım: !aa @kisi <bahis>\nBahis opsiyonel.');

            const targetId = resolve(targetMention);
            if (targetId === userId) return msg.reply('⚠️ Kendine meydan okuyamazsın.');

            let bet = 0;
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num) && !arg.includes('@') && num > 0) { bet = num; break; }
            }
            if (bet > 0 && bet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            pendingChallenge[targetId] = { challenger: userId, bet, chatId, timestamp: Date.now() };

            return msg.reply(centeredBox([
                '🎮 ADAM ASMACA DAVETİ 🎮', ' ',
                `@${userId.split('@')[0]} seni davet ediyor!`,
                bet > 0 ? `💰 Bahis: ${bet} $` : '💰 Bahis: Bedava', ' ',
                '!kabul_aa ile kabul et.',
            ], 'DAVET'), null, { mentions: [targetMention] });
        }

        case 'kabul_aa': {
            const ch = pendingChallenge[userId];
            if (!ch) return msg.reply('⚠️ Sana gelen davet yok.');
            if (Date.now() - ch.timestamp > 300000) {
                delete pendingChallenge[userId];
                return msg.reply('⚠️ Davet süresi dolmuş.');
            }

            const challenger = getUser(ch.challenger);
            if (ch.bet > 0) {
                if (!challenger || challenger.balance < ch.bet) {
                    delete pendingChallenge[userId]; return msg.reply('⚠️ Davet edenin parası bitmiş.');
                }
                if (user.balance < ch.bet) {
                    delete pendingChallenge[userId]; return msg.reply(`⚠️ ${getRandom(troll.poor)}`);
                }
                updateBalance(ch.challenger, -ch.bet);
                updateBalance(userId, -ch.bet);
            }

            delete pendingChallenge[userId];

            pendingWordSelection[ch.challenger] = { targetId: userId, bet: ch.bet, chatId: ch.chatId };

            try {
                await client.sendMessage(ch.challenger, centeredBox([
                    '🎮 ADAM ASMACA 🎮', ' ',
                    'Kelimeyi belirle!', 'Bu chata kelimeyi yaz.', ' ',
                    'Sadece Türkçe harfler.', 'Boşluklu kelimeler olabilir.',
                ], 'KELİME SEÇ'));
            } catch (e) {
                console.error('DM gönderilemedi:', e);
                if (ch.bet > 0) { updateBalance(ch.challenger, ch.bet); updateBalance(userId, ch.bet); }
                delete pendingWordSelection[ch.challenger];
                return msg.reply('⚠️ DM gönderilemedi. Bot numarasını kaydet.');
            }

            return msg.reply(centeredBox([
                '✅ Kabul edildi!', ' ',
                `@${ch.challenger.split('@')[0]} kelimeyi belirliyor...`,
                "DM'den kelimeyi yazacak.",
            ], 'ADAM ASMACA'));
        }

        case 'tahmin':
        case 'guess': {
            const game = activeGames[chatId];
            if (!game) return msg.reply('⚠️ Aktif adam asmaca yok. !aa ile başlat.');
            if (userId !== game.guesser) return msg.reply('⚠️ Sadece tahmin eden tahmin yapabilir.');
            if (args.length === 0) return msg.reply('⚠️ !tahmin <harf> veya !tahmin <kelime>');

            const guess = normalize(args.join(' '));

            if (guess.length === 1) {
                if (game.guessedLetters.has(guess)) return msg.reply('⚠️ Bu harfi zaten denedin.');
                game.guessedLetters.add(guess);

                if (normalize(game.word).includes(guess)) {
                    if (isWordComplete(game.word, game.guessedLetters)) return endGame(chatId, game, 'win', msg);
                    try { await game.msg.edit(buildGameMsg(game)); } catch (e) { await msg.reply(buildGameMsg(game)); }
                    return msg.reply(`✅ '${guess}' doğru!`);
                } else {
                    game.wrongLetters.push(guess);
                    game.wrongCount++;
                    if (game.wrongCount >= MAX_WRONG) return endGame(chatId, game, 'lose', msg);
                    try { await game.msg.edit(buildGameMsg(game)); } catch (e) { await msg.reply(buildGameMsg(game)); }
                    return msg.reply(`❌ '${guess}' yok! (${game.wrongCount}/${MAX_WRONG})`);
                }
            } else {
                if (guess === normalize(game.word)) {
                    game.word.split('').forEach(ch => game.guessedLetters.add(normalize(ch)));
                    return endGame(chatId, game, 'win', msg);
                }
                game.wrongCount += 2;
                if (game.wrongCount >= MAX_WRONG) return endGame(chatId, game, 'lose', msg);
                try { await game.msg.edit(buildGameMsg(game)); } catch (e) { await msg.reply(buildGameMsg(game)); }
                return msg.reply(`❌ '${args.join(' ')}' değil! Yanlış kelime = +2 hak. (${game.wrongCount}/${MAX_WRONG})`);
            }
        }

        case 'ipucu':
        case 'hint': {
            const game = activeGames[chatId];
            if (!game) return msg.reply('⚠️ Aktif oyun yok.');
            if (userId !== game.setter) return msg.reply('⚠️ Sadece belirleyen ipucu verebilir.');
            if (args.length === 0) return msg.reply('⚠️ !ipucu <metin>');

            game.hints.push(args.join(' '));
            try { await game.msg.edit(buildGameMsg(game)); } catch (e) { await msg.reply(buildGameMsg(game)); }
            return msg.reply(`💡 İpucu eklendi!`);
        }

        case 'iptal_aa': {
            const game = activeGames[chatId];
            if (!game) return msg.reply('⚠️ Aktif adam asmaca yok.');
            if (userId !== game.setter && userId !== game.guesser) return msg.reply('⚠️ Sadece oyuncular iptal edebilir.');
            if (game.bet > 0) { updateBalance(game.setter, game.bet); updateBalance(game.guesser, game.bet); }
            try { await game.msg.edit(centeredBox(['❌ OYUN İPTAL ❌', 'Paralar iade edildi.'], 'ADAM ASMACA')); } catch (e) { }
            delete activeGames[chatId];
            return msg.reply('✅ Adam asmaca iptal edildi.');
        }

        default:
            return false;
    }
};

// ─── DM word selection handler (called from index.js) ───
handler.startGameFromDM = async (client, senderId, text) => {
    const pending = pendingWordSelection[senderId];
    if (!pending) return false;

    const cleanWord = text.trim().toUpperCase();
    if (cleanWord.length < 2 || cleanWord.length > 30) {
        await client.sendMessage(senderId, '⚠️ Kelime 2-30 karakter arası olmalı. Tekrar yaz.');
        return true;
    }
    if (!/^[A-ZÇĞÖŞÜİ ]+$/.test(cleanWord)) {
        await client.sendMessage(senderId, '⚠️ Sadece harf ve boşluk kullan. Tekrar yaz.');
        return true;
    }

    delete pendingWordSelection[senderId];

    const game = {
        word: cleanWord,
        guessedLetters: new Set(),
        wrongLetters: [],
        wrongCount: 0,
        setter: senderId,
        guesser: pending.targetId,
        bet: pending.bet,
        msg: null,
        hints: [],
    };

    const display = getWordDisplay(cleanWord, new Set());
    const lines = [
        '🎮 OYUN BAŞLADI! 🎮', ' ',
        ...HANGMAN_ART[0], ' ',
        display, ' ',
        `Harf: ${cleanWord.replace(/ /g, '').length}`,
        game.bet > 0 ? `Bahis: ${game.bet} $` : 'Bedava', ' ',
        `Belirleyen: @${senderId.split('@')[0]}`,
        `Tahmin eden: @${pending.targetId.split('@')[0]}`, ' ',
        '!tahmin <harf> veya !tahmin <kelime>',
        'İpucu: !ipucu <metin>',
    ];

    const gameMsg = await client.sendMessage(pending.chatId, centeredBox(lines, 'ADAM ASMACA'));
    game.msg = gameMsg;
    activeGames[pending.chatId] = game;
    await client.sendMessage(senderId, `✅ Kelime "${cleanWord}" belirlendi. Oyun başladı!`);
    return true;
};

handler.pendingWordSelection = pendingWordSelection;
handler.activeGames = activeGames;

module.exports = handler;
