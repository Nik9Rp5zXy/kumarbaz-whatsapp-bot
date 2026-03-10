const { getUser, addUser, updateBalance, recordWin, recordLoss,
    addAnimal, getInventory, getTeam, setTeamSlot, clearTeam } = require('../database/db');
const { sleep, centeredBox, troll, getRandom, progressBar } = require('./utils');

// ─── Hayvan Veritabanı ───
const RARITIES = [
    { key: 'divine', label: '🌟 İLAHİ', color: '🔥', chance: 0.001, hpRange: [4500, 5500], strRange: [900, 1200] },
    { key: 'mythical', label: '🟣 MİTİK', color: '🐲', chance: 0.02, hpRange: [800, 1200], strRange: [180, 280] },
    { key: 'legendary', label: '🟡 EFSANEVİ', color: '⭐', chance: 0.05, hpRange: [500, 800], strRange: [120, 200] },
    { key: 'epic', label: '🟣 EPİK', color: '💎', chance: 0.10, hpRange: [300, 500], strRange: [80, 140] },
    { key: 'rare', label: '🔵 NADİR', color: '💠', chance: 0.20, hpRange: [150, 300], strRange: [40, 90] },
    { key: 'common', label: '⚪ SIRADAN', color: '🌿', chance: 1.0, hpRange: [50, 150], strRange: [10, 45] },
];

const ANIMALS = {
    divine: [{ key: 'anka', name: 'Anka Kuşu', emoji: '🔥' }],
    mythical: [
        { key: 'ejderha', name: 'Ejderha', emoji: '🐲' },
        { key: 'hydra', name: 'Hydra', emoji: '🐍' },
        { key: 'fenrir', name: 'Fenrir', emoji: '🐺' },
    ],
    legendary: [
        { key: 'kaplan', name: 'Kaplan', emoji: '🐅' },
        { key: 'kartal', name: 'Kartal', emoji: '🦅' },
        { key: 'yilan', name: 'Dev Yılan', emoji: '🐍' },
        { key: 'ayi', name: 'Ayı', emoji: '🐻' },
    ],
    epic: [
        { key: 'aslan', name: 'Aslan', emoji: '🦁' },
        { key: 'kurt', name: 'Kurt', emoji: '🐺' },
        { key: 'timsah', name: 'Timsah', emoji: '🐊' },
        { key: 'boğa', name: 'Boğa', emoji: '🐂' },
    ],
    rare: [
        { key: 'tilki', name: 'Tilki', emoji: '🦊' },
        { key: 'karaca', name: 'Karaca', emoji: '🦌' },
        { key: 'sahin', name: 'Şahin', emoji: '🦅' },
        { key: 'panter', name: 'Panter', emoji: '🐆' },
    ],
    common: [
        { key: 'tavsan', name: 'Tavşan', emoji: '🐇' },
        { key: 'kedi', name: 'Kedi', emoji: '🐱' },
        { key: 'kopek', name: 'Köpek', emoji: '🐕' },
        { key: 'tavuk', name: 'Tavuk', emoji: '🐔' },
        { key: 'kaplumbaga', name: 'Kaplumbağa', emoji: '🐢' },
    ],
};

// ─── Helpers ───
function rollAnimal() {
    const roll = Math.random();
    let cumulative = 0;
    for (const rarity of RARITIES) {
        cumulative += rarity.chance;
        if (roll < cumulative) {
            const pool = ANIMALS[rarity.key];
            const animal = pool[Math.floor(Math.random() * pool.length)];
            const hp = randInt(rarity.hpRange[0], rarity.hpRange[1]);
            const str = randInt(rarity.strRange[0], rarity.strRange[1]);
            return { ...animal, hp, str, rarity: rarity.key, rarityLabel: rarity.label };
        }
    }
    // Fallback: common
    const pool = ANIMALS.common;
    const animal = pool[Math.floor(Math.random() * pool.length)];
    const r = RARITIES.find(r => r.key === 'common');
    return { ...animal, hp: randInt(r.hpRange[0], r.hpRange[1]), str: randInt(r.strRange[0], r.strRange[1]), rarity: 'common', rarityLabel: r.label };
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function totalPower(a) { return a.hp + a.str * 2; }

function animalLine(a, index) {
    const isDivine = a.rarity === 'divine';
    const divineTag = isDivine ? ' 🔥 ULTRA NADİR' : '';
    const info = ANIMALS[a.rarity]?.find(x => x.key === a.animal_key);
    const emoji = info ? info.emoji : '❓';
    const name = info ? info.name : a.animal_key;
    const rarityObj = RARITIES.find(r => r.key === a.rarity);
    const label = rarityObj ? rarityObj.label : a.rarity;
    return `${index != null ? `${index + 1}. ` : ''}${emoji} ${name} ${label}${divineTag}\n   ❤️ ${a.hp} HP | ⚔️ ${a.str} STR | 💪 ${totalPower(a)} Güç`;
}

function getRarityEmoji(rarity) {
    const r = RARITIES.find(x => x.key === rarity);
    return r ? r.color : '❓';
}

// ─── Savaş Simülasyonu ───
function simulateBattle(team1, team2) {
    const log = [];
    let t1 = team1.map(a => ({ ...a, currentHp: a.hp }));
    let t2 = team2.map(a => ({ ...a, currentHp: a.hp }));
    let round = 0;

    while (t1.some(a => a.currentHp > 0) && t2.some(a => a.currentHp > 0) && round < 20) {
        round++;
        // Each alive animal on team 1 attacks random alive on team 2
        for (const attacker of t1.filter(a => a.currentHp > 0)) {
            const alive2 = t2.filter(a => a.currentHp > 0);
            if (alive2.length === 0) break;
            const target = alive2[Math.floor(Math.random() * alive2.length)];
            const dmg = Math.max(1, Math.floor(attacker.str * (0.8 + Math.random() * 0.4)));
            target.currentHp -= dmg;
            const aInfo = ANIMALS[attacker.rarity]?.find(x => x.key === attacker.animal_key);
            const tInfo = ANIMALS[target.rarity]?.find(x => x.key === target.animal_key);
            log.push(`${aInfo?.emoji || '❓'} ${aInfo?.name || '?'} → ${tInfo?.emoji || '❓'} ${tInfo?.name || '?'} (-${dmg} HP)`);
        }
        // Team 2 attacks team 1
        for (const attacker of t2.filter(a => a.currentHp > 0)) {
            const alive1 = t1.filter(a => a.currentHp > 0);
            if (alive1.length === 0) break;
            const target = alive1[Math.floor(Math.random() * alive1.length)];
            const dmg = Math.max(1, Math.floor(attacker.str * (0.8 + Math.random() * 0.4)));
            target.currentHp -= dmg;
            const aInfo = ANIMALS[attacker.rarity]?.find(x => x.key === attacker.animal_key);
            const tInfo = ANIMALS[target.rarity]?.find(x => x.key === target.animal_key);
            log.push(`${aInfo?.emoji || '❓'} ${aInfo?.name || '?'} → ${tInfo?.emoji || '❓'} ${tInfo?.name || '?'} (-${dmg} HP)`);
        }
    }

    const t1Alive = t1.filter(a => a.currentHp > 0).length;
    const t2Alive = t2.filter(a => a.currentHp > 0).length;
    const t1TotalHp = Math.max(0, t1.reduce((s, a) => s + a.currentHp, 0));
    const t2TotalHp = Math.max(0, t2.reduce((s, a) => s + a.currentHp, 0));

    let winner = 0; // 0 = draw, 1 = team1, 2 = team2
    if (t1Alive > t2Alive) winner = 1;
    else if (t2Alive > t1Alive) winner = 2;
    else if (t1TotalHp > t2TotalHp) winner = 1;
    else if (t2TotalHp > t1TotalHp) winner = 2;

    return { winner, rounds: round, log: log.slice(-8), t1Alive, t2Alive, t1TotalHp, t2TotalHp };
}

// ─── Handler ───
const handler = async (command, args, msg, userId, user, resolve, client) => {
    const chatId = msg.from;

    switch (command) {
        // ─── AV (Hunt) ───
        case 'av':
        case 'hunt': {
            const cost = 200;
            if (user.balance < cost) return msg.reply(`⚠️ Av ücreti ${cost} $. ${getRandom(troll.poor)}`);

            updateBalance(userId, -cost);

            const huntMsg = await msg.reply(centeredBox(['🏹 Ava çıkılıyor...', 'Ormanın derinliklerine giriyorsun...'], 'HAYVANAT'));

            await sleep(2000);
            const caught = rollAnimal();
            const invId = addAnimal(userId, caught.key, caught.hp, caught.str, caught.rarity);

            const isDivine = caught.rarity === 'divine';
            const lines = [];

            if (isDivine) {
                lines.push(
                    '🔥🔥🔥 İNANILMAZ! 🔥🔥🔥', ' ',
                    '👁️ ULTRA NADİR HAYVAN YAKALANDI! 👁️', ' ',
                    `${caught.emoji} ${caught.name}`,
                    `${caught.rarityLabel} 🔥 ULTRA NADİR`, ' ',
                    `❤️ HP: ${caught.hp}`,
                    `⚔️ STR: ${caught.str}`,
                    `💪 Toplam Güç: ${totalPower(caught)}`, ' ',
                    'Binde 1 ihtimal senin oldu!'
                );
            } else {
                lines.push(
                    `${caught.emoji} ${caught.name}`,
                    `${caught.rarityLabel}`, ' ',
                    `❤️ HP: ${caught.hp}`,
                    `⚔️ STR: ${caught.str}`,
                    `💪 Toplam Güç: ${totalPower(caught)}`,
                );
            }
            lines.push(' ', `Maliyet: -${cost} $`);

            await huntMsg.edit(centeredBox(lines, isDivine ? '🔥 İLAHİ YAKALAMA 🔥' : 'AV SONUCU'));
            return;
        }

        // ─── ENVANTER ───
        case 'envanter':
        case 'inventory':
        case 'hayvanlar': {
            const inv = getInventory(userId);
            if (inv.length === 0) return msg.reply(centeredBox(['Hiç hayvanın yok!', '!av ile avlanmaya başla.'], 'ENVANTER'));

            const lines = [`📦 Toplam: ${inv.length} hayvan`, ' '];
            inv.slice(0, 15).forEach((a, i) => {
                lines.push(animalLine(a, i));
                if (i < Math.min(inv.length, 15) - 1) lines.push(' ');
            });
            if (inv.length > 15) lines.push(' ', `... ve ${inv.length - 15} hayvan daha`);

            return msg.reply(centeredBox(lines, '🐾 ENVANTER'));
        }

        // ─── TAKİM ───
        case 'takim':
        case 'team': {
            const team = getTeam(userId);
            if (team.length === 0) return msg.reply(centeredBox([
                'Aktif takımın yok!', ' ',
                '!otoolustur → Otomatik kadro',
                '!takimkur <no> <no> <no> → Manuel kadro',
            ], 'TAKIM'));

            const teamPower = team.reduce((s, a) => s + totalPower(a), 0);
            const lines = [`💪 Takım Gücü: ${teamPower}`, ' '];
            team.forEach((a, i) => {
                lines.push(animalLine(a, i));
                if (i < team.length - 1) lines.push(' ');
            });

            return msg.reply(centeredBox(lines, '⚔️ AKTİF TAKIM'));
        }

        // ─── OTO OLUŞTUR (Auto Team) ───
        case 'otoolustur':
        case 'autoteam': {
            const inv = getInventory(userId);
            if (inv.length === 0) return msg.reply('⚠️ Hayvanın yok! Önce !av ile avlan.');

            // Pick top 3 different animal types
            const selected = [];
            const usedKeys = new Set();
            for (const a of inv) {
                if (usedKeys.has(a.animal_key)) continue;
                usedKeys.add(a.animal_key);
                selected.push(a);
                if (selected.length >= 3) break;
            }

            if (selected.length === 0) return msg.reply('⚠️ Uygun hayvan bulunamadı.');

            clearTeam(userId);
            selected.forEach((a, i) => setTeamSlot(userId, i + 1, a.id));

            const teamPower = selected.reduce((s, a) => s + totalPower(a), 0);
            const lines = [
                '✅ Takımın Hazır!', ' ',
                'En güçlü kadro kuruldu:', ' ',
            ];
            selected.forEach((a, i) => {
                lines.push(animalLine(a, i));
                if (i < selected.length - 1) lines.push(' ');
            });
            lines.push(' ', `💪 Toplam Güç: ${teamPower}`, 'Savaşmaya hazırsın!');

            return msg.reply(centeredBox(lines, '⚔️ OTO KADRO'));
        }

        // ─── TAKİMKUR (Manuel Team) ───
        case 'takimkur':
        case 'setteam': {
            const inv = getInventory(userId);
            if (inv.length === 0) return msg.reply('⚠️ Hayvanın yok! Önce !av ile avlan.');

            // Parse slot numbers (1-indexed from envanter)
            const indices = args.map(a => parseInt(a) - 1).filter(n => !isNaN(n) && n >= 0 && n < inv.length);
            if (indices.length === 0) return msg.reply('⚠️ Kullanım: !takimkur 1 2 3\n(Envanterdeki sıra numaralarını yaz)');

            const slots = indices.slice(0, 3);
            clearTeam(userId);
            const selected = [];
            slots.forEach((idx, i) => {
                setTeamSlot(userId, i + 1, inv[idx].id);
                selected.push(inv[idx]);
            });

            const lines = ['✅ Takım kuruldu!', ' '];
            selected.forEach((a, i) => {
                lines.push(animalLine(a, i));
                if (i < selected.length - 1) lines.push(' ');
            });

            return msg.reply(centeredBox(lines, '⚔️ KADRO'));
        }

        // ─── SAVAŞ (PvP Battle) ───
        case 'savas':
        case 'battle':
        case 'pvp': {
            const opponentMention = msg.mentionedIds && msg.mentionedIds[0];
            if (!opponentMention) return msg.reply('⚠️ Kullanım: !savas @kisi <bahis>\nBahis opsiyonel.');
            const opponentId = resolve(opponentMention);
            if (opponentId === userId) return msg.reply('⚠️ Kendinle mi savaşacaksın?');

            let bet = 0;
            for (const arg of args) {
                const num = parseInt(arg);
                if (!isNaN(num) && !arg.includes('@') && num > 0) { bet = num; break; }
            }

            const myTeam = getTeam(userId);
            const oppTeam = getTeam(opponentId);

            if (myTeam.length === 0) return msg.reply('⚠️ Takımın yok! !otoolustur ile kadro kur.');
            if (oppTeam.length === 0) return msg.reply('⚠️ Rakibin takım kurmamış.');

            if (bet > 0) {
                if (user.balance < bet) return msg.reply(`⚠️ ${getRandom(troll.poor)}`);
                let opp = getUser(opponentId);
                if (!opp) opp = addUser(opponentId);
                if (opp.balance < bet) return msg.reply('⚠️ Rakibinin parası yok.');
                updateBalance(userId, -bet);
                updateBalance(opponentId, -bet);
            }

            // Show preparation
            const myPower = myTeam.reduce((s, a) => s + totalPower(a), 0);
            const oppPower = oppTeam.reduce((s, a) => s + totalPower(a), 0);

            const prepMsg = await msg.reply(centeredBox([
                '⚔️ HAYVAN SAVAŞI ⚔️', ' ',
                `@${userId.split('@')[0]} (${myPower} güç)`,
                'vs',
                `@${opponentId.split('@')[0]} (${oppPower} güç)`,
                ' ', bet > 0 ? `Bahis: ${bet} $` : 'Bedava',
                ' ', '🔄 Savaş başlıyor...',
            ], 'ARENA'));

            await sleep(3000);

            // Simulate
            const result = simulateBattle(myTeam, oppTeam);

            let winnerId, loserId;
            if (result.winner === 1) { winnerId = userId; loserId = opponentId; }
            else if (result.winner === 2) { winnerId = opponentId; loserId = userId; }

            const totalPot = bet * 2;
            if (winnerId && totalPot > 0) {
                updateBalance(winnerId, totalPot);
                recordWin(winnerId, bet);
                recordLoss(loserId, bet);
            }

            const resultLines = [
                result.winner === 0 ? '🤝 BERABERE! 🤝' : '🏆 SAVAŞ BİTTİ! 🏆', ' ',
                '--- SAVAŞ LOGU ---',
                ...result.log, ' ',
                `@${userId.split('@')[0]}: ${result.t1Alive} hayvan ayakta (${Math.max(0, result.t1TotalHp)} HP)`,
                `@${opponentId.split('@')[0]}: ${result.t2Alive} hayvan ayakta (${Math.max(0, result.t2TotalHp)} HP)`,
                ' ',
            ];

            if (winnerId) {
                resultLines.push(`🏆 Kazanan: @${winnerId.split('@')[0]}`);
                if (totalPot > 0) resultLines.push(`Kazanç: +${totalPot} $`);
            } else {
                resultLines.push('Berabere! Bahisler iade.');
                if (bet > 0) { updateBalance(userId, bet); updateBalance(opponentId, bet); }
            }

            await prepMsg.edit(centeredBox(resultLines, '⚔️ ARENA SONUCU'));
            return;
        }

        // ─── ZOO YARDIM ───
        case 'zoo':
        case 'hayvanat': {
            return msg.reply(centeredBox([
                '--- HAYVANAT BAHÇESİ ---', ' ',
                '🏹 !av → Hayvan yakala (200$)',
                '📦 !envanter → Hayvanlarını gör',
                '⚔️ !takim → Aktif takımını gör',
                '🤖 !otoolustur → Otomatik kadro kur',
                '🔧 !takimkur 1 2 3 → Manuel kadro',
                '⚔️ !savas @kisi <bahis> → PvP',
                ' ',
                '--- NADİRLİK SEVİYELERİ ---',
                '⚪ Sıradan → 🔵 Nadir → 🟣 Epik',
                '🟡 Efsanevi → 🟣 Mitik',
                '🔥 İLAHİ (Anka Kuşu - %0.1)', ' ',
                'Takımın 3 hayvandan oluşur.',
            ], 'ZOO REHBERİ'));
        }

        default:
            return false;
    }
};

module.exports = handler;
