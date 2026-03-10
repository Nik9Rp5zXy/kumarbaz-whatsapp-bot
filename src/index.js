const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commands');
const { getUser, addUser, incrementMsgCount, getAlias, setAlias, migrateUser, hasSeenPatch, markPatchSeen, getSetting } = require('./database/db');
const hangmanHandler = require('./commands/hangman');

const isTermux = !!process.env.TERMUX_VERSION;

const clientOptions = {
    authStrategy: new LocalAuth()
};

if (isTermux) {
    clientOptions.puppeteer = {
        executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-setuid-sandbox',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ],
        headless: true
    };
    console.log('📱 Termux ortamı algılandı, Chromium ayarları uygulandı.');
}

const client = new Client(clientOptions);

const BOT_START_TIME = Date.now();
const activeUsers = new Map(); // userId -> { chat, time }

const PATCH_VERSION = '1.12.0';

const maintenanceNotified = new Set(); // For Owner Mode one-time alerts

// ─── AFK Garbage Collector ───
// Remove users from active list if they haven't sent a command in 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [uId, data] of activeUsers.entries()) {
        if (now - data.time > 5 * 60 * 1000) {
            activeUsers.delete(uId);
        }
    }
}, 60000); // Check every 1 minute

// ─── In-memory cache for ID resolution ───
const idCache = new Map();

const resolveUserId = async (msg) => {
    const rawId = msg.author || msg.from;
    if (idCache.has(rawId)) return idCache.get(rawId);

    const existingAlias = getAlias(rawId);
    if (existingAlias) {
        idCache.set(rawId, existingAlias);
        return existingAlias;
    }

    try {
        const contact = await msg.getContact();
        if (contact && contact.number) {
            const canonicalId = `${contact.number}@c.us`;
            if (rawId !== canonicalId) {
                setAlias(rawId, canonicalId);
                console.log(`[ID-LINK] ${rawId} -> ${canonicalId}`);
                migrateUser(rawId, canonicalId);
            }
            setAlias(canonicalId, canonicalId);
            idCache.set(rawId, canonicalId);
            idCache.set(canonicalId, canonicalId);
            return canonicalId;
        }
    } catch (err) {
        console.error('[ID-LINK] getContact failed:', err.message);
    }

    const fallbackId = rawId.replace(/@lid$/, '@c.us');
    idCache.set(rawId, fallbackId);
    return fallbackId;
};

const resolveMentionedId = (rawId) => {
    if (idCache.has(rawId)) return idCache.get(rawId);
    const alias = getAlias(rawId);
    if (alias) { idCache.set(rawId, alias); return alias; }
    return rawId.replace(/@lid$/, '@c.us');
};

client.on('qr', (qr) => {
    console.clear();
    qrcode.generate(qr, { small: true });
    console.log('QR kodu WhatsApp\'dan okutun!');
});

client.on('ready', () => {
    console.log('✅ Bot hazır! WhatsApp bağlantısı kuruldu.');
});

client.on('message', async msg => {
    if (msg.from === 'status@broadcast') return;

    const userId = await resolveUserId(msg);

    // Track active user for graceful shutdown
    activeUsers.set(userId, { chat: msg.from, time: Date.now() });

    // Check if message was sent while bot was offline
    if (msg.body.startsWith('!')) {
        const msgTimeMs = msg.timestamp * 1000;
        if (BOT_START_TIME - msgTimeMs > 15000) {
            try {
                await msg.reply('✅ Bot güncellendi ve yeniden aktif! İşleminiz yapılıyor...');
            } catch (e) {}
        }
    }

    try {
        let user = getUser(userId);
        if (!user) user = addUser(userId);
        incrementMsgCount(userId);
    } catch (dbError) {
        console.error('Database Error:', dbError);
    }

    // ─── One-time Persistent Patch Notes Broadcast ───
    if (msg.body.startsWith('!') && !hasSeenPatch(userId, PATCH_VERSION)) {
        markPatchSeen(userId, PATCH_VERSION);
        const patchNotes = [
            `🚀 GÜNCELLEME NOTLARI (v${PATCH_VERSION}) 🚀`,
            ' ',
            '📺 KİM MİLYONER YENİLENDİ!',
            '• Canlı Sayaç: Süre WhatsApp üzerinde canlı güncellenir (5sn).',
            '• Süre ve Joker Sınırı: Sorular zorlaştıkça süre azalır. Jokerler sadece 4-5. sorularda açılır.',
            ' ',
            '🎩 YATIRIM SİMÜLASYONU',
            '• 500$ ın altındayken !bakiye yazarsan bot borsa ve banka danışmanlığı rolü yapabilir.',
            ' ',
            '👤 SİSTEM & YENİ MENÜLER',
            '• Yardım: Tüm !yardim, !modyardim formları mobil ekranlara (telefon) %100 uyumlu daraltıldı.',
            '• Rol: Rolünü !rlchk ile görebilirsin.',
            '• Sinyal: Bot artık bakım için kapandığında aktif oyunculara %100 bildirim garantisiyle haber veriyor.',
            ' ',
            'Yeni özellikleri denemek için !milyoner ile oyuna başla veya !yardim yaz!'
        ];
        try {
            await client.sendMessage(msg.from, patchNotes.join('\n'));
        } catch (e) {
            console.error('Patch notes broadcast failed', e);
        }
    }

    // ─── Hangman DM word selection (non-group messages) ───
    if (!msg.from.endsWith('@g.us') && !msg.body.startsWith('!')) {
        if (hangmanHandler.pendingWordSelection[userId]) {
            try {
                await hangmanHandler.startGameFromDM(client, userId, msg.body);
            } catch (e) {
                console.error('Hangman DM error:', e);
            }
            return;
        }
    }

    // ─── Owner Mode Check ───
    if (msg.body.startsWith('!')) {
        const isOwnerMode = getSetting('owner_mode') === 'true';
        if (isOwnerMode && msg.from !== OWNER_ID) {
            if (!maintenanceNotified.has(userId)) {
                maintenanceNotified.add(userId);
                try {
                    await client.sendMessage(msg.from, '⚙️ Bot şu an Yönetici tarafından *Bakım / Geliştirme* moduna alınmıştır. Komutlara geçici olarak kapalıdır.');
                } catch(e) {}
            }
            return; // Ignore command
        }
    }

    try {
        msg._normalizedUserId = userId;
        msg._resolveMentionedId = resolveMentionedId;
        await handleCommand(msg, client);
    } catch (cmdError) {
        console.error('Command Execution Error:', cmdError);
    }
});

// Graceful Shutdown on Ctrl+C (Update alert)
process.on('SIGINT', async () => {
    console.log('\n🔄 Kapanma sinyali alındı. Aktif kullanıcılara haber veriliyor...');
    const now = Date.now();
    const notified = new Set();
    const promises = [];
    
    // Broadcast warning to anyone active (in Map, not wiped by AFK GC)
    for (const [uId, data] of activeUsers.entries()) {
        if (!notified.has(data.chat)) {
            promises.push(client.sendMessage(data.chat, '🔄 Bot şu anda güncelleme/bakım için yeniden başlatılıyor. Lütfen birkaç dakika bekleyin...').catch(() => {}));
            notified.add(data.chat);
        }
    }
    
    console.log(`Mesajlar kuyruğa alındı (${promises.length} adet). Çıkış bekleniyor...`);
    
    await Promise.allSettled(promises);
    
    setTimeout(() => {
        process.exit(0);
    }, 5000); // Wait full 5 seconds to ensure WA Web API network dispatches
});

client.initialize();

const fs = require('fs');
const { execSync } = require('child_process');

const handleCrash = (err, type) => {
    console.error(`\n🚨 [${type}] Kapatılıyor...`, err);
    try {
        const logMsg = `\n--- CRASH: ${new Date().toLocaleString('tr-TR')} ---\n${err?.stack || err}\n`;
        fs.appendFileSync('crash_log.txt', logMsg);
        console.log('Log dosyasına yazıldı. GitHub\'a pushlanıyor...');
        
        execSync('git add crash_log.txt && git commit -m "🚨 Otomatik Log: Bot Çöktü" && git push origin main', { stdio: 'ignore' });
        console.log('GitHub push başarılı.');
    } catch (pushErr) {
        console.error('GitHub push hatası (Zaten güncel olabilir veya git hatası):', pushErr.message);
    }
    process.exit(1);
};

process.on('uncaughtException', (err) => handleCrash(err, 'Uncaught Exception'));
process.on('unhandledRejection', (reason) => handleCrash(reason, 'Unhandled Rejection'));
