const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'commands');
const files = [
    ...fs.readdirSync(dir).map(f => path.join(dir, f)),
    path.join(__dirname, 'src', 'index.js'),
    path.join(__dirname, 'src', 'spam.js')
];

files.forEach(f => {
    if (!f.endsWith('.js')) return;
    let c = fs.readFileSync(f, 'utf8');
    // Add await before getRandom( if not already awaited
    let n = c.replace(/(?<!await\s+)getRandom\(/g, 'await getRandom(');
    if (n !== c) {
        fs.writeFileSync(f, n, 'utf8');
        console.log('Fixed:', f);
    }
});

console.log('Done!');
