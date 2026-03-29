const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const walk = dir => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
       if (!file.includes('node_modules')) results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}

const files = walk('.');
let errors = 0;
files.forEach(f => {
   try {
     cp.execSync(`node -c "${f}"`);
   } catch (e) {
     console.error('SYNTAX ERROR IN', f);
     console.error(e.stderr.toString());
     errors++;
   }
});

if (errors === 0) console.log('ALL FILES CLEAN!');
else process.exit(1);
