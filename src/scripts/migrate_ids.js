const Database = require('better-sqlite3');
const db = new Database('gambling.db', { verbose: console.log });

console.log('--- STARTING MIGRATION ---');

// Get all users ending with @lid
const lidUsers = db.prepare("SELECT * FROM users WHERE id LIKE '%@lid'").all();

console.log(`Found ${lidUsers.length} @lid users to migrate.`);

const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

for (const lidUser of lidUsers) {
    const cUsId = lidUser.id.replace('@lid', '@c.us');
    console.log(`Migrating ${lidUser.id} -> ${cUsId}`);

    const cUsUser = getUser(cUsId);

    if (cUsUser) {
        // Target exists, merge data
        const newBalance = (cUsUser.balance || 0) + (lidUser.balance || 0);
        const newMsgCount = (cUsUser.msg_count || 0) + (lidUser.msg_count || 0);

        console.log(`Merging balances: ${cUsUser.balance} + ${lidUser.balance} = ${newBalance}`);

        db.prepare('UPDATE users SET balance = ?, msg_count = ? WHERE id = ?')
            .run(newBalance, newMsgCount, cUsId);

        // Delete old lid user
        db.prepare('DELETE FROM users WHERE id = ?').run(lidUser.id);
        console.log('Merged and deleted @lid record.');
    } else {
        // Target does not exist, just rename the id
        console.log('Target @c.us does not exist. Renaming ID.');
        db.prepare('UPDATE users SET id = ? WHERE id = ?')
            .run(cUsId, lidUser.id);
    }
}

console.log('--- MIGRATION COMPLETE ---');
