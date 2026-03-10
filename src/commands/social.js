const { getUser, addUser, updateBalance, recordWin, recordLoss, getTopUsers, getTopActiveUsers,
    addWanted, getWanted, getAllWanted, removeWanted, marry, divorce } = require('../database/db');
const { sleep, centeredBox, troll, getRandom, getTitle, progressBar } = require('./utils');
const hangmanModule = require('./hangman');

// Active group events
const activeRoulettes = {};  // chatId -> { participants, timer, msg, countdownInterval, endTime }
const activeBosses = {};     // chatId -> { hp, maxHp, participants, msg, timer, countdownInterval, endTime }

// Export for cancel command access
module.exports.activeRoulettes = activeRoulettes;
module.exports.activeBosses = activeBosses;

const kaderEvents = [
    { text: '💸 Cebinden para düştü!', amount: -200 },
    { text: '🍀 Yerden 100$ buldun!', amount: 100 },
    { text: '🎁 Gizemli paket! +500$', amount: 500 },
    { text: '🦅 Kuş kafana sıçtı. -50$', amount: -50 },
    { text: '🏆 Yarışma kazandın! +300$', amount: 300 },
    { text: '🚗 Araba çarptı, hastane masrafı. -400$', amount: -400 },
    { text: '💼 İş buldun! +250$', amount: 250 },
    { text: '🎰 Sokakta slot makinesi buldun. Kaybettin. -150$', amount: -150 },
    { text: '🐕 Köpek ısırdı. Aşı parası. -100$', amount: -100 },
    { text: '💎 Eski ceketin cebinde elmas buldun! +800$', amount: 800 },
    { text: '📱 Telefonun çalındı. -300$', amount: -300 },
    { text: '🤑 Amcan miras bıraktı! +1000$', amount: 1000 },
    { text: '🍕 Pizza söyledin ama param yetmedi. -75$', amount: -75 },
    { text: '⚡ Hiçbir şey olmadı. Sıkıcı bir gün.', amount: 0 },
];

const falciMessages = [
    "Yakında büyük bir kazanç göreceğim... ama sende değil 😂",
    "Mars retrogradda, tüm paranı kaybedeceksin.",
    "Bir yolculuk var... ATM'ye kadar.",
    "Aşk hayatın parlak ama cüzdanın karanlık.",
    "Sana bir harf görüyorum... F.",
    "Gelecek hafta şansın açılacak... Ama bu hafta değil.",
    "Büyük bir düello kazanacaksın... rüyanda.",
    "Biri seni düşünüyor... borç isteyecek.",
    "Slot makinelerinden uzak dur... dinlemeyeceksin ama söyledim.",
    "Yarın zengin uyanacaksın! Şaka, yarın da fakirsin.",
    "Kaderine boyun eğ. Sen eternally fakirsin.",
    "Bir servet görüyorum ama senin değil, rakibinin.",
    "Kristal küre diyor ki: 'Niye hala burdasın?'",
    "Evlilik var yakında... bot ile evlenme sakın.",
];

// Helper: update rulet message with live timer
const updateRouletteMsg = async (chatId) => {
    const roulette = activeRoulettes[chatId];
    if (!roulette || !roulette.msg) return;

    const remaining = Math.max(0, Math.ceil((roulette.endTime - Date.now()) / 1000));
    const names = roulette.participants.map(p => `@${p.id.split('@')[0]}`).join(', ');
    const pool = roulette.participants.reduce((s, p) => s + p.bet, 0);

    try {
        await roulette.msg.edit(centeredBox([
            '🎯 RULET AKTİF! 🎯',
            `Bahis: ${roulette.minBet} $`,
            `Katılımcılar: ${roulette.participants.length}`,
            names,
            ' ',
            `Havuz: ${pool} $`,
            `⏱️ Kalan: ${remaining} sn`,
        ], 'GRUP RULETİ'));
    } catch (e) { }
};

// Helper: update boss message with live timer
const updateBossMsg = async (chatId) => {
    const boss = activeBosses[chatId];
    if (!boss || !boss.msg) return;

    const remaining = Math.max(0, Math.ceil((boss.endTime - Date.now()) / 1000));

    try {
        await boss.msg.edit(centeredBox([
            '👹 BOSS SAVAŞI 👹',
            ' ',
            `HP: ${progressBar(boss.hp, boss.maxHp)} ${boss.hp}/${boss.maxHp}`,
            ' ',
            `Ödül Havuzu: ${boss.reward} $`,
            `Katılımcı: ${Object.keys(boss.participants).length} kişi`,
            `⏱️ Kalan: ${remaining} sn`,
            ' ',
            '!vur ile saldır!',
        ], 'BOSS FIGHT'));
    } catch (e) { }
};

module.exports = async (command, args, msg, userId, user, resolve) => {
    const chatId = msg.from;

    switch (command) {
        // ─── İPTAL ───
        case 'iptal':
        case 'cancel': {
            let cancelled = false;

            // Cancel rulet
            if (activeRoulettes[chatId]) {
                const roulette = activeRoulettes[chatId];
                clearTimeout(roulette.timer);
                clearInterval(roulette.countdownInterval);
                // Refund everyone
                for (const p of roulette.participants) {
                    updateBalance(p.id, p.bet);
                }
                try {
                    await roulette.msg.edit(centeredBox(['❌ RULET İPTAL EDİLDİ ❌', 'Paralar iade edildi.'], 'İPTAL'));
                } catch (e) { }
                delete activeRoulettes[chatId];
                cancelled = true;
            }

            // Cancel boss
            if (activeBosses[chatId]) {
                const boss = activeBosses[chatId];
                clearTimeout(boss.timer);
                clearInterval(boss.countdownInterval);
                try {
                    await boss.msg.edit(centeredBox(['❌ BOSS SAVAŞI İPTAL ❌', 'Boss kaçtı!'], 'İPTAL'));
                } catch (e) { }
                delete activeBosses[chatId];
                cancelled = true;
            }

            // Cancel hangman
            if (hangmanModule.activeGames && hangmanModule.activeGames[chatId]) {
                const game = hangmanModule.activeGames[chatId];
                if (game.bet > 0) {
                    updateBalance(game.setter, game.bet);
                    updateBalance(game.guesser, game.bet);
                }
                try { await game.msg.edit(centeredBox(['❌ ADAM ASMACA İPTAL ❌', 'Paralar iade edildi.'], 'İPTAL')); } catch (e) { }
                delete hangmanModule.activeGames[chatId];
                cancelled = true;
            }

            if (cancelled) return msg.reply('✅ Aktif etkinlikler iptal edildi. Paralar iade edildi.');
            return msg.reply('⚠️ İptal edilecek aktif etkinlik yok.');
        }

        // ─── RULET ───
        case 'rulet':
        case 'roulette': {
            const bet = parseInt(args[0]);
            if (isNaN(bet) || bet <= 0) return msg.reply('⚠️ Kullanım: !rulet <miktar>\nSonra herkes !katil ile katılır.');
            if (bet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);
            if (activeRoulettes[chatId]) return msg.reply('⚠️ Zaten aktif bir rulet var! Bitsin bekle.');

            const RULET_DURATION = 30000; // 30 seconds
            const endTime = Date.now() + RULET_DURATION;

            activeRoulettes[chatId] = {
                participants: [{ id: userId, bet }],
                minBet: bet,
                starter: userId,
                endTime,
            };

            updateBalance(userId, -bet);

            const ruletMsg = await msg.reply(centeredBox([
                '🎯 RULET BAŞLADI! 🎯',
                `Bahis: ${bet} $`,
                `Katılımcılar: 1`,
                `@${userId.split('@')[0]}`,
                ' ',
                `⏱️ Kalan: 30 sn`,
                '!katil yazarak katıl!',
            ], 'GRUP RULETİ'));

            activeRoulettes[chatId].msg = ruletMsg;

            // Live countdown every 5 seconds
            activeRoulettes[chatId].countdownInterval = setInterval(() => updateRouletteMsg(chatId), 5000);

            // End timer
            activeRoulettes[chatId].timer = setTimeout(async () => {
                clearInterval(activeRoulettes[chatId]?.countdownInterval);
                const roulette = activeRoulettes[chatId];
                if (!roulette) return;

                const participants = roulette.participants;
                if (participants.length < 2) {
                    updateBalance(participants[0].id, participants[0].bet);
                    delete activeRoulettes[chatId];
                    return ruletMsg.edit(centeredBox(['❌ Yeterli katılımcı yok.', 'Para iade edildi.'], 'RULET İPTAL'));
                }

                await ruletMsg.edit(centeredBox(['🔄 Çark dönüyor...', `${participants.length} kişi havuzda!`], 'GRUP RULETİ'));
                await sleep(2000);

                const totalPot = participants.reduce((sum, p) => sum + p.bet, 0);
                const winner = participants[Math.floor(Math.random() * participants.length)];

                updateBalance(winner.id, totalPot);
                recordWin(winner.id, totalPot - winner.bet);
                participants.filter(p => p.id !== winner.id).forEach(p => recordLoss(p.id, p.bet));

                await ruletMsg.edit(centeredBox([
                    '🎯 SONUÇ 🎯', ' ',
                    `Toplam Havuz: ${totalPot} $`,
                    `Katılımcı: ${participants.length} kişi`, ' ',
                    `🏆 KAZANAN: @${winner.id.split('@')[0]}`,
                    `Net Kar: +${totalPot - winner.bet} $`,
                ], 'RULET SONUCU'));
                delete activeRoulettes[chatId];
            }, RULET_DURATION);

            return;
        }

        case 'katil':
        case 'join': {
            const roulette = activeRoulettes[chatId];
            if (!roulette) return msg.reply('⚠️ Aktif rulet yok. !rulet <miktar> ile başlat.');
            if (roulette.participants.some(p => p.id === userId)) return msg.reply('⚠️ Zaten katıldın.');
            if (user.balance < roulette.minBet) return msg.reply(`⚠️ ${getRandom(troll.poor)} (Min: ${roulette.minBet} $)`);

            updateBalance(userId, -roulette.minBet);
            roulette.participants.push({ id: userId, bet: roulette.minBet });

            // Immediately update the message with new participant
            await updateRouletteMsg(chatId);
            return msg.reply(`✅ @${userId.split('@')[0]} katıldı! (${roulette.participants.length} kişi)`);
        }

        // ─── WANTED ───
        case 'wanted': {
            if (args.length < 1) {
                const list = getAllWanted();
                if (list.length === 0) return msg.reply(centeredBox(['Şu an aranan kimse yok.', 'Suçsuz bir dünya... Sıkıcı.'], 'ARANANLAR'));
                const lines = list.map((w, i) => `${i + 1}. @${w.target_id.split('@')[0]} — ${w.bounty} $ ödül`);
                return msg.reply(centeredBox(lines, '🏴‍☠️ ARANANLAR LİSTESİ'));
            }

            const wTarget = msg.mentionedIds[0];
            if (!wTarget) return msg.reply('⚠️ Kimi aranan ilan edeceksin?');
            const normWTarget = resolve(wTarget);

            let bounty = parseInt(args[1]);
            if (isNaN(bounty)) {
                const numArg = args.find(a => !isNaN(parseInt(a)) && !a.includes('@'));
                if (numArg) bounty = parseInt(numArg);
            }
            if (isNaN(bounty) || bounty < 100) return msg.reply('⚠️ En az 100$ ödül koy.');
            if (bounty > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            updateBalance(userId, -bounty);
            addWanted(normWTarget, userId, bounty);

            return msg.reply(centeredBox([
                '╔══════════════════╗',
                '║   🏴‍☠️ ARANIYOR 🏴‍☠️   ║',
                '╠══════════════════╣',
                `║ @${normWTarget.split('@')[0]}`,
                `║ ÖDÜL: ${bounty} $`,
                '║ ÖLÜ YA DA DİRİ  ║',
                '╚══════════════════╝',
                ' ', 'Bu kişiyi soyan +%50 bonus alır!'
            ], 'WANTED'));
        }

        // ─── BOSS FIGHT ───
        case 'boss': {
            if (activeBosses[chatId]) return msg.reply('⚠️ Zaten aktif bir boss var! !vur ile saldır.');

            const BOSS_DURATION = 120000; // 2 minutes
            const bossHp = 500 + Math.floor(Math.random() * 500);
            const bossReward = Math.floor(bossHp * 1.5);
            const endTime = Date.now() + BOSS_DURATION;

            activeBosses[chatId] = {
                hp: bossHp, maxHp: bossHp, reward: bossReward,
                participants: {}, startedBy: userId, endTime,
            };

            const bossMsg = await msg.reply(centeredBox([
                '👹 BOSS ORTAYA ÇIKTI! 👹',
                ' ',
                `HP: ${progressBar(bossHp, bossHp)} ${bossHp}/${bossHp}`,
                ' ',
                `Ödül Havuzu: ${bossReward} $`,
                `⏱️ Kalan: 120 sn`,
                ' ',
                '!vur yazarak saldır!',
                '(Her vuruş 20-80 hasar)',
            ], 'BOSS FIGHT'));

            activeBosses[chatId].msg = bossMsg;

            // Live countdown every 10 seconds
            activeBosses[chatId].countdownInterval = setInterval(() => updateBossMsg(chatId), 10000);

            // Auto-expire
            activeBosses[chatId].timer = setTimeout(async () => {
                clearInterval(activeBosses[chatId]?.countdownInterval);
                if (activeBosses[chatId]) {
                    try {
                        await bossMsg.edit(centeredBox(['👹 Boss kaçtı!', 'Yeterince hızlı vuramadınız.', '⏱️ Süre doldu!'], 'BOSS KAÇTI'));
                    } catch (e) { }
                    delete activeBosses[chatId];
                }
            }, BOSS_DURATION);

            return;
        }

        case 'vur':
        case 'hit':
        case 'attack': {
            const boss = activeBosses[chatId];
            if (!boss) return msg.reply('⚠️ Aktif boss yok. !boss ile başlat.');

            const damage = Math.floor(Math.random() * 60) + 20;
            boss.hp -= damage;
            boss.participants[userId] = (boss.participants[userId] || 0) + damage;

            if (boss.hp <= 0) {
                clearTimeout(boss.timer);
                clearInterval(boss.countdownInterval);
                boss.hp = 0;

                const totalDamage = Object.values(boss.participants).reduce((a, b) => a + b, 0);
                const participants = Object.entries(boss.participants);

                const resultLines = [
                    '💀 BOSS DÜŞTÜ! 💀', ' ',
                    `HP: ${progressBar(0, boss.maxHp)} 0/${boss.maxHp}`,
                    ' ', '--- ÖDÜLLER ---',
                ];

                for (const [pid, dmg] of participants) {
                    const share = Math.floor((dmg / totalDamage) * boss.reward);
                    updateBalance(pid, share);
                    recordWin(pid, share);
                    resultLines.push(`@${pid.split('@')[0]}: ${dmg} hasar → +${share} $`);
                }

                try { await boss.msg.edit(centeredBox(resultLines, 'ZAFER!')); } catch (e) { }
                delete activeBosses[chatId];
                return;
            }

            // Update with current timer
            const remaining = Math.max(0, Math.ceil((boss.endTime - Date.now()) / 1000));
            try {
                await boss.msg.edit(centeredBox([
                    '👹 BOSS SAVAŞI 👹', ' ',
                    `HP: ${progressBar(boss.hp, boss.maxHp)} ${boss.hp}/${boss.maxHp}`,
                    ' ',
                    `Son vuruş: @${userId.split('@')[0]} → ${damage} hasar!`,
                    `Katılımcı: ${Object.keys(boss.participants).length} kişi`,
                    `⏱️ Kalan: ${remaining} sn`,
                    ' ', '!vur ile saldırmaya devam et!',
                ], 'BOSS FIGHT'));
            } catch (e) { }
            return;
        }

        // ─── PROFİL ───
        case 'profil':
        case 'profile': {
            let targetId = userId;
            if (msg.mentionedIds[0]) targetId = resolve(msg.mentionedIds[0]);
            let target = getUser(targetId);
            if (!target) target = addUser(targetId);

            const totalGames = (target.games_won || 0) + (target.games_lost || 0);
            const winRate = totalGames > 0 ? Math.round((target.games_won / totalGames) * 100) : 0;
            const title = getTitle(target.balance);

            const lines = [
                `👤 @${targetId.split('@')[0]}`,
                title, ' ',
                `💸 Bakiye: ${target.balance} $`,
                `💬 Mesaj: ${target.msg_count || 0}`, ' ',
                `🏆 Kazanma: ${target.games_won || 0}`,
                `💀 Kaybetme: ${target.games_lost || 0}`,
                `📊 Oran: %${winRate}`, ' ',
                `📈 Toplam Kazanç: +${target.total_won || 0} $`,
                `📉 Toplam Kayıp: -${target.total_lost || 0} $`,
                `💰 Net: ${(target.total_won || 0) - (target.total_lost || 0)} $`,
            ];
            if (target.spouse) lines.push(' ', `💍 Eş: @${target.spouse.split('@')[0]}`);
            const wanted = getWanted(targetId);
            if (wanted) lines.push(' ', `🏴‍☠️ ARANIYOR! Ödül: ${wanted.bounty} $`);
            return msg.reply(centeredBox(lines, 'PROFİL'));
        }

        // ─── KADER ───
        case 'kader':
        case 'fate': {
            let targetId = userId;
            if (msg.mentionedIds[0]) targetId = resolve(msg.mentionedIds[0]);
            let target = getUser(targetId);
            if (!target) target = addUser(targetId);

            const kaderMsg = await msg.reply(centeredBox(['🔮 Kader çarkı dönüyor...', `@${targetId.split('@')[0]}`], 'KADER'));
            await sleep(2000);

            const event = kaderEvents[Math.floor(Math.random() * kaderEvents.length)];
            if (event.amount !== 0) {
                updateBalance(targetId, event.amount);
                if (event.amount > 0) recordWin(targetId, event.amount);
                else recordLoss(targetId, Math.abs(event.amount));
            }

            const sign = event.amount > 0 ? '+' : '';
            const resultLines = [
                `🎭 @${targetId.split('@')[0]}`, ' ',
                event.text,
                event.amount !== 0 ? `${sign}${event.amount} $` : '',
            ].filter(l => l);
            await kaderMsg.edit(centeredBox(resultLines, 'KADERİN YAZISI'));
            return;
        }

        // ─── FALCI ───
        case 'falci':
        case 'fortune': {
            let targetId = userId;
            if (msg.mentionedIds[0]) targetId = resolve(msg.mentionedIds[0]);
            const falciMsg = await msg.reply(centeredBox(['🔮 Kristal küreye bakıyorum...', `@${targetId.split('@')[0]}`], 'FALCI'));
            await sleep(2000);
            const prediction = falciMessages[Math.floor(Math.random() * falciMessages.length)];
            await falciMsg.edit(centeredBox([`🔮 @${targetId.split('@')[0]}`, ' ', prediction], 'FAL SONUCU'));
            return;
        }

        // ─── UNVAN ───
        case 'unvan':
        case 'title': {
            const title = getTitle(user.balance);
            return msg.reply(centeredBox([
                `👤 @${userId.split('@')[0]}`, ' ',
                `Unvanın: ${title}`, ' ',
                `💸 ${user.balance} $`, ' ',
                '--- UNVANLAR ---',
                '💀 Borçlu: <0$', '🗑️ Çöpçü: 0-499$',
                '🫘 Fakir: 500-1999$', '🪙 Orta Halli: 2000-4999$',
                '💰 Varlıklı: 5000-9999$', '🏆 Zengin: 10000-19999$',
                '💎 Milyoner: 20000-49999$', '👑 Sultan: 50000$+',
            ], 'UNVAN'));
        }

        // ─── EVLİLİK ───
        case 'evlilik':
        case 'evlen':
        case 'marry': {
            if (!msg.mentionedIds[0]) {
                if (user.spouse) {
                    return msg.reply(centeredBox([
                        `💍 Eşin: @${user.spouse.split('@')[0]}`, ' ', 'Boşanmak için: !bosanma',
                    ], 'EVLİLİK DURUMU'));
                }
                return msg.reply('⚠️ Kullanım: !evlilik @kisi');
            }
            const partnerId = resolve(msg.mentionedIds[0]);
            if (partnerId === userId) return msg.reply('⚠️ Kendile evlenemezsin...');
            if (user.spouse) return msg.reply('⚠️ Zaten evlisin! Önce boşan: !bosanma');
            let partner = getUser(partnerId);
            if (!partner) partner = addUser(partnerId);
            if (partner.spouse) return msg.reply('⚠️ O kişi zaten evli.');

            const weddingCost = 1000;
            if (user.balance < weddingCost) return msg.reply(`⚠️ Düğün masrafı ${weddingCost} $. ${getRandom(troll.poor)}`);

            updateBalance(userId, -weddingCost);
            marry(userId, partnerId);

            const weddingMsg = await msg.reply(centeredBox(['💒 Düğün hazırlıkları...'], 'EVLİLİK'));
            await sleep(2000);
            await weddingMsg.edit(centeredBox([
                '💍 TEBRİKLER! 💍', ' ',
                `@${userId.split('@')[0]}`, '❤️', `@${partnerId.split('@')[0]}`,
                ' ', 'Artık resmen evlisiniz!',
                'Düğün masrafı: -1000 $', ' ',
                '(Eşiniz kazandığında +%10 bonus)',
            ], 'NİKAH TÖRENİ'), null, { mentions: [partnerId] });
            return;
        }

        case 'bosanma':
        case 'divorce': {
            if (!user.spouse) return msg.reply('⚠️ Zaten bekarsın.');
            const exSpouse = user.spouse;
            divorce(userId);
            return msg.reply(centeredBox([
                '💔 BOŞANMA 💔', ' ',
                `@${userId.split('@')[0]} & @${exSpouse.split('@')[0]}`,
                ' ', 'Yollarınız ayrıldı.',
            ], 'MAHKEMEMİZ'));
        }

        // ─── SIRALAMA ───
        case 'siralama':
        case 'top':
        case 'leaderboard': {
            const mode = args[0] ? args[0].toLowerCase() : 'para';
            if (mode === 'aktif' || mode === 'msg' || mode === 'mesaj') {
                const activeUsers = getTopActiveUsers(5);
                const lines = activeUsers.map((u, i) => `#${i + 1} | ${u.id.split('@')[0].slice(-4).padStart(4, '*')} | ${u.msg_count} msj`);
                return msg.reply(centeredBox(lines, '🗣️ ÇENESİ DÜŞÜKLER 🗣️'));
            } else {
                const topUsers = getTopUsers(5);
                const lines = topUsers.map((u, i) => `#${i + 1} | ${u.id.split('@')[0].slice(-4).padStart(4, '*')} | ${u.balance} $`);
                return msg.reply(centeredBox(lines, '🏆 ZENGİNLER KULÜBÜ 🏆'));
            }
        }

        // ─── EĞLENCE (YALAN / GAY) ───
        case 'yalan':
        case 'lie': {
            if (!msg.hasQuotedMsg) return msg.reply('⚠️ Bir mesajı yanıtlayarak kullanmalısın.');

            const percent = Math.floor(Math.random() * 101);
            let comment = '';
            if (percent === 0) comment = 'Yalan yok, saf gerçek.';
            else if (percent < 20) comment = 'Ufak tefek atmalar var.';
            else if (percent < 50) comment = 'Şüpheli konuşuyor...';
            else if (percent < 80) comment = 'Bayağı sallıyor!';
            else if (percent < 100) comment = 'Pinokyo bile bu kadar uzatmadı burnunu.';
            else comment = 'KUYRUKLU YALAN! İnanma buna.';

            return msg.reply(centeredBox([
                '🤥 YALAN METRE 🤥', ' ',
                `Doğruluk Payı: %${100 - percent}`,
                `Yalan Oranı: %${percent}`, ' ',
                comment
            ], 'ANALİZ'));
        }

        case 'gay':
        case 'gey':
        case 'top': {
            let textToCheck = args.join(' ').toLowerCase();
            let targetName = 'Sen';

            if (msg.hasQuotedMsg && !textToCheck) {
                const quoted = await msg.getQuotedMessage();
                textToCheck = quoted.body.toLowerCase();
                targetName = 'Bu mesaj';
            } else if (msg.mentionedIds && msg.mentionedIds[0]) {
                const normMention = resolve(msg.mentionedIds[0]);
                targetName = `@${normMention.split('@')[0]}`;
                // For mentions, we still check args if they typed something like "!gay @user valorant"
                // But usually !gay @user is just random.
            } else if (!textToCheck) {
                // Self check
                targetName = `@${userId.split('@')[0]}`;
            }

            // Keyword checks
            if (textToCheck.includes('valorant') || textToCheck.includes('valo') || textToCheck.includes('vllrnt')) {
                return msg.reply(centeredBox([
                    `🏳️‍🌈 GAY METRE 🏳️‍🌈`, ' ',
                    `Hedef: ${targetName}`,
                    `Gaylik Seviyesi: %1000 (MAX)`, ' ',
                    '💅 VALORANTÇI TESPİT EDİLDİ 💅',
                    'Kaçış yok, geçmiş olsun.'
                ], '🌈 SONUÇ 🌈'));
            }

            if (textToCheck.includes('cs') || textToCheck.includes('csgo') || textToCheck.includes('counter') || textToCheck.includes('cs2')) {
                return msg.reply(centeredBox([
                    `💪 GAY METRE 💪`, ' ',
                    `Hedef: ${targetName}`,
                    `Gaylik Seviyesi: %0`, ' ',
                    '🧱 ADAM GİBİ ADAM 🧱',
                    'Beton yetmez.'
                ], '🗿 SONUÇ 🗿'));
            }

            // Random fallback
            const percent = Math.floor(Math.random() * 101);
            let comment = '';
            if (percent === 0) comment = 'Beton yetmez kral.';
            else if (percent < 25) comment = 'Delikanlı adamsın.';
            else if (percent < 50) comment = 'Biraz yumuşaklık var.';
            else if (percent < 75) comment = 'Tehlikeli sularda yüzüyorsun.';
            else if (percent < 100) comment = 'Gökkuşağı çıkmak üzere...';
            else comment = '🏳️‍🌈 HAYIRLI OLSUN 🏳️‍🌈';

            return msg.reply(centeredBox([
                `🌈 GAY METRE 🌈`, ' ',
                `Hedef: ${targetName}`,
                `Gaylik Seviyesi: %${percent}`, ' ',
                comment
            ], 'SONUÇ'));
        }

        // ─── YARDIM ───
        case 'yardim':
        case 'help':
        case 'komutlar': {
            const isDetailed = args[0] && (args[0].toLowerCase() === 'full' || args[0].toLowerCase() === 'detay');

            if (isDetailed) {
                return msg.reply(centeredBox([
                    '🎰 ═══ KUMARHANELER ═══ 🎰',
                    ' ',
                    '!bj <bahis> — Blackjack',
                    '  !hit — Çek | !dur — Kal',
                    '!milyoner — 5 Soruluk Oyun',
                    '  !cevap A — !cekilme',
                    '  !joker 50 — !joker cift',
                    '!yazitura <bahis>',
                    '!slot <bahis> — 🎰',
                    '!zar <bahis> — Yüksek kazanır',
                    '!rulet <bahis> — Grup oyunu',
                    ' ',
                    '🦁 ══ HAYVANAT BAHÇESİ ══ 🦁',
                    ' ',
                    '!av — Hayvan avla (kazanç)',
                    '!savas — Hayvanını salla',
                    '!market — Yeni hayvan al',
                    '!takim — Takımını kur',
                    '!envanter — Tüm listen',
                    '!otoolustur — Oto dizilim',
                    '!zoo — Detaylı zoo menüsü',
                    ' ',
                    '⚔️ ══ AKSİYON & SOSYAL ══ ⚔️',
                    ' ',
                    '!duello @kisi <bahis> — 1v1',
                    '!soygun — Riskli hırsızlık',
                    '!wanted — Arananlar listesi',
                    '!aa — Adam Asmaca',
                    '  !ipucu — Harf iste',
                    '!evlilik @kisi — Yüzük tak',
                    '!profil — İstatistiklerin',
                    '!kader — Fal ve kader',
                    '!yalan (yanıtla) — Analiz',
                    '!gay — %kaç gay?',
                    ' ',
                    '🏦 ════ BANKA SİSTEMİ ════ 🏦',
                    ' ',
                    '!banka — Hesap durumun',
                    '!yatir <miktar> | !yatir hepsi',
                    '!cek <miktar> | !cek hepsi',
                    '!faiz — Faiz yüzdeleri',
                    '  💡 Saatlik %1 faiz (Max %50)',
                    ' ',
                    '📈 ════ BORSA SİSTEMİ ════ 📈',
                    ' ',
                    '!borsa — Hisseleri listele',
                    '!hisse <kod> — Detay gör',
                    '!al <kod> <adet>',
                    '!sat <kod> <adet> | hepsi',
                    '!portfoy — Cüzdanın',
                    '  💡 5 dk\'da bir güncellenir',
                    ' ',
                    '🏆 ══ TURNUVA SİSTEMİ ══ 🏆',
                    ' ',
                    '!turnuva <bahis> — Başlat',
                    '!katil — Turnuvaya gir',
                    '!bracket — Ağaç tablosu',
                    '  🥇 %75 birinci, %25 ikinci',
                    ' ',
                    '⚙️ ══ TEMEL KOMUTLAR  ══ ⚙️',
                    ' ',
                    '!hava <şehir> — Durum',
                    '!gunluk — Günlük 500$',
                    '!bakiye — Paranı gör',
                    '!transfer @kisi <para>',
                    '!siralama — Zenginler',
                    '!iptal — Buglı menüyü kapat',
                ], 'DETAYLI KOMUT KILAVUZU'));
            }

            return msg.reply(centeredBox([
                '🎰 ---- KUMARHANELER ---- 🎰',
                '!bj <bahis> · !hit · !dur',
                '!milyoner · !cevap · !cekilme',
                '!yazitura · !slot · !zar',
                '!rulet · !katil',
                ' ', '🦁 -- HAYVANAT BAHÇESİ -- 🦁',
                '!av · !savas · !market',
                '!takim · !envanter · !zoo',
                ' ', '⚔️ --- AKSİYON & SOSYAL --- ⚔️',
                '!duello · !soygun · !wanted',
                '!aa · !ipucu (Adam Asmaca)',
                '!evlilik · !profil · !kader',
                '!yalan (m) · !gay',
                ' ', '🏦 --- BANKA & BORSA --- 🏦',
                '!banka · !yatir · !cek · !faiz',
                '!borsa · !hisse · !al · !sat',
                ' ', '🏆 ------ TURNUVA ------ 🏆',
                '!turnuva <bahis> · !katil',
                ' ', '⚙️ --- TEMEL KOMUTLAR --- ⚙️',
                '!hava <şehir> · !gunluk',
                '!bakiye · !transfer',
                '!siralama · !iptal',
                ' ',
                '📖 !yardim full → Detaylı Liste',
            ], 'TÜM KOMUTLAR'));
        }

        default:
            return false;
    }
};
