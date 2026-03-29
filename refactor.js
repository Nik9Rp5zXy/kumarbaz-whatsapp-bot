const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, 'src', 'commands');
const rootDir = __dirname;
const spamJs = path.join(__dirname, 'src', 'spam.js');
const indexJs = path.join(__dirname, 'src', 'index.js');
const rootIndexJs = path.join(__dirname, 'src', 'commands', 'index.js'); // the router

const asyncFns = [
    'getUser', 'addUser', 'updateBalance', 'setDaily', 'getTopUsers', 'getTopActiveUsers', 'getAllUsers',
    'hasSeenPatch', 'markPatchSeen', 'getSetting', 'updateSetting', 'getAllSettings',
    'getMilyonerPlayed', 'incrementMilyonerPlayed', 'incrementMsgCount', 'recordWin', 'recordLoss',
    'marry', 'divorce', 'addWanted', 'getWanted', 'getAllWanted', 'removeWanted',
    'getAlias', 'setAlias', 'getAllAliases', 'migrateUser', 'addSpamLog', 'getSpamLogs',
    'setBalance', 'deleteUser', 'addAnimal', 'getInventory', 'getTeam', 'setTeamSlot', 'clearTeam', 'removeAnimal',
    'getUnseenQuestion', 'markQuestionSeen', 'getSeenCount', 'getTotalQuestionCount', 'getBankAccount',
    'bankDeposit', 'bankWithdraw', 'getAllBankAccounts', 'getStocks', 'getStock', 'updateStockPrices',
    'buyStock', 'sellStock', 'getPortfolio', 'createTournament', 'joinTournament', 'getTournament',
    'getTournamentById', 'getParticipants', 'updateTournament', 'deleteTournament', 'getAdmin', 'addAdmin',
    'removeAdmin', 'getAllAdmins', 'hasRole', 'isOwner'
];

const regex = new RegExp(`(?<!await\\s+)\\b(${asyncFns.join('|')})\\s*\\(`, 'g');

const processFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace db import with mongo
    content = content.replace(/require\(['"]\.\.\/database\/db['"]\)/g, "require('../database/mongo')");
    content = content.replace(/require\(['"]\.\/database\/db['"]\)/g, "require('./database/mongo')");

    // Replace function calls with await function calls
    content = content.replace(regex, 'await $1(');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Refactored: ${filePath}`);
    }
};

const handleCommands = () => {
    const files = fs.readdirSync(commandsDir);
    for (const file of files) {
        if (file.endsWith('.js')) {
            processFile(path.join(commandsDir, file));
        }
    }
};

handleCommands();
processFile(spamJs);
processFile(indexJs);

console.log('✅ Refactoring done!');
