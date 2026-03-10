const { getUser, addUser, updateBalance, recordWin, recordLoss,
    createTournament, joinTournament, getTournament, getParticipants,
    updateTournament, deleteTournament } = require('../database/db');
const { sleep, centeredBox, troll, getRandom } = require('./utils');

// In-memory timers for tournament countdowns
const tournamentTimers = {}; // communityId -> timer

// ─── Helper: Get community ID for cross-group tournaments ───
async function getCommunityId(chatId, client) {
    if (!chatId.endsWith('@g.us') || !client) return chatId;
    try {
        const chat = await client.getChatById(chatId);
        if (chat && chat.groupMetadata && chat.groupMetadata.parentGroupId) {
            const parent = chat.groupMetadata.parentGroupId;
            // parentGroupId can be a wid object or string
            const parentId = typeof parent === 'object' ? (parent._serialized || parent.user + '@g.us') : parent;
            return parentId;
        }
    } catch (e) {
        // Fallback to chatId if we can't get metadata
    }
    return chatId;
}

module.exports = async (command, args, msg, userId, user, resolve, client) => {
    const chatId = msg.from || msg.to;

    switch (command) {
        case 'turnuva':
        case 'tournament': {
            const communityId = await getCommunityId(chatId, client);
            const existing = getTournament(communityId);
            if (existing) return msg.reply('⚠️ Zaten aktif bir turnuva var! !katil ile katıl veya bitmesini bekle.');

            const bet = parseInt(args[0]);
            if (isNaN(bet) || bet <= 0) return msg.reply('⚠️ Bahis miktarı gir.\nKullanım: !turnuva <bahis>\nÖrnek: !turnuva 500');
            if (bet > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);

            updateBalance(userId, -bet);
            const tid = createTournament(communityId, userId, bet);

            const isCommunity = communityId !== chatId;
            const joinNote = isCommunity
                ? '🌐 Topluluktaki herhangi bir\ngruptan !katil ile katılabilirsin!'
                : '!katil yazarak katıl!';

            const tournamentMsg = await msg.reply(centeredBox([
                '🏆 TURNUVA BAŞLADI!',
                ' ',
                `💰 Giriş: ${bet} $`,
                `👤 Katılımcı: 1`,
                ' ',
                joinNote,
                '⏱️ 60 saniye süreniz var.',
                ' ',
                'Min 2 — Maks 8 kişi',
            ], 'TURNUVA'));

            // Store the original chatId for sending results
            tournamentTimers[communityId] = {
                originChatId: chatId,
                timer: setTimeout(async () => {
                    const origin = tournamentTimers[communityId]?.originChatId || chatId;
                    delete tournamentTimers[communityId];
                    await startTournament(communityId, tid, msg, client, origin);
                }, 60000)
            };

            return;
        }

        case 'katil':
        case 'join': {
            const communityId = await getCommunityId(chatId, client);
            const tournament = getTournament(communityId);
            if (!tournament) return false; // Let other handlers (rulet) try
            if (tournament.status !== 'waiting') return msg.reply('⚠️ Turnuva zaten başlamış, geç kaldın.');

            const participants = getParticipants(tournament.id);
            if (participants.includes(userId)) return msg.reply('⚠️ Zaten katılmışsın, sabırsız.');
            if (participants.length >= 8) return msg.reply('⚠️ Turnuva dolu (maks 8 kişi).');

            if (user.balance < tournament.bet) return msg.reply(`⚠️ ${getRandom(troll.poor)}\nGiriş ücreti: ${tournament.bet} $`);

            updateBalance(userId, -tournament.bet);
            joinTournament(tournament.id, userId);

            const newCount = participants.length + 1;
            const isCommunity = communityId !== chatId;

            await msg.reply(centeredBox([
                '🏆 TURNUVA KATILIM',
                ' ',
                `👤 @${userId.split('@')[0]} katıldı!`,
                isCommunity ? `📍 ${(await client.getChatById(chatId))?.name || 'Grup'}` : '',
                `📊 Katılımcı: ${newCount}/8`,
                `💰 Ödül Havuzu: ${newCount * tournament.bet} $`,
            ].filter(l => l !== ''), 'TURNUVA'));

            // Auto start if 8 players
            if (newCount >= 8) {
                const timerData = tournamentTimers[communityId];
                if (timerData) {
                    clearTimeout(timerData.timer);
                }
                const origin = timerData?.originChatId || chatId;
                delete tournamentTimers[communityId];
                await startTournament(communityId, tournament.id, msg, client, origin);
            }
            return;
        }

        case 'bracket':
        case 'tablo': {
            const communityId = await getCommunityId(chatId, client);
            const tournament = getTournament(communityId);
            if (!tournament) return msg.reply('⚠️ Aktif turnuva yok.');
            const participants = getParticipants(tournament.id);

            if (tournament.status === 'waiting') {
                const lines = ['🏆 TURNUVA BEKLEMEDE', ' '];
                lines.push(`💰 Giriş: ${tournament.bet} $`);
                lines.push(`👥 Katılımcı: ${participants.length}/8`);
                lines.push(' ');
                participants.forEach((p, i) => {
                    lines.push(`${i + 1}. @${p.split('@')[0]}`);
                });
                return msg.reply(centeredBox(lines, 'BRACKET'));
            }

            if (tournament.bracket) {
                const bracket = JSON.parse(tournament.bracket);
                const lines = ['🏆 TURNUVA BRACKET', ' '];
                bracket.rounds.forEach((round, ri) => {
                    lines.push(`--- TUR ${ri + 1} ---`);
                    round.forEach(match => {
                        const p1 = `@${match.p1.split('@')[0]}`;
                        const p2 = `@${match.p2.split('@')[0]}`;
                        const winner = match.winner ? `✅ @${match.winner.split('@')[0]}` : '⏳';
                        lines.push(`${p1} vs ${p2} → ${winner}`);
                    });
                    lines.push(' ');
                });
                return msg.reply(centeredBox(lines, 'BRACKET'));
            }

            return msg.reply('⚠️ Bracket henüz oluşmadı.');
        }

        default:
            return false;
    }
};

// ─── Tournament Engine ───
async function startTournament(communityId, tournamentId, msg, client, originChatId) {
    const tournament = getTournament(communityId);
    if (!tournament) return;

    let participants = getParticipants(tournamentId);

    // Helper to send message to the origin chat
    const sendToOrigin = async (text) => {
        try {
            if (originChatId && client) {
                const chat = await client.getChatById(originChatId);
                if (chat) return await chat.sendMessage(text);
            }
        } catch (e) { }
        return await msg.reply(text);
    };

    if (participants.length < 2) {
        // Refund and cancel
        for (const p of participants) {
            updateBalance(p, tournament.bet);
        }
        deleteTournament(tournamentId);
        return sendToOrigin(centeredBox([
            '❌ TURNUVA İPTAL',
            ' ',
            'Yeterli katılımcı yok.',
            'Paralar iade edildi.',
        ], 'TURNUVA'));
    }

    // Round down to nearest power of 2
    let size = 1;
    while (size * 2 <= participants.length) size *= 2;

    // If we have extra players, refund them
    if (participants.length > size) {
        participants = shuffle(participants);
        const eliminated = participants.slice(size);
        participants = participants.slice(0, size);
        for (const p of eliminated) {
            updateBalance(p, tournament.bet);
        }
    } else {
        participants = shuffle(participants);
    }

    const totalPool = participants.length * tournament.bet;
    const secondPrize = Math.floor(totalPool * 0.25);
    const firstPrize = totalPool - secondPrize;

    updateTournament(tournamentId, { status: 'active' });

    // Announce
    const introLines = ['🏆 TURNUVA BAŞLIYOR!', ' '];
    introLines.push(`👥 ${participants.length} katılımcı`);
    introLines.push(`💰 Ödül Havuzu: ${totalPool} $`);
    introLines.push(`🥇 1.: ${firstPrize} $ — 🥈 2.: ${secondPrize} $`);
    introLines.push(' ');
    participants.forEach((p, i) => {
        introLines.push(`${i + 1}. @${p.split('@')[0]}`);
    });
    await sendToOrigin(centeredBox(introLines, 'TURNUVA'));
    await sleep(3000);

    // Build bracket
    const bracket = { rounds: [] };
    let currentPlayers = [...participants];
    let roundNum = 0;
    let runnerUp = null;

    while (currentPlayers.length > 1) {
        roundNum++;
        const round = [];
        const winners = [];

        await sendToOrigin(centeredBox([
            `⚔️ TUR ${roundNum}`,
            `${currentPlayers.length} kişi — ${currentPlayers.length / 2} maç`,
        ], 'TURNUVA'));
        await sleep(2000);

        for (let i = 0; i < currentPlayers.length; i += 2) {
            const p1 = currentPlayers[i];
            const p2 = currentPlayers[i + 1];

            // Simulate match with drama
            const p1Score = (Math.random() * 25 + 5).toFixed(1);
            const p2Score = (Math.random() * 25 + 5).toFixed(1);
            let winner, loser;
            if (parseFloat(p1Score) >= parseFloat(p2Score)) {
                winner = p1; loser = p2;
            } else {
                winner = p2; loser = p1;
            }

            const match = { p1, p2, p1Score, p2Score, winner };
            round.push(match);
            winners.push(winner);

            // Track runner-up (loser of final match)
            if (currentPlayers.length === 2) {
                runnerUp = loser;
            }

            await sendToOrigin(centeredBox([
                `🥊 MAÇ ${Math.floor(i / 2) + 1}`,
                ' ',
                `@${p1.split('@')[0]}: ${p1Score} puan`,
                `@${p2.split('@')[0]}: ${p2Score} puan`,
                ' ',
                `✅ Kazanan: @${winner.split('@')[0]}`,
            ], `TUR ${roundNum}`));
            await sleep(2500);
        }

        bracket.rounds.push(round);
        currentPlayers = winners;
    }

    // Final results
    const champion = currentPlayers[0];

    updateBalance(champion, firstPrize);
    recordWin(champion, firstPrize);
    if (runnerUp) {
        updateBalance(runnerUp, secondPrize);
    }

    updateTournament(tournamentId, {
        status: 'finished',
        bracket: JSON.stringify(bracket)
    });

    await sendToOrigin(centeredBox([
        '🏆 TURNUVA BİTTİ! 🏆',
        ' ',
        `🥇 ŞAMPİYON: @${champion.split('@')[0]}`,
        `   Ödül: ${firstPrize} $`,
        ' ',
        runnerUp ? `🥈 İKİNCİ: @${runnerUp.split('@')[0]}` : '',
        runnerUp ? `   Ödül: ${secondPrize} $` : '',
        ' ',
        'Tebrikler! 🎉',
    ].filter(l => l !== ''), 'TURNUVA SONUÇLARI'));
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
