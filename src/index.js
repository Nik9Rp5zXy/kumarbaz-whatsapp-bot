const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commands');
const { getUser, addUser, incrementMsgCount, getAlias, setAlias, migrateUser } = require('./database/db');
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
    
    // Broadcast warning to anyone who used a command in the last 60 seconds
    for (const [uId, data] of activeUsers.entries()) {
        if (now - data.time < 60000 && !notified.has(data.chat)) {
            try {
                await client.sendMessage(data.chat, '🔄 Bot şu anda güncelleme/bakım için yeniden başlatılıyor. Lütfen birkaç dakika bekleyin...');
                notified.add(data.chat);
            } catch (e) {}
        }
    }
    
    console.log('Mesajlar kuyruğa alındı. 2 saniye içinde kapatılıyor...');
    setTimeout(() => {
        process.exit(0);
    }, 2000);
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
