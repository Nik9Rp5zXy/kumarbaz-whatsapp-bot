require('dotenv').config();
const sqliteDB = require('./src/database/db'); 
// Ensure mongo.js doesn't execute initializeDB before we insert our own defaults, but we'll just wait for mongo connection.
const mongoDB = require('./src/database/mongo');
const { Models } = mongoDB;

const migrate = async () => {
    console.log('🔄 Starting SQLite -> MongoDB Migration...');
    
    // Wait for Mongo connection
    await new Promise(resolve => {
        if(mongoDB.db.readyState === 1) resolve();
        else mongoDB.db.once('open', resolve);
    });
    console.log('✅ MongoDB connected');

    try {
        // Clear all collections to avoid conflicts
        console.log('🧹 Clearing existing MongoDB records...');
        await Promise.all(Object.values(Models).map(m => m.deleteMany({})));

        // 1. Settings
        const settings = sqliteDB.getAllSettings();
        for (const s of settings) {
            await Models.Setting.create(s);
        }
        console.log(`✅ Synced Settings: ${settings.length}`);

        // 2. Admins
        const admins = sqliteDB.getAllAdmins();
        for (const a of admins) {
            await Models.Admin.create(a);
        }
        console.log(`✅ Synced Admins: ${admins.length}`);

        // 3. Aliases
        const aliases = sqliteDB.getAllAliases();
        for (const a of aliases) {
            await Models.UserAlias.create(a);
        }
        console.log(`✅ Synced Aliases: ${aliases.length}`);

        // 4. Users
        const users = sqliteDB.getAllUsers();
        for (const u of users) {
            await Models.User.create(u);
        }
        console.log(`✅ Synced Users: ${users.length}`);

        // 5. WantedList
        const wanted = sqliteDB.getAllWanted();
        for (const w of wanted) {
            await Models.WantedList.create(w);
        }
        console.log(`✅ Synced WantedList: ${wanted.length}`);

        // 6. SpamLog
        const spamLogs = sqliteDB.getSpamLogs(10000); // get max
        for (const s of spamLogs) {
            // delete id field since mongo generates _id
            delete s.id;
            await Models.SpamLog.create(s);
        }
        console.log(`✅ Synced SpamLogs: ${spamLogs.length}`);

        // 7. BankAccounts
        const bankAccounts = sqliteDB.getAllBankAccounts();
        for (const b of bankAccounts) {
            await Models.BankAccount.create(b);
        }
        console.log(`✅ Synced BankAccounts: ${bankAccounts.length}`);

        // 8. Stocks & Portfolio
        const stocks = sqliteDB.getStocks();
        for (const s of stocks) {
            await Models.Stock.create(s);
        }
        console.log(`✅ Synced Stocks: ${stocks.length}`);

        const portfolios = sqliteDB.db.prepare('SELECT * FROM stock_portfolio').all();
        for (const p of portfolios) {
            await Models.StockPortfolio.create(p);
        }
        console.log(`✅ Synced Portfolios: ${portfolios.length}`);

        // 9. Milyoner Questions & Seen
        const questions = sqliteDB.db.prepare('SELECT * FROM milyoner_questions').all();
        const mqMap = {};
        for (const q of questions) {
            const tempId = q.id;
            delete q.id;
            q.legacy_id = tempId;
            const doc = await Models.MilyonerQuestion.create(q);
            mqMap[tempId] = doc._id;
        }
        console.log(`✅ Synced MilyonerQuestions: ${questions.length}`);

        const seenQuestions = sqliteDB.db.prepare('SELECT * FROM user_seen_questions').all();
        let skippedSeen = 0;
        for (const sq of seenQuestions) {
            const mongoQId = mqMap[sq.question_id];
            if (mongoQId) {
                await Models.UserSeenQuestion.create({ user_id: sq.user_id, question_id: mongoQId, seen_at: sq.seen_at });
            } else {
                skippedSeen++;
            }
        }
        console.log(`✅ Synced UserSeenQuestions: ${seenQuestions.length - skippedSeen} (Skipped ${skippedSeen})`);

        // 10. Zoo Inventory & Teams
        const zooInventories = sqliteDB.db.prepare('SELECT * FROM zoo_inventory').all();
        const zooMap = {};
        for (const zi of zooInventories) {
            const tempId = zi.id;
            delete zi.id;
            zi.legacy_id = tempId;
            const doc = await Models.ZooInventory.create(zi);
            zooMap[tempId] = doc._id;
        }
        console.log(`✅ Synced ZooInventory: ${zooInventories.length}`);

        const zooTeams = sqliteDB.db.prepare('SELECT * FROM zoo_active_team').all();
        let skippedZoo = 0;
        for (const zt of zooTeams) {
            const mongoZooId = zooMap[zt.inventory_id];
            if (mongoZooId) {
                await Models.ZooActiveTeam.create({ user_id: zt.user_id, slot: zt.slot, inventory_id: mongoZooId });
            } else {
                skippedZoo++;
            }
        }
        console.log(`✅ Synced ZooActiveTeam: ${zooTeams.length - skippedZoo} (Skipped ${skippedZoo})`);

        // 11. Tournaments
        const tournaments = sqliteDB.db.prepare('SELECT * FROM tournaments').all();
        const tMap = {};
        for (const t of tournaments) {
            const tempId = t.id;
            delete t.id;
            t.legacy_id = tempId;
            const doc = await Models.Tournament.create(t);
            tMap[tempId] = doc._id;
        }
        console.log(`✅ Synced Tournaments: ${tournaments.length}`);

        const tParticipants = sqliteDB.db.prepare('SELECT * FROM tournament_participants').all();
        let skippedT = 0;
        for (const tp of tParticipants) {
            const mongoTId = tMap[tp.tournament_id];
            if (mongoTId) {
                await Models.TournamentParticipant.create({ tournament_id: mongoTId, user_id: tp.user_id });
            } else {
                skippedT++;
            }
        }
        console.log(`✅ Synced TournamentParticipants: ${tParticipants.length - skippedT} (Skipped ${skippedT})`);

        console.log('🎉 MIGRATION COMPLETELY SUCCESSFUL!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Error:', err);
        process.exit(1);
    }
};

migrate();
