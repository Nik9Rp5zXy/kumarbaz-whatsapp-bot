const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleCommand } = require('./commands');
const { getUser, addUser, incrementMsgCount, getAlias, setAlias, migrateUser } = require('./database/db');
const { startWebServer } = require('./web/server');
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
    qrcode.generate(qr, { small: true });
    console.log('Scan the QR code above to log in!');
});

client.on('ready', () => {
    console.log('Client is ready!');
    startWebServer();
});

client.on('message', async msg => {
    if (msg.from === 'status@broadcast') return;

    const userId = await resolveUserId(msg);

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

client.initialize();

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
