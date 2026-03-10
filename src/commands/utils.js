// Shared utilities used across all command modules

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const centeredBox = (textArr, title = '') => {
    const minWidth = 20;
    const contentWidth = Math.max(...textArr.map(l => l.length), title.length);
    const maxWidth = Math.max(minWidth, contentWidth) + 2;

    const borderTop = '═'.repeat(maxWidth + 4);
    const borderMid = '─'.repeat(maxWidth + 4);
    const borderBot = '═'.repeat(maxWidth + 4);

    let res = borderTop + '\n';

    if (title) {
        const pad = Math.floor((maxWidth - title.length) / 2);
        res += '  ' + ' '.repeat(pad) + title + '\n';
        res += borderMid + '\n';
    }

    textArr.forEach(line => {
        const pad = Math.floor((maxWidth - line.length) / 2);
        res += '  ' + ' '.repeat(pad) + line + '\n';
    });

    res += borderBot;
    return `\`\`\`${res}\`\`\``;
};

const troll = {
    poor: [
        "Fakirsin oğlum, git çalış.",
        "Cebinde akrep var herhalde?",
        "Bu parayla sakız bile alamazsın.",
        "Yetersiz bakiye... Tıpkı yetersiz hayatın gibi."
    ],
    win: [
        "Hile mi yaptın lan?",
        "Şanslı köylü seni.",
        "Bozuk saat bile günde iki kere doğru gösterir.",
        "Parayı buldun, karakteri kaybetme."
    ],
    lose: [
        "Ağlama duvarı sağ tarafta ->",
        "Beceriksiz herif.",
        "Paranı afiyetle yedim. Teşekkürler keriz.",
        "Evi arabayı da bas istersen? Hahaha.",
        "Kumarda kaybeden aşkta... Şaka şaka onda da kaybediyorsun."
    ],
    cooldown: [
        "Sakin ol şampiyon, daha zamanın var.",
        "Yüzsüz gibi hemen gelme, bekle biraz.",
        "Sabretmeyi öğrenmedin mi sen?",
        "Hala soğuma süresindesin, git çimlere dokun."
    ],
    spam: [
        "Sakin ol klavye savaşçısı, parmakların yanacak.",
        "Spam atma oğlum, bot değil baban konuşuyor.",
        "Sen yazdıkça ben zenginleşiyorum. Devam et.",
        "Bu kadar hızlı yazacağına git çalış.",
        "Makinalı tüfek gibi yazıyorsun, ama hiçbiri isabetli değil.",
        "Kardeş interneti mi kıracaksın? Dur biraz.",
        "Elini klavyeden çek yoksa ceza keserim.",
        "Spam = Fakir. Matematiksel gerçek."
    ]
};

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getTitle = (balance) => {
    if (balance >= 50000) return '👑 Sultan';
    if (balance >= 20000) return '💎 Milyoner';
    if (balance >= 10000) return '🏆 Zengin';
    if (balance >= 5000) return '💰 Varlıklı';
    if (balance >= 2000) return '🪙 Orta Halli';
    if (balance >= 500) return '🫘 Fakir';
    if (balance >= 0) return '🗑️ Çöpçü';
    return '💀 Borçlu';
};

const progressBar = (current, max, length = 15) => {
    const filled = Math.round((current / max) * length);
    const empty = length - filled;
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
};

const checkBrokeAdvice = (balance) => {
    // Only target people who are broke but not bankrupt yet
    if (balance <= 0 || balance > 500) return '';
    
    // 30% chance to trigger the advice simulation
    if (Math.random() > 0.3) return '';

    const advices = [
        "📉 Paran eriyor! Tüm paranı Rulete basmak yerine zenginler gibi akıllıca davran, !banka hesabına koyup saat başı garanti %5 faiz al!",
        "💼 Kumarhane her zaman kazanır. Sıfırlanmaktansa şirketlere ortak ol, !borsa yatırımları uzun vadede kazandırır.",
        "🏦 Cebinde üç kuruş kalmış. Batmadan önce en azından birazını !banka yatirarak güvenceye al.",
        "📊 Grafikler yalan söylemez! Paranı aptalca hiç etmek yerine akıllı esnaf ol, !borsa ile katla."
    ];
    return '\n\n👔 Danışman: ' + getRandom(advices);
};

module.exports = { sleep, centeredBox, troll, getRandom, getTitle, progressBar, checkBrokeAdvice };
