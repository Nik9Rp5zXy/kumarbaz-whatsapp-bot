require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in .env file!');
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

// ─── schemas ───

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // userId
    balance: { type: Number, default: 0 },
    last_daily: { type: Number, default: 0 },
    daily_streak: { type: Number, default: 0 },
    msg_count: { type: Number, default: 0 },
    total_won: { type: Number, default: 0 },
    total_lost: { type: Number, default: 0 },
    games_won: { type: Number, default: 0 },
    games_lost: { type: Number, default: 0 },
    spouse: { type: String, default: null },
    last_patch_seen: { type: String, default: '1.0.0' },
    milyoner_last_date: { type: String, default: null },
    milyoner_played_today: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const UserAliasSchema = new mongoose.Schema({
    alias_id: { type: String, required: true, unique: true },
    primary_id: { type: String, required: true }
});
const UserAlias = mongoose.model('UserAlias', UserAliasSchema);

const WantedListSchema = new mongoose.Schema({
    target_id: { type: String, required: true, unique: true },
    placed_by: { type: String, required: true },
    bounty: { type: Number, required: true },
    created_at: { type: Number, required: true }
});
const WantedList = mongoose.model('WantedList', WantedListSchema);

const SpamLogSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    action: { type: String, required: true },
    created_at: { type: Number, required: true }
});
const SpamLog = mongoose.model('SpamLog', SpamLogSchema);

const SettingSchema = new mongoose.Schema({
    key_name: { type: String, required: true, unique: true },
    key_value: { type: String, required: true }
});
const Setting = mongoose.model('Setting', SettingSchema);

const ZooInventorySchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    animal_key: { type: String, required: true },
    hp: { type: Number, required: true },
    str: { type: Number, required: true },
    rarity: { type: String, required: true },
    caught_at: { type: Number, required: true },
    legacy_id: { type: Number } // For migration
});
const ZooInventory = mongoose.model('ZooInventory', ZooInventorySchema);

const ZooActiveTeamSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    slot: { type: Number, required: true },
    inventory_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ZooInventory', required: true }
});
ZooActiveTeamSchema.index({ user_id: 1, slot: 1 }, { unique: true });
const ZooActiveTeam = mongoose.model('ZooActiveTeam', ZooActiveTeamSchema);

const MilyonerQuestionSchema = new mongoose.Schema({
    difficulty: { type: Number, required: true },
    question: { type: String, required: true },
    option_a: { type: String, required: true },
    option_b: { type: String, required: true },
    option_c: { type: String, required: true },
    option_d: { type: String, required: true },
    correct: { type: String, required: true },
    legacy_id: { type: Number } // For migration
});
const MilyonerQuestion = mongoose.model('MilyonerQuestion', MilyonerQuestionSchema);

const UserSeenQuestionSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    question_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MilyonerQuestion', required: true },
    seen_at: { type: Number, required: true }
});
UserSeenQuestionSchema.index({ user_id: 1, question_id: 1 }, { unique: true });
const UserSeenQuestion = mongoose.model('UserSeenQuestion', UserSeenQuestionSchema);

const BankAccountSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    amount: { type: Number, default: 0 },
    deposited_at: { type: Number, required: true }
});
const BankAccount = mongoose.model('BankAccount', BankAccountSchema);

const StockSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // KOZA etc.
    name: { type: String, required: true },
    emoji: { type: String, required: true },
    price: { type: Number, required: true },
    prev_price: { type: Number, required: true },
    last_update: { type: Number, required: true }
});
const Stock = mongoose.model('Stock', StockSchema);

const StockPortfolioSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    stock_id: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    avg_price: { type: Number, default: 0 }
});
StockPortfolioSchema.index({ user_id: 1, stock_id: 1 }, { unique: true });
const StockPortfolio = mongoose.model('StockPortfolio', StockPortfolioSchema);

const TournamentSchema = new mongoose.Schema({
    chat_id: { type: String, required: true },
    created_by: { type: String, required: true },
    bet: { type: Number, required: true },
    status: { type: String, default: 'waiting' },
    bracket: { type: String, default: null },
    created_at: { type: Number, required: true },
    legacy_id: { type: Number }
});
const Tournament = mongoose.model('Tournament', TournamentSchema);

const TournamentParticipantSchema = new mongoose.Schema({
    tournament_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    user_id: { type: String, required: true }
});
TournamentParticipantSchema.index({ tournament_id: 1, user_id: 1 }, { unique: true });
const TournamentParticipant = mongoose.model('TournamentParticipant', TournamentParticipantSchema);

const AdminSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    role: { type: String, default: 'mod' },
    added_by: { type: String },
    added_at: { type: Number, required: true }
});
const Admin = mongoose.model('Admin', AdminSchema);

const OWNER_ID = '905510395152@c.us';

// ─── DB Initialization ───
const initializeDB = async () => {
    // defaults
    await Setting.updateOne({ key_name: 'owner_mode' }, { $setOnInsert: { key_value: 'false' }}, { upsert: true });
    await Setting.updateOne({ key_name: 'milyoner_daily_limit' }, { $setOnInsert: { key_value: '2' }}, { upsert: true });

    // Seed Owner
    const owner = await Admin.findOne({ user_id: OWNER_ID });
    if (!owner) {
        await Admin.create({ user_id: OWNER_ID, role: 'owner', added_by: 'system', added_at: Date.now() });
        console.log('[DB] Owner seeded:', OWNER_ID);
    }
};
mongoose.connection.once('open', () => initializeDB());

// ─── API Functions ───

const getUser = async (id) => {
    return await User.findOne({ id }).lean();
};

const addUser = async (id) => {
    const existing = await User.findOne({ id });
    if (existing) return existing.toObject();
    const newUser = await User.create({ id, balance: 0, msg_count: 0 });
    return newUser.toObject();
};

const updateBalance = async (id, amount) => {
    return await User.findOneAndUpdate(
        { id },
        { $inc: { balance: amount } },
        { new: true, upsert: false } // Only act if doc exists (most cases it does via addUser)
    ).lean();
};

const setDaily = async (id) => {
    await User.updateOne({ id }, { last_daily: Date.now() });
};

const incrementMsgCount = async (id) => {
    await User.updateOne({ id }, { $inc: { msg_count: 1 } });
};

const getTopUsers = async (limit = 10) => {
    return await User.find().sort({ balance: -1 }).limit(limit).lean();
};

const getTopActiveUsers = async (limit = 10) => {
    return await User.find().sort({ msg_count: -1 }).limit(limit).lean();
};

const getAllUsers = async () => {
    return await User.find().sort({ balance: -1 }).lean();
};

const setBalance = async (id, amount) => {
    await User.updateOne({ id }, { balance: amount });
};

const deleteUser = async (id) => {
    await User.deleteOne({ id });
    await UserAlias.deleteMany({ $or: [{ alias_id: id }, { primary_id: id }] });
};

// ─── Patch Notları & Ayarlar ───
const hasSeenPatch = async (id, patchVersion) => {
    const user = await getUser(id);
    if (!user) return false;
    return user.last_patch_seen === patchVersion;
};

const markPatchSeen = async (id, patchVersion) => {
    await User.updateOne({ id }, { last_patch_seen: patchVersion });
};

const getSetting = async (key) => {
    const s = await Setting.findOne({ key_name: key }).lean();
    return s ? s.key_value : null;
};

const updateSetting = async (key, value) => {
    await Setting.updateOne({ key_name: key }, { key_value: value }, { upsert: true });
};

const getAllSettings = async () => {
    return await Setting.find().lean();
};

// ─── Milyoner Daily Logic ───
const getMilyonerPlayed = async (id) => {
    const user = await getUser(id);
    if (!user) return 0;
    const today = new Date().toLocaleDateString('tr-TR');
    if (user.milyoner_last_date !== today) {
        await User.updateOne({ id }, { milyoner_last_date: today, milyoner_played_today: 0 });
        return 0;
    }
    return user.milyoner_played_today || 0;
};

const incrementMilyonerPlayed = async (id) => {
    const today = new Date().toLocaleDateString('tr-TR');
    await User.updateOne({ id }, { milyoner_last_date: today, $inc: { milyoner_played_today: 1 } });
};

// ─── Stats ───
const recordWin = async (id, amount) => {
    await User.updateOne({ id }, { $inc: { games_won: 1, total_won: amount } });
};

const recordLoss = async (id, amount) => {
    await User.updateOne({ id }, { $inc: { games_lost: 1, total_lost: Math.abs(amount) } });
};

// ─── Marriage ───
const marry = async (id1, id2) => {
    await User.updateOne({ id: id1 }, { spouse: id2 });
    await User.updateOne({ id: id2 }, { spouse: id1 });
};

const divorce = async (id) => {
    const user = await getUser(id);
    if (user && user.spouse) {
        await User.updateOne({ id: user.spouse }, { spouse: null });
        await User.updateOne({ id }, { spouse: null });
    }
};

// ─── Wanted ───
const addWanted = async (targetId, placedBy, bounty) => {
    await WantedList.updateOne(
        { target_id: targetId },
        { placed_by: placedBy, bounty, created_at: Date.now() },
        { upsert: true }
    );
};

const getWanted = async (targetId) => {
    return await WantedList.findOne({ target_id: targetId }).lean();
};

const getAllWanted = async () => {
    return await WantedList.find().sort({ bounty: -1 }).lean();
};

const removeWanted = async (targetId) => {
    await WantedList.deleteOne({ target_id: targetId });
};

// ─── Alias ───
const getAlias = async (aliasId) => {
    const rec = await UserAlias.findOne({ alias_id: aliasId }).lean();
    return rec ? rec.primary_id : null;
};

const setAlias = async (aliasId, primaryId) => {
    await UserAlias.updateOne({ alias_id: aliasId }, { primary_id }, { upsert: true });
};

const getAllAliases = async () => {
    return await UserAlias.find().lean();
};

const migrateUser = async (oldId, newId) => {
    const oldUser = await getUser(oldId);
    if (!oldUser) return;
    const newUser = await getUser(newId);
    if (newUser) {
        await User.updateOne({ id: newId }, {
            $inc: {
                balance: oldUser.balance || 0,
                msg_count: oldUser.msg_count || 0,
                total_won: oldUser.total_won || 0,
                total_lost: oldUser.total_lost || 0,
                games_won: oldUser.games_won || 0,
                games_lost: oldUser.games_lost || 0
            }
        });
        if ((oldUser.last_daily || 0) > (newUser.last_daily || 0)) {
            await User.updateOne({ id: newId }, {
                last_daily: oldUser.last_daily,
                daily_streak: oldUser.daily_streak
            });
        }
        await User.deleteOne({ id: oldId });
    } else {
        await User.updateOne({ id: oldId }, { id: newId });
    }
};

// ─── Spam Log ───
const addSpamLog = async (userId, action) => {
    await SpamLog.create({ user_id: userId, action, created_at: Date.now() });
};
const getSpamLogs = async (limit = 50) => {
    return await SpamLog.find().sort({ created_at: -1 }).limit(limit).lean();
};

// ─── Zoo ───
const addAnimal = async (userId, animalKey, hp, str, rarity) => {
    const doc = await ZooInventory.create({ user_id: userId, animal_key: animalKey, hp, str, rarity, caught_at: Date.now() });
    return doc._id.toString();
};

const getInventory = async (userId) => {
    const list = await ZooInventory.find({ user_id: userId }).lean();
    // Sort logic from sqlite query
    list.sort((a,b) => (b.hp + b.str * 2) - (a.hp + a.str * 2));
    list.forEach(i => i.id = i._id.toString());
    return list;
};

const getTeam = async (userId) => {
    const team = await ZooActiveTeam.find({ user_id: userId }).populate('inventory_id').sort({ slot: 1 }).lean();
    return team.map(t => {
        if (!t.inventory_id) return null;
        let p = t.inventory_id;
        p.id = p._id.toString();
        p.slot = t.slot;
        return p;
    }).filter(p => p !== null);
};

const setTeamSlot = async (userId, slot, inventoryId) => {
    await ZooActiveTeam.updateOne(
        { user_id: userId, slot },
        { inventory_id: inventoryId },
        { upsert: true }
    );
};

const clearTeam = async (userId) => {
    await ZooActiveTeam.deleteMany({ user_id: userId });
};

const removeAnimal = async (userId, inventoryId) => {
    await ZooActiveTeam.deleteMany({ user_id: userId, inventory_id: inventoryId });
    await ZooInventory.deleteOne({ _id: inventoryId, user_id: userId });
};

// ─── Milyoner ───
const getUnseenQuestion = async (userId, difficulty) => {
    // Check unseen by querying those not in user_seen_questions
    const seenQs = await UserSeenQuestion.find({ user_id: userId }).distinct('question_id');
    const docs = await MilyonerQuestion.find({ difficulty, _id: { $nin: seenQs } }).lean();
    if (docs.length === 0) return null;
    return docs[Math.floor(Math.random() * docs.length)];
};

const markQuestionSeen = async (userId, questionId) => {
    await UserSeenQuestion.updateOne(
        { user_id: userId, question_id: questionId },
        { seen_at: Date.now() },
        { upsert: true }
    );
};

const getSeenCount = async (userId) => {
    return await UserSeenQuestion.countDocuments({ user_id: userId });
};

const getTotalQuestionCount = async () => {
    return await MilyonerQuestion.countDocuments();
};

// ─── Bank ───
const getBankAccount = async (userId) => {
    return await BankAccount.findOne({ user_id: userId }).lean();
};

const calcInterest = (account) => {
    const hours = (Date.now() - account.deposited_at) / (1000 * 60 * 60);
    const rate = Math.min(hours * 0.01, 0.50); // %1/saat, maks %50
    return Math.floor(account.amount * rate);
};

const bankDeposit = async (userId, amount) => {
    const existing = await getBankAccount(userId);
    if (existing) {
        const interest = calcInterest(existing);
        await BankAccount.updateOne(
            { user_id: userId },
            { $inc: { amount: amount + interest }, deposited_at: Date.now() }
        );
    } else {
        await BankAccount.create({ user_id: userId, amount, deposited_at: Date.now() });
    }
};

const bankWithdraw = async (userId, amount) => {
    const account = await getBankAccount(userId);
    if (!account) return null;
    const interest = calcInterest(account);
    const total = account.amount + interest;
    if (amount > total) return null;
    const remaining = total - amount;
    if (remaining <= 0) {
        await BankAccount.deleteOne({ user_id: userId });
    } else {
        await BankAccount.updateOne({ user_id: userId }, { amount: remaining, deposited_at: Date.now() });
    }
    return { withdrawn: amount, interest, remaining };
};

const getAllBankAccounts = async () => {
    return await BankAccount.find().sort({ amount: -1 }).lean();
};

// ─── Stocks ───
const getStocks = async () => {
    return await Stock.find().sort({ id: 1 }).lean();
};
const getStock = async (id) => {
    return await Stock.findOne({ id: id.toUpperCase() }).lean();
};

const updateStockPrices = async () => {
    const stocks = await getStocks();
    const now = Date.now();
    const minInterval = 5 * 60 * 1000;
    let updated = false;
    for (const s of stocks) {
        if (now - s.last_update < minInterval) continue;
        const change = 1 + (Math.random() * 0.30 - 0.15); // ±%15
        let newPrice = Math.round(s.price * change);
        if (newPrice < 10) newPrice = 10;
        await Stock.updateOne({ id: s.id }, { prev_price: s.price, price: newPrice, last_update: now });
        updated = true;
    }
    return updated;
};

const buyStock = async (userId, stockId, quantity) => {
    const stock = await getStock(stockId);
    if (!stock) return null;
    const totalCost = stock.price * quantity;
    const existing = await StockPortfolio.findOne({ user_id: userId, stock_id: stock.id }).lean();
    if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg = ((existing.avg_price * existing.quantity) + (stock.price * quantity)) / newQty;
        await StockPortfolio.updateOne(
            { user_id: userId, stock_id: stock.id },
            { quantity: newQty, avg_price: newAvg }
        );
    } else {
        await StockPortfolio.create({ user_id: userId, stock_id: stock.id, quantity, avg_price: stock.price });
    }
    return { stock, totalCost, quantity };
};

const sellStock = async (userId, stockId, quantity) => {
    const stock = await getStock(stockId);
    if (!stock) return null;
    const existing = await StockPortfolio.findOne({ user_id: userId, stock_id: stock.id.toUpperCase() }).lean();
    if (!existing || existing.quantity < quantity) return null;
    const revenue = stock.price * quantity;
    const profit = revenue - Math.round(existing.avg_price * quantity);
    const remaining = existing.quantity - quantity;
    if (remaining <= 0) {
        await StockPortfolio.deleteOne({ user_id: userId, stock_id: stock.id });
    } else {
        await StockPortfolio.updateOne(
            { user_id: userId, stock_id: stock.id },
            { quantity: remaining }
        );
    }
    return { stock, revenue, quantity, profit };
};

const getPortfolio = async (userId) => {
    const userPort = await StockPortfolio.find({ user_id: userId }).lean();
    if (!userPort.length) return [];
    const stockIds = userPort.map(p => p.stock_id);
    const stocks = await Stock.find({ id: { $in: stockIds } }).lean();
    const stockMap = {};
    stocks.forEach(s => stockMap[s.id] = s);
    
    return userPort.map(p => {
        const s = stockMap[p.stock_id];
        return {
            ...p,
            name: s ? s.name : '???',
            emoji: s ? s.emoji : '❓',
            current_price: s ? s.price : 0
        };
    }).sort((a,b) => (b.quantity * b.current_price) - (a.quantity * a.current_price));
};

// ─── Tournaments ───
const createTournament = async (chatId, createdBy, bet) => {
    const doc = await Tournament.create({ chat_id: chatId, created_by: createdBy, bet, status: 'waiting', created_at: Date.now() });
    await TournamentParticipant.create({ tournament_id: doc._id, user_id: createdBy });
    return doc._id.toString();
};

const joinTournament = async (tournamentId, userId) => {
    try {
        await TournamentParticipant.create({ tournament_id: tournamentId, user_id: userId });
    } catch (e) {
        // IGNORE DUPLICATES
    }
};

const getTournament = async (chatId) => {
    const t = await Tournament.find({ chat_id: chatId, status: { $in: ['waiting', 'active'] } }).sort({ created_at: -1 }).limit(1).lean();
    if (t.length) {
        t[0].id = t[0]._id.toString();
        return t[0];
    }
    return null;
};

const getTournamentById = async (id) => {
    const t = await Tournament.findById(id).lean();
    if (t) t.id = t._id.toString();
    return t;
};

const getParticipants = async (tournamentId) => {
    const p = await TournamentParticipant.find({ tournament_id: tournamentId }).lean();
    return p.map(x => x.user_id);
};

const updateTournament = async (id, fields) => {
    await Tournament.updateOne({ _id: id }, { $set: fields });
};

const deleteTournament = async (id) => {
    await TournamentParticipant.deleteMany({ tournament_id: id });
    await Tournament.deleteOne({ _id: id });
};

// ─── Admin Roles ───
const getAdmin = async (userId) => {
    return await Admin.findOne({ user_id: userId }).lean();
};

const addAdmin = async (userId, role, addedBy) => {
    await Admin.updateOne(
        { user_id: userId },
        { role, added_by: addedBy, added_at: Date.now() },
        { upsert: true }
    );
};

const removeAdmin = async (userId) => {
    if (userId === OWNER_ID) return false;
    await Admin.deleteOne({ user_id: userId });
    return true;
};

const getAllAdmins = async () => {
    return await Admin.find().sort({ role: 1, added_at: 1 }).lean();
};

const hasRole = async (userId, minRole) => {
    const admin = await getAdmin(userId);
    if (!admin) return false;
    const hierarchy = { 'owner': 3, 'admin': 2, 'mod': 1 };
    return (hierarchy[admin.role] || 0) >= (hierarchy[minRole] || 0);
};

const isOwner = async (userId) => {
    const admin = await getAdmin(userId);
    return admin && admin.role === 'owner';
};

// ─── Export Mongo Logic ───
module.exports = {
  db: mongoose.connection,
  // Model Exports for internal migration use
  Models: {
    User, UserAlias, WantedList, SpamLog, Setting, ZooInventory, ZooActiveTeam,
    MilyonerQuestion, UserSeenQuestion, BankAccount, Stock, StockPortfolio,
    Tournament, TournamentParticipant, Admin
  },
  
  getUser, addUser, updateBalance, setDaily, getTopUsers, getTopActiveUsers, getAllUsers,
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
