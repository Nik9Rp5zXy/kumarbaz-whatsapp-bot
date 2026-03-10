const { updateBalance, recordWin, recordLoss,
    getUnseenQuestion, markQuestionSeen, getSeenCount, getTotalQuestionCount,
    getSetting, getMilyonerPlayed, incrementMilyonerPlayed } = require('../database/db');
const { sleep, centeredBox, troll, getRandom } = require('./utils');

// ─── Active Games ───
const activeGames = {}; // userId -> { questionIndex, score, currentQ, msg, timer, jokers: { fifty: true, double: true }, doubleActive: false }

// Prize ladder per question index (0-4)
const PRIZES = [250, 500, 1000, 2500, 5000];
const SAFE_POINTS = [0, 250, 750]; // Guaranteed amounts at 0, 1, 2 correct
const DIFFICULTY_MAP = [1, 2, 3, 4, 5]; // question index -> difficulty
const TIME_LIMITS = [30, 25, 20, 15, 10]; // Time limit decays as rounds progress

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
        q.option_a ? `A) ${q.option_a}` : 'A) ░░░░░░',
        q.option_b ? `B) ${q.option_b}` : 'B) ░░░░░░',
        q.option_c ? `C) ${q.option_c}` : 'C) ░░░░░░',
        q.option_d ? `D) ${q.option_d}` : 'D) ░░░░░░',
        ' ',
        `💰 Kazanç: ${game.score} $ | Hedef: +${prize} $`,
        ' ',
        `🃏 Jokerler: ${game.jokers.fifty ? '5️⃣0️⃣' : '❌'} | ${game.jokers.double ? '✌️' : '❌'}`,
        ' ',
        '!cevap A/B/C/D  |  !cekilme (parayı al)',
        '!joker 50       |  !joker cift'
    ];
    
    if (showTimer) lines.push(`⏳ SÜRE: ${game.timeLeft} Saniye`);
    if (game.doubleActive) lines.push('✌️ ÇİFT CEVAP HAKKIN AKTİF!');

    return centeredBox(lines, '💎 KİM MİLYONER OLMAK İSTER 💎');
}

async function startLiveTimer(userId, msg) {
    const game = activeGames[userId];
    if (!game) return;
    
    game.timeLeft = TIME_LIMITS[game.questionIndex];
    if (game.timerInterval) clearInterval(game.timerInterval);
    
    game.timerInterval = setInterval(async () => {
        const g = activeGames[userId];
        if (!g) {
            clearInterval(game.timerInterval);
            return;
        }
        
        g.timeLeft -= 5;
        
        if (g.timeLeft <= 0) {
            // Timeout! Lose everything.
            clearInterval(g.timerInterval);
            delete activeGames[userId];
            try {
                await g.msg.edit(centeredBox([
                    '⏳ SÜRE DOLDU!', ' ',
                    'Süren bittiği için elendin.',
                    'Tüm kazancın ve jokerlerin çöpe gitti 💸',
                    ' ', getRandom(troll.lose)
                ], '💎 MİLYONER - KAYBETTİN 💎'));
            } catch (e) {
                msg.reply('⏳ Süre doldu! Elendin ve tüm kazancını kaybettin.');
            }
        } else {
            // Update the message with the new remaining time
            const questionText = buildQuestionMsg(g, true);
            try { await g.msg.edit(questionText); } catch(e) {}
        }
    }, 5000); // 5 seconds interval
}

async function nextQuestion(userId, game, msg) {
    if (game.questionIndex >= 5) {
        // Won all 5!
        updateBalance(userId, game.score);
        recordWin(userId, game.score);
            if (game.timerInterval) clearInterval(game.timerInterval);
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
    let question = getUnseenQuestion(userId, difficulty);

    if (!question) {
        const seen = getSeenCount(userId);
        const total = getTotalQuestionCount();

        if (game.score > 0) {
            updateBalance(userId, game.score);
            recordWin(userId, game.score);
        }
            if (game.timerInterval) clearInterval(game.timerInterval);
        delete activeGames[userId];

        const lines = [
            '📚 SORU HAVUZU TÜKENDİ!',
            ' ',
            `Bu zorlukta çözmediğin soru kalmadı.`,
            `Toplam çözülen: ${seen}/${total}`, ' ',
            game.score > 0 ? `Kazancın: ${game.score} $ hesabına eklendi.` : '',
            'Yeni soru eklenmesini bekle!',
        ].filter(l => l !== '');

        try { await game.msg.edit(centeredBox(lines, 'BİLGİ')); }
        catch (e) { msg.reply(lines.join('\n')); }
        return;
    }

    // Clone the question because we might modify options for 50-50 joker
    game.currentQ = { ...question };
    game.doubleActive = false; // reset double joker buff if active from previous question
    markQuestionSeen(userId, question.id);

    // INTRO ANIMATION
    const isFinal = game.questionIndex === 4;
    const introTitle = isFinal ? '🔥 FİNAL SORUSU 🔥' : `❓ ${game.questionIndex + 1}. Soru`;
    
    try {
        await game.msg.edit(centeredBox([ `Sıradaki Hedef: ${PRIZES[game.questionIndex]} $`, ' ', 'Hazırlan...', '3' ], introTitle));
        await sleep(1000);
        await game.msg.edit(centeredBox([ `Sıradaki Hedef: ${PRIZES[game.questionIndex]} $`, ' ', 'Hazırlan...', '2' ], introTitle));
        await sleep(1000);
        await game.msg.edit(centeredBox([ `Sıradaki Hedef: ${PRIZES[game.questionIndex]} $`, ' ', 'Hazırlan...', '1' ], introTitle));
        await sleep(1000);
    } catch(e) {}

    game.timeLeft = TIME_LIMITS[game.questionIndex];
    const questionText = buildQuestionMsg(game);
    try {
        await game.msg.edit(questionText);
    } catch (e) {
        game.msg = await msg.reply(questionText);
    }
    
    // Start live timer
    await startLiveTimer(userId, msg);
}

// ─── Handler ───
const handler = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'milyoner':
        case 'quiz': {
            if (activeGames[userId]) return msg.reply('⚠️ Zaten aktif bir oyunun var! !cevap A/B/C/D ile devam et.');

            // ─── Daily Limit Check ───
            const maxDailyLimit = parseInt(getSetting('milyoner_daily_limit')) || 2;
            const playedToday = getMilyonerPlayed(userId);
            
            if (playedToday >= maxDailyLimit) {
                return msg.reply(`⚠️ Günlük sınırına ulaştın! (Bugün ${playedToday}/${maxDailyLimit} oynadın)\nSınırın sıfırlanması için yarını bekle!`);
            }
            incrementMilyonerPlayed(userId);
            // ─────────────────────────

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
                timerInterval: null,
                timeLeft: 30,
                doubleActive: false,
                jokers: { fifty: true, double: true }
            };
            activeGames[userId] = game;

            const introLines = [
                '💎 KİM MİLYONER OLMAK İSTER 💎', ' ',
                '5 soruyu doğru bil, ödülleri topla!',
                'Her soru için ⏳ 30 Saniye süren olacak.', ' ',
                '1. Soru → 250 $',
                '2. Soru → 500 $',
                '3. Soru → 1.000 $',
                '4. Soru → 2.500 $',
                '5. Soru → 5.000 $', ' ',
                `📊 Çözülen: ${seen}/${total}`,
            ];

            const introMsg = await msg.reply(centeredBox([...introLines, ' ', 'Masa hazırlanıyor...'], 'MİLYONER'));
            game.msg = introMsg;

            await sleep(2000);
            await nextQuestion(userId, game, msg);
            return;
        }
        
        case 'joker': {
            const game = activeGames[userId];
            if (!game) return msg.reply('⚠️ Aktif bir oyunun yok. !milyoner ile başla.');
            if (!game.currentQ) return msg.reply('⚠️ Henüz soru yüklenmedi.');
            if (game.questionIndex < 3) return msg.reply(`⚠️ Jokerler sadece 4. ve 5. sorularda kullanılabilir! (Şu anki Soru: ${game.questionIndex + 1})`);
            
            const jokerType = args[0]?.toLowerCase();
            if (jokerType !== '50' && jokerType !== 'cift') return msg.reply('⚠️ Kullanım: !joker 50 veya !joker cift');
            
            if (jokerType === '50') {
                if (!game.jokers.fifty) return msg.reply('⚠️ %50 jokerini zaten kullandın!');
                game.jokers.fifty = false;
                
                const q = game.currentQ;
                const correct = q.correct.toLowerCase();
                const wrongOptions = ['a', 'b', 'c', 'd'].filter(opt => opt !== correct);
                
                // Keep 1 random wrong option, nullify the other 2
                const keepWrongInt = Math.floor(Math.random() * wrongOptions.length);
                const keepWrong = wrongOptions[keepWrongInt];
                
                wrongOptions.forEach(opt => {
                    if (opt !== keepWrong) game.currentQ[`option_${opt}`] = null; // nullifies the text
                });
                
                const questionText = buildQuestionMsg(game, true);
                try { await game.msg.edit(questionText); } catch (e) { } // Ignore if fails
                return msg.reply('💡 %50 Jokeri kullanıldı! 2 yanlış şık silindi.');
            }
            
            if (jokerType === 'cift') {
                if (!game.jokers.double) return msg.reply('⚠️ Çift Cevap jokerini zaten kullandın!');
                if (game.doubleActive) return msg.reply('⚠️ Bu soruda zaten çift cevap hakkın aktif!');
                game.jokers.double = false;
                game.doubleActive = true;
                
                const questionText = buildQuestionMsg(game, true);
                try { await game.msg.edit(questionText); } catch (e) { }
                return msg.reply('✌️ Çift Cevap Jokeri kullanıldı! İlk yanlış cevabında elenmeyeceksin.');
            }
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
            
            const optKey = `option_${answer.toLowerCase()}`;
            if (game.currentQ[optKey] === null) return msg.reply('⚠️ Bu şık elendi. Başka bir şık seç!');

            const correct = game.currentQ.correct;
            const prize = PRIZES[game.questionIndex];
            const correctText = game.currentQ[`option_${correct.toLowerCase()}`];
            const playerText = game.currentQ[optKey];

            if (answer === correct) {
                // Correct!
                    if (game.timerInterval) clearInterval(game.timerInterval);
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
                if (game.doubleActive) {
                    game.doubleActive = false; // used up the extra life
                    game.currentQ[optKey] = null; // eliminate that wrong answer visually
                    const lines = [
                        '❌ YANLIŞ CEVAP!', ' ',
                        `Senin cevabın (${answer}) değildi.`,
                        'Dert etme, ✌️ ÇİFT CEVAP jokerin seni kurtardı!',
                        'Hâlâ süren işliyor, Kalan şıklardan yeni bir !cevap ver!'
                    ];
                    try { await game.msg.edit(buildQuestionMsg(game, true)); } catch (e) {}
                    return msg.reply(centeredBox(lines, 'JOKER KULLANILDI'));
                }
                
                // Real Wrong -> Game Over
                    if (game.timerInterval) clearInterval(game.timerInterval);
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
                if (game.timerInterval) clearInterval(game.timerInterval);

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
