const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'commands');
const files = fs.readdirSync(dir).map(f => path.join(dir, f));

files.forEach(f => {
    if (!f.endsWith('.js')) return;
    let c = fs.readFileSync(f, 'utf8');
    
    // Add wait to resolve() calls
    c = c.replace(/(?<!await\s+)resolve\(/g, 'await resolve(');
    
    // Specific fix for admin.js
    if (f.endsWith('admin.js')) {
        c = c.replace(/const parseTargetId = \(args, msg, resolve\) => {/, 'const parseTargetId = async (args, msg, resolve) => {');
        c = c.replace(/(?<!await\s+)parseTargetId\(/g, 'await parseTargetId(');
    }
    
    fs.writeFileSync(f, c, 'utf8');
});

// Fix src/index.js resolveMentionedId
const idxPath = path.join(__dirname, 'src', 'index.js');
let idx = fs.readFileSync(idxPath, 'utf8');
idx = idx.replace(/const resolveMentionedId = \(rawId\) => {/, 'const resolveMentionedId = async (rawId) => {');
idx = idx.replace(/(?<!await\s+)resolveMentionedId\(/g, 'await resolveMentionedId(');
fs.writeFileSync(idxPath, idx, 'utf8');

console.log('Done Async Resolve and parseTargetId fixing!');
