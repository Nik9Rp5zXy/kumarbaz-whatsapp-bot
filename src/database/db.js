const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'gambling.db');
const db = new Database(dbPath, { verbose: null }); // disable verbose for production

// ─── Tables ───

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    msg_count INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    total_lost INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    spouse TEXT DEFAULT NULL,
    last_patch_seen TEXT DEFAULT '1.0.0',
    milyoner_last_date TEXT DEFAULT NULL,
    milyoner_played_today INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_aliases (
    alias_id TEXT PRIMARY KEY,
    primary_id TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS wanted_list (
    target_id TEXT PRIMARY KEY,
    placed_by TEXT NOT NULL,
    bounty INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS spam_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key_name TEXT PRIMARY KEY,
    key_value TEXT NOT NULL
  )
`);

// ─── Seed Default Settings ───
db.prepare('INSERT OR IGNORE INTO settings (key_name, key_value) VALUES (?, ?)').run('owner_mode', 'false');
db.prepare('INSERT OR IGNORE INTO settings (key_name, key_value) VALUES (?, ?)').run('milyoner_daily_limit', '2');

// ─── Migrations for existing tables ───
const migrations = [
  'ALTER TABLE users ADD COLUMN msg_count INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN total_won INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN total_lost INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN games_won INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN games_lost INTEGER DEFAULT 0',
  'ALTER TABLE users ADD COLUMN spouse TEXT DEFAULT NULL',
  'ALTER TABLE users ADD COLUMN last_patch_seen TEXT DEFAULT "1.0.0"',
  'ALTER TABLE users ADD COLUMN milyoner_last_date TEXT DEFAULT NULL',
  'ALTER TABLE users ADD COLUMN milyoner_played_today INTEGER DEFAULT 0',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

// ─── User Functions ───

const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

const addUser = (id) => {
  db.prepare('INSERT OR IGNORE INTO users (id, balance, msg_count) VALUES (?, 0, 0)').run(id);
  return getUser(id);
};

const updateBalance = (id, amount) => {
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id);
  return getUser(id);
};

const incrementMsgCount = (id) => {
  db.prepare('UPDATE users SET msg_count = msg_count + 1 WHERE id = ?').run(id);
};

const setDaily = (id) => {
  db.prepare('UPDATE users SET last_daily = ? WHERE id = ?').run(Date.now(), id);
};

const getTopUsers = (limit = 10) => db.prepare('SELECT * FROM users ORDER BY balance DESC LIMIT ?').all(limit);
const getTopActiveUsers = (limit = 10) => db.prepare('SELECT * FROM users ORDER BY msg_count DESC LIMIT ?').all(limit);
const getAllUsers = () => db.prepare('SELECT * FROM users ORDER BY balance DESC').all();

const hasSeenPatch = (id, patchVersion) => {
  const user = getUser(id);
  if (!user) return false;
  return user.last_patch_seen === patchVersion;
};

const markPatchSeen = (id, patchVersion) => {
  db.prepare('UPDATE users SET last_patch_seen = ? WHERE id = ?').run(patchVersion, id);
};

// ─── Settings Functions ───
const getSetting = (key) => {
  const row = db.prepare('SELECT key_value FROM settings WHERE key_name = ?').get(key);
  return row ? row.key_value : null;
};

const updateSetting = (key, value) => {
  db.prepare('INSERT OR REPLACE INTO settings (key_name, key_value) VALUES (?, ?)').run(key, value);
};

const getAllSettings = () => db.prepare('SELECT * FROM settings').all();

// ─── Milyoner Daily Logic ───
const getMilyonerPlayed = (id) => {
  const user = getUser(id);
  if (!user) return 0;
  
  const today = new Date().toLocaleDateString('tr-TR');
  if (user.milyoner_last_date !== today) {
    db.prepare('UPDATE users SET milyoner_last_date = ?, milyoner_played_today = 0 WHERE id = ?').run(today, id);
    return 0; // It was a new day, so reset to 0
  }
  return user.milyoner_played_today || 0;
};

const incrementMilyonerPlayed = (id) => {
  const today = new Date().toLocaleDateString('tr-TR');
  db.prepare('UPDATE users SET milyoner_last_date = ?, milyoner_played_today = milyoner_played_today + 1 WHERE id = ?').run(today, id);
};

// ─── Stats Functions ───

const recordWin = (id, amount) => {
  db.prepare('UPDATE users SET games_won = games_won + 1, total_won = total_won + ? WHERE id = ?').run(amount, id);
};

const recordLoss = (id, amount) => {
  db.prepare('UPDATE users SET games_lost = games_lost + 1, total_lost = total_lost + ? WHERE id = ?').run(Math.abs(amount), id);
};

// ─── Marriage Functions ───

const marry = (id1, id2) => {
  db.prepare('UPDATE users SET spouse = ? WHERE id = ?').run(id2, id1);
  db.prepare('UPDATE users SET spouse = ? WHERE id = ?').run(id1, id2);
};

const divorce = (id) => {
  const user = getUser(id);
  if (user && user.spouse) {
    db.prepare('UPDATE users SET spouse = NULL WHERE id = ?').run(user.spouse);
    db.prepare('UPDATE users SET spouse = NULL WHERE id = ?').run(id);
  }
};

// ─── Wanted Functions ───

const addWanted = (targetId, placedBy, bounty) => {
  db.prepare('INSERT OR REPLACE INTO wanted_list (target_id, placed_by, bounty, created_at) VALUES (?, ?, ?, ?)').run(targetId, placedBy, bounty, Date.now());
};

const getWanted = (targetId) => db.prepare('SELECT * FROM wanted_list WHERE target_id = ?').get(targetId);
const getAllWanted = () => db.prepare('SELECT * FROM wanted_list ORDER BY bounty DESC').all();
const removeWanted = (targetId) => db.prepare('DELETE FROM wanted_list WHERE target_id = ?').run(targetId);

// ─── Alias Functions ───

const getAlias = (aliasId) => {
  const row = db.prepare('SELECT primary_id FROM user_aliases WHERE alias_id = ?').get(aliasId);
  return row ? row.primary_id : null;
};

const setAlias = (aliasId, primaryId) => {
  db.prepare('INSERT OR REPLACE INTO user_aliases (alias_id, primary_id) VALUES (?, ?)').run(aliasId, primaryId);
};

const getAllAliases = () => db.prepare('SELECT * FROM user_aliases').all();

const migrateUser = (oldId, newId) => {
  const oldUser = getUser(oldId);
  if (!oldUser) return;
  const newUser = getUser(newId);
  if (newUser) {
    db.prepare('UPDATE users SET balance = balance + ?, msg_count = msg_count + ?, total_won = total_won + ?, total_lost = total_lost + ?, games_won = games_won + ?, games_lost = games_lost + ? WHERE id = ?')
      .run(oldUser.balance || 0, oldUser.msg_count || 0, oldUser.total_won || 0, oldUser.total_lost || 0, oldUser.games_won || 0, oldUser.games_lost || 0, newId);
    if ((oldUser.last_daily || 0) > (newUser.last_daily || 0)) {
      db.prepare('UPDATE users SET last_daily = ?, daily_streak = ? WHERE id = ?').run(oldUser.last_daily, oldUser.daily_streak, newId);
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(oldId);
  } else {
    db.prepare('UPDATE users SET id = ? WHERE id = ?').run(newId, oldId);
  }
};

// ─── Spam Log ───
const addSpamLog = (userId, action) => {
  db.prepare('INSERT INTO spam_log (user_id, action, created_at) VALUES (?, ?, ?)').run(userId, action, Date.now());
};
const getSpamLogs = (limit = 50) => db.prepare('SELECT * FROM spam_log ORDER BY created_at DESC LIMIT ?').all(limit);

// ─── Admin: Set Balance ───
const setBalance = (id, amount) => {
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(amount, id);
};

const deleteUser = (id) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  db.prepare('DELETE FROM user_aliases WHERE alias_id = ? OR primary_id = ?').run(id, id);
};

// ─── Zoo Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS zoo_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    animal_key TEXT NOT NULL,
    hp INTEGER NOT NULL,
    str INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    caught_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS zoo_active_team (
    user_id TEXT NOT NULL,
    slot INTEGER NOT NULL,
    inventory_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, slot),
    FOREIGN KEY (inventory_id) REFERENCES zoo_inventory(id)
  )
`);

// ─── Zoo Functions ───
const addAnimal = (userId, animalKey, hp, str, rarity) => {
  const result = db.prepare('INSERT INTO zoo_inventory (user_id, animal_key, hp, str, rarity, caught_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, animalKey, hp, str, rarity, Date.now());
  return result.lastInsertRowid;
};

const getInventory = (userId) => db.prepare('SELECT * FROM zoo_inventory WHERE user_id = ? ORDER BY (hp + str * 2) DESC').all(userId);

const getTeam = (userId) => {
  return db.prepare(`
    SELECT t.slot, i.* FROM zoo_active_team t
    JOIN zoo_inventory i ON t.inventory_id = i.id
    WHERE t.user_id = ? ORDER BY t.slot ASC
  `).all(userId);
};

const setTeamSlot = (userId, slot, inventoryId) => {
  db.prepare('INSERT OR REPLACE INTO zoo_active_team (user_id, slot, inventory_id) VALUES (?, ?, ?)').run(userId, slot, inventoryId);
};

const clearTeam = (userId) => {
  db.prepare('DELETE FROM zoo_active_team WHERE user_id = ?').run(userId);
};

const removeAnimal = (userId, inventoryId) => {
  db.prepare('DELETE FROM zoo_active_team WHERE user_id = ? AND inventory_id = ?').run(userId, inventoryId);
  db.prepare('DELETE FROM zoo_inventory WHERE id = ? AND user_id = ?').run(inventoryId, userId);
};

// ─── Milyoner Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS milyoner_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    difficulty INTEGER NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_seen_questions (
    user_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    seen_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, question_id)
  )
`);

// ─── Seed Questions (only if table is empty) ───
// ─── Seed Questions (only if table is empty) ───
const qCount = db.prepare('SELECT COUNT(*) as c FROM milyoner_questions').get().c;
if (qCount === 0) {
  const questions = require('./questions.json');
  const seedQ = db.prepare('INSERT INTO milyoner_questions (difficulty, question, option_a, option_b, option_c, option_d, correct) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const seed = db.transaction((qs) => { for (const q of qs) seedQ.run(...q); });
  seed(questions);
  console.log(`[DB] ${questions.length} milyoner sorusu eklendi.`);
}

// ─── Milyoner Functions ───
const getUnseenQuestion = (userId, difficulty) => {
  return db.prepare(`
    SELECT * FROM milyoner_questions
    WHERE difficulty = ? AND id NOT IN (SELECT question_id FROM user_seen_questions WHERE user_id = ?)
    ORDER BY RANDOM() LIMIT 1
  `).get(difficulty, userId);
};

const markQuestionSeen = (userId, questionId) => {
  db.prepare('INSERT OR IGNORE INTO user_seen_questions (user_id, question_id, seen_at) VALUES (?, ?, ?)').run(userId, questionId, Date.now());
};

const getSeenCount = (userId) => {
  return db.prepare('SELECT COUNT(*) as c FROM user_seen_questions WHERE user_id = ?').get(userId).c;
};

const getTotalQuestionCount = () => {
  return db.prepare('SELECT COUNT(*) as c FROM milyoner_questions').get().c;
};

// ─── Bank Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS bank_accounts (
    user_id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL DEFAULT 0,
    deposited_at INTEGER NOT NULL
  )
`);

// ─── Stock Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    price INTEGER NOT NULL,
    prev_price INTEGER NOT NULL,
    last_update INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_portfolio (
    user_id TEXT NOT NULL,
    stock_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    avg_price REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, stock_id)
  )
`);

// Seed stocks if empty
const stockCount = db.prepare('SELECT COUNT(*) as c FROM stocks').get().c;
if (stockCount === 0) {
  const seedStocks = [
    ['KUMR', 'Kumarbaz AŞ', '🎰', 1000, 1000],
    ['BOTS', 'Bot Teknoloji', '🤖', 750, 750],
    ['MFIA', 'Mafya Ltd', '🔫', 1500, 1500],
    ['KRAL', 'Kral Holding', '👑', 2000, 2000],
    ['FAKE', 'Sahte Coin', '🪙', 300, 300],
    ['RIZK', 'Rızk Gıda', '🍕', 500, 500],
  ];
  const seedStmt = db.prepare('INSERT INTO stocks (id, name, emoji, price, prev_price, last_update) VALUES (?, ?, ?, ?, ?, ?)');
  const now = Date.now();
  for (const s of seedStocks) {
    seedStmt.run(s[0], s[1], s[2], s[3], s[4], now);
  }
  console.log('[DB] 6 hisse senedi eklendi.');
}

// ─── Tournament Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    bet INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    bracket TEXT DEFAULT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tournament_participants (
    tournament_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  )
`);

// ─── Bank Functions ───
const getBankAccount = (userId) => db.prepare('SELECT * FROM bank_accounts WHERE user_id = ?').get(userId);

const bankDeposit = (userId, amount) => {
  const existing = getBankAccount(userId);
  if (existing) {
    // Apply accrued interest first before new deposit
    const interest = calcInterest(existing);
    db.prepare('UPDATE bank_accounts SET amount = amount + ? + ?, deposited_at = ? WHERE user_id = ?')
      .run(amount, interest, Date.now(), userId);
  } else {
    db.prepare('INSERT INTO bank_accounts (user_id, amount, deposited_at) VALUES (?, ?, ?)')
      .run(userId, amount, Date.now());
  }
};

const bankWithdraw = (userId, amount) => {
  const account = getBankAccount(userId);
  if (!account) return null;
  const interest = calcInterest(account);
  const total = account.amount + interest;
  if (amount > total) return null;
  const remaining = total - amount;
  if (remaining <= 0) {
    db.prepare('DELETE FROM bank_accounts WHERE user_id = ?').run(userId);
  } else {
    db.prepare('UPDATE bank_accounts SET amount = ?, deposited_at = ? WHERE user_id = ?')
      .run(remaining, Date.now(), userId);
  }
  return { withdrawn: amount, interest, remaining };
};

const calcInterest = (account) => {
  const hours = (Date.now() - account.deposited_at) / (1000 * 60 * 60);
  const rate = Math.min(hours * 0.01, 0.50); // %1/saat, maks %50
  return Math.floor(account.amount * rate);
};

const getAllBankAccounts = () => db.prepare('SELECT * FROM bank_accounts ORDER BY amount DESC').all();

// ─── Stock Functions ───
const getStocks = () => db.prepare('SELECT * FROM stocks ORDER BY id ASC').all();
const getStock = (id) => db.prepare('SELECT * FROM stocks WHERE id = ?').get(id.toUpperCase());

const updateStockPrices = () => {
  const stocks = getStocks();
  const now = Date.now();
  const minInterval = 5 * 60 * 1000; // 5 dakika
  const update = db.prepare('UPDATE stocks SET prev_price = price, price = ?, last_update = ? WHERE id = ?');
  let updated = false;
  for (const s of stocks) {
    if (now - s.last_update < minInterval) continue;
    const change = 1 + (Math.random() * 0.30 - 0.15); // ±%15
    let newPrice = Math.round(s.price * change);
    if (newPrice < 10) newPrice = 10; // minimum fiyat
    update.run(newPrice, now, s.id);
    updated = true;
  }
  return updated;
};

const buyStock = (userId, stockId, quantity) => {
  const stock = getStock(stockId);
  if (!stock) return null;
  const totalCost = stock.price * quantity;
  const existing = db.prepare('SELECT * FROM stock_portfolio WHERE user_id = ? AND stock_id = ?').get(userId, stock.id);
  if (existing) {
    const newQty = existing.quantity + quantity;
    const newAvg = ((existing.avg_price * existing.quantity) + (stock.price * quantity)) / newQty;
    db.prepare('UPDATE stock_portfolio SET quantity = ?, avg_price = ? WHERE user_id = ? AND stock_id = ?')
      .run(newQty, newAvg, userId, stock.id);
  } else {
    db.prepare('INSERT INTO stock_portfolio (user_id, stock_id, quantity, avg_price) VALUES (?, ?, ?, ?)')
      .run(userId, stock.id, quantity, stock.price);
  }
  return { stock, totalCost, quantity };
};

const sellStock = (userId, stockId, quantity) => {
  const stock = getStock(stockId);
  if (!stock) return null;
  const existing = db.prepare('SELECT * FROM stock_portfolio WHERE user_id = ? AND stock_id = ?').get(userId, stock.id.toUpperCase());
  if (!existing || existing.quantity < quantity) return null;
  const revenue = stock.price * quantity;
  const profit = revenue - Math.round(existing.avg_price * quantity);
  const remaining = existing.quantity - quantity;
  if (remaining <= 0) {
    db.prepare('DELETE FROM stock_portfolio WHERE user_id = ? AND stock_id = ?').run(userId, stock.id);
  } else {
    db.prepare('UPDATE stock_portfolio SET quantity = ? WHERE user_id = ? AND stock_id = ?')
      .run(remaining, userId, stock.id);
  }
  return { stock, revenue, quantity, profit };
};

const getPortfolio = (userId) => {
  return db.prepare(`
    SELECT p.*, s.name, s.emoji, s.price as current_price
    FROM stock_portfolio p
    JOIN stocks s ON p.stock_id = s.id
    WHERE p.user_id = ?
    ORDER BY (p.quantity * s.price) DESC
  `).all(userId);
};

// ─── Tournament Functions ───
const createTournament = (chatId, createdBy, bet) => {
  const result = db.prepare("INSERT INTO tournaments (chat_id, created_by, bet, status, created_at) VALUES (?, ?, ?, 'waiting', ?)")
    .run(chatId, createdBy, bet, Date.now());
  const tid = result.lastInsertRowid;
  db.prepare('INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)').run(tid, createdBy);
  return tid;
};

const joinTournament = (tournamentId, userId) => {
  db.prepare('INSERT OR IGNORE INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)').run(tournamentId, userId);
};

const getTournament = (chatId) => {
  return db.prepare("SELECT * FROM tournaments WHERE chat_id = ? AND status IN ('waiting', 'active') ORDER BY created_at DESC LIMIT 1").get(chatId);
};

const getTournamentById = (id) => {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
};

const getParticipants = (tournamentId) => {
  return db.prepare('SELECT user_id FROM tournament_participants WHERE tournament_id = ?').all(tournamentId).map(r => r.user_id);
};

const updateTournament = (id, fields) => {
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  vals.push(id);
  db.prepare(`UPDATE tournaments SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
};

const deleteTournament = (id) => {
  db.prepare('DELETE FROM tournament_participants WHERE tournament_id = ?').run(id);
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
};

// ─── Admin Roles Table ───
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    user_id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'mod',
    added_by TEXT,
    added_at INTEGER NOT NULL
  )
`);

// Seed owner (hardcoded, cannot be removed via commands)
const OWNER_ID = '905510395152@c.us';
const existingOwner = db.prepare('SELECT * FROM admins WHERE user_id = ?').get(OWNER_ID);
if (!existingOwner) {
  db.prepare('INSERT OR REPLACE INTO admins (user_id, role, added_by, added_at) VALUES (?, ?, ?, ?)').run(OWNER_ID, 'owner', 'system', Date.now());
  console.log('[DB] Owner seed edildi:', OWNER_ID);
}

// ─── Admin Role Functions ───
const getAdmin = (userId) => db.prepare('SELECT * FROM admins WHERE user_id = ?').get(userId);

const addAdmin = (userId, role, addedBy) => {
  db.prepare('INSERT OR REPLACE INTO admins (user_id, role, added_by, added_at) VALUES (?, ?, ?, ?)').run(userId, role, addedBy, Date.now());
};

const removeAdmin = (userId) => {
  if (userId === OWNER_ID) return false; // Owner cannot be removed
  db.prepare('DELETE FROM admins WHERE user_id = ?').run(userId);
  return true;
};

const getAllAdmins = () => db.prepare('SELECT * FROM admins ORDER BY role ASC, added_at ASC').all();

/**
 * Check if user has at least the given role level
 * Hierarchy: owner > admin > mod
 */
const hasRole = (userId, minRole) => {
  const admin = getAdmin(userId);
  if (!admin) return false;
  const hierarchy = { 'owner': 3, 'admin': 2, 'mod': 1 };
  return (hierarchy[admin.role] || 0) >= (hierarchy[minRole] || 0);
};

const isOwner = (userId) => {
  const admin = getAdmin(userId);
  return admin && admin.role === 'owner';
};

module.exports = {
  db, getUser, addUser, updateBalance, setDaily, getTopUsers, getTopActiveUsers, getAllUsers,
  hasSeenPatch, markPatchSeen, getSetting, updateSetting, getAllSettings,
  getMilyonerPlayed, incrementMilyonerPlayed,
  incrementMsgCount, recordWin, recordLoss,
  marry, divorce,
  addWanted, getWanted, getAllWanted, removeWanted,
  getAlias, setAlias, getAllAliases, migrateUser,
  addSpamLog, getSpamLogs,
  setBalance, deleteUser,
  addAnimal, getInventory, getTeam, setTeamSlot, clearTeam, removeAnimal,
  getUnseenQuestion, markQuestionSeen, getSeenCount, getTotalQuestionCount,
  // Bank
  getBankAccount, bankDeposit, bankWithdraw, calcInterest, getAllBankAccounts,
  // Stocks
  getStocks, getStock, updateStockPrices, buyStock, sellStock, getPortfolio,
  // Tournaments
  createTournament, joinTournament, getTournament, getTournamentById, getParticipants, updateTournament, deleteTournament,
  // Admin Roles
  OWNER_ID, getAdmin, addAdmin, removeAdmin, getAllAdmins, hasRole, isOwner
};

