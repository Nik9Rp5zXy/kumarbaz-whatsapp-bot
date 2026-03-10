const { updateBalance, recordWin, recordLoss,
    getUnseenQuestion, markQuestionSeen, getSeenCount, getTotalQuestionCount } = require('../database/db');
const { sleep, centeredBox, troll, getRandom } = require('./utils');

// ─── Active Games ───
const activeGames = {}; // userId -> { questionIndex, score, currentQ, msg, lives, streak }

// Prize ladder per question index (0-4)
const PRIZES = [250, 500, 1000, 2500, 5000];
const SAFE_POINTS = [0, 250, 750]; // Guaranteed amounts at 0, 1, 2 correct
const DIFFICULTY_MAP = [1, 2, 3, 4, 5]; // question index -> difficulty

function buildQuestionMsg(game, showTimer = true) {
    const q = game.currentQ;
    const qNum = game.questionIndex + 1;
    const prize = PRIZES[game.questionIndex];
    const totalPrize = game.score + prize;

    // Prize ladder with marker
    const ladder = PRIZES.map((p, i) => {
        const marker = i === game.questionIndex ? ' ◄ ŞU AN' : '';
        const check = i < game.questionIndex ? '✅' : '⬜';
        return `${check} ${i + 1}. ${p} $${marker}`;
    }).reverse();

    const lines = [
        ...ladder, ' ',
        `❓ Soru ${qNum}/5:`,
        q.question, ' ',
        `A) ${q.option_a}`,
        `B) ${q.option_b}`,
        `C) ${q.option_c}`,
        `D) ${q.option_d}`,
        ' ',
        `💰 Mevcut kazanç: ${game.score} $`,
        `🎯 Doğru cevap: +${prize} $`,
        ' ',
        '!cevap A/B/C/D  |  !cekilme (parayı al kaç)',
    ];

    return centeredBox(lines, '💎 KİM MİLYONER OLMAK İSTER 💎');
}

async function nextQuestion(userId, game, msg) {
    if (game.questionIndex >= 5) {
        // Won all 5!
        updateBalance(userId, game.score);
        recordWin(userId, game.score);
        delete activeGames[userId];

        try {
            await game.msg.edit(centeredBox([
                '🏆🏆🏆 TEBRİKLER! 🏆🏆🏆', ' ',
                'TÜM SORULARI BİLDİN!', ' ',
                `Toplam Kazanç: ${game.score} $`,
                'Sen bir efsanesin!',
            ], '💎 MİLYONER ŞAMPİYONU 💎'));
        } catch (e) { msg.reply('🏆 TEBRİKLER! Tüm soruları bildin.'); }
        return;
    }

    const difficulty = DIFFICULTY_MAP[game.questionIndex];
    const question = getUnseenQuestion(userId, difficulty);

    if (!question) {
        // No unseen questions at this difficulty
        const seen = getSeenCount(userId);
        const total = getTotalQuestionCount();

        if (game.score > 0) {
            updateBalance(userId, game.score);
            recordWin(userId, game.score);
        }
        delete activeGames[userId];

        const lines = [
            '📚 SORU HAVUZU TÜKENDİ!',
            ' ',
            `Bu zorlukta çözmediğin soru kalmadı.`,
            `Toplam çözülen: ${seen}/${total}`, ' ',
            game.score > 0 ? `Kazancın: ${game.score} $` : '',
            'Yeni soru eklenmesini bekle!',
        ].filter(l => l !== '');

        try { await game.msg.edit(centeredBox(lines, 'BİLGİ')); }
        catch (e) { msg.reply(lines.join('\n')); }
        return;
    }

    game.currentQ = question;
    markQuestionSeen(userId, question.id);

    const questionText = buildQuestionMsg(game);
    try {
        await game.msg.edit(questionText);
    } catch (e) {
        // If message was deleted, send a new one
        game.msg = await msg.reply(questionText);
    }
}

// ─── Handler ───
const handler = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'milyoner':
        case 'quiz': {
            if (activeGames[userId]) return msg.reply('⚠️ Zaten aktif bir oyunun var! !cevap A/B/C/D ile devam et.');

            const seen = getSeenCount(userId);
            const total = getTotalQuestionCount();

            // Check if any questions left
            const testQ = getUnseenQuestion(userId, 1);
            if (!testQ) {
                return msg.reply(centeredBox([
                    '📚 Tüm soruları bitirdin!',
                    `Çözülen: ${seen}/${total}`,
                    'Yeni soru eklenmesini bekle.',
                ], 'MİLYONER'));
            }

            const game = {
                questionIndex: 0,
                score: 0,
                currentQ: null,
                msg: null,
            };
            activeGames[userId] = game;

            const introLines = [
                '💎 KİM MİLYONER OLMAK İSTER 💎', ' ',
                '5 soruyu doğru bil, ödülleri topla!', ' ',
                '1. Soru → 250 $',
                '2. Soru → 500 $',
                '3. Soru → 1.000 $',
                '4. Soru → 2.500 $',
                '5. Soru → 5.000 $', ' ',
                `📊 Çözülen: ${seen}/${total}`,
            ];

            const introMsg = await msg.reply(centeredBox([...introLines, ' ', '⏳ BAŞLIYOR: 10'], 'MİLYONER'));
            game.msg = introMsg;

            // Countdown 10s
            for (let i = 9; i > 0; i--) {
                await sleep(1000);
                try {
                    await introMsg.edit(centeredBox([...introLines, ' ', `⏳ BAŞLIYOR: ${i}`], 'MİLYONER'));
                } catch (e) { break; }
            }
            await sleep(1000);

            await nextQuestion(userId, game, msg);
            return;
        }

        case 'cevap':
        case 'answer': {
            const game = activeGames[userId];
            if (!game) return msg.reply('⚠️ Aktif oyunun yok. !milyoner ile başla.');
            if (!game.currentQ) return msg.reply('⚠️ Henüz soru yüklenmedi.');

            if (args.length === 0) return msg.reply('⚠️ Kullanım: !cevap A/B/C/D');
            const answer = args[0].toUpperCase();
            if (!['A', 'B', 'C', 'D'].includes(answer)) return msg.reply('⚠️ A, B, C veya D yaz.');

            const correct = game.currentQ.correct;
            const prize = PRIZES[game.questionIndex];
            const correctText = game.currentQ[`option_${correct.toLowerCase()}`];
            const playerText = game.currentQ[`option_${answer.toLowerCase()}`];

            if (answer === correct) {
                // Correct!
                game.score += prize;
                game.questionIndex++;

                const resultLines = [
                    '✅ DOĞRU!', ' ',
                    `Cevap: ${correct}) ${correctText}`,
                    `+${prize} $ kazandın!`, ' ',
                    `💰 Toplam: ${game.score} $`,
                ];

                try { await game.msg.edit(centeredBox(resultLines, '💎 MİLYONER 💎')); }
                catch (e) { game.msg = await msg.reply(centeredBox(resultLines, '💎 MİLYONER 💎')); }

                await sleep(2000);
                await nextQuestion(userId, game, msg);
                return;
            } else {
                // Wrong
                const safeAmount = game.score > 0 ? Math.floor(game.score * 0.25) : 0;
                if (safeAmount > 0) {
                    updateBalance(userId, safeAmount);
                    recordWin(userId, safeAmount);
                }

                const resultLines = [
                    '❌ YANLIŞ!', ' ',
                    `Senin cevabın: ${answer}) ${playerText}`,
                    `Doğru cevap: ${correct}) ${correctText}`, ' ',
                    `Toplam kazancın: ${game.score} $`,
                    safeAmount > 0 ? `Güvence: ${safeAmount} $ (25%)` : 'Güvence: 0 $',
                    ' ', getRandom(troll.lose),
                ];

                try { await game.msg.edit(centeredBox(resultLines, '💎 MİLYONER - KAYBETTİN 💎')); }
                catch (e) { msg.reply(centeredBox(resultLines, '💎 MİLYONER - KAYBETTİN 💎')); }

                delete activeGames[userId];
                return;
            }
        }

        case 'cekilme':
        case 'cekil':
        case 'quit': {
            const game = activeGames[userId];
            if (!game) return msg.reply('⚠️ Aktif oyunun yok.');

            if (game.score > 0) {
                updateBalance(userId, game.score);
                recordWin(userId, game.score);
            }

            try {
                await game.msg.edit(centeredBox([
                    '🏃 ÇEKİLDİN!', ' ',
                    `Kazancın: ${game.score} $`,
                    'Akıllı hamle mi korkak hamle mi?',
                ], '💎 MİLYONER 💎'));
            } catch (e) { msg.reply(`🏃 Çekildin! Kazanç: ${game.score} $`); }

            delete activeGames[userId];
            return;
        }

        default:
            return false;
    }
};

module.exports = handler;
