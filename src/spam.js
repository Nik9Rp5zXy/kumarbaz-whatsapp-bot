// Spam protection module — rate limiting with troll responses and escalating penalties
const { addSpamLog } = require('./database/db');

// In-memory tracking
const userMessages = new Map();  // userId -> [timestamp, timestamp, ...]
const userWarnings = new Map();  // userId -> { count, bannedUntil }
const commandCooldowns = new Map(); // `${userId}:${command}` -> lastUsedTimestamp

const RATE_LIMIT = 5;           // max commands within window
const RATE_WINDOW = 10000;      // 10 seconds
const CMD_COOLDOWN = 3000;      // 3 seconds per command type
const SOFT_BAN_DURATION = 60000;  // 1 minute
const HARD_BAN_DURATION = 300000; // 5 minutes
const HARD_BAN_PENALTY = 500;     // $ penalty for hard ban

/**
 * Check if a user is spamming. Returns:
 * { allowed: true } if OK
 * { allowed: false, reason: string, penalty: number } if blocked
 */
const checkSpam = (userId, command) => {
    const now = Date.now();

    // Check if user is banned
    const warning = userWarnings.get(userId) || { count: 0, bannedUntil: 0 };
    if (warning.bannedUntil > now) {
        const remaining = Math.ceil((warning.bannedUntil - now) / 1000);
        return { allowed: false, reason: `ban`, remaining, penalty: 0 };
    }

    // Check per-command cooldown
    const cmdKey = `${userId}:${command}`;
    const lastUsed = commandCooldowns.get(cmdKey) || 0;
    if (now - lastUsed < CMD_COOLDOWN) {
        return { allowed: false, reason: 'cooldown', remaining: Math.ceil((CMD_COOLDOWN - (now - lastUsed)) / 1000), penalty: 0 };
    }

    // Record this command
    commandCooldowns.set(cmdKey, now);

    // Rate limit check
    let timestamps = userMessages.get(userId) || [];
    timestamps = timestamps.filter(t => now - t < RATE_WINDOW);
    timestamps.push(now);
    userMessages.set(userId, timestamps);

    if (timestamps.length > RATE_LIMIT) {
        warning.count++;

        if (warning.count >= 3) {
            // Hard ban
            warning.bannedUntil = now + HARD_BAN_DURATION;
            userWarnings.set(userId, warning);
            addSpamLog(userId, `HARD_BAN (${HARD_BAN_DURATION / 1000}s, -${HARD_BAN_PENALTY}$)`);
            return { allowed: false, reason: 'hard_ban', remaining: HARD_BAN_DURATION / 1000, penalty: HARD_BAN_PENALTY };
        } else if (warning.count >= 2) {
            // Soft ban
            warning.bannedUntil = now + SOFT_BAN_DURATION;
            userWarnings.set(userId, warning);
            addSpamLog(userId, `SOFT_BAN (${SOFT_BAN_DURATION / 1000}s)`);
            return { allowed: false, reason: 'soft_ban', remaining: SOFT_BAN_DURATION / 1000, penalty: 0 };
        } else {
            // Warning
            userWarnings.set(userId, warning);
            addSpamLog(userId, 'WARNING');
            return { allowed: false, reason: 'warning', remaining: 0, penalty: 0 };
        }
    }

    return { allowed: true };
};

module.exports = { checkSpam };
