const { Client } = require('ssh2');

const conn = new Client();

const script = `
pm2 kill
cd ~
rm -rf kumarbaz-whatsapp-bot
git clone https://github.com/Nik9Rp5zXy/kumarbaz-whatsapp-bot.git
cd kumarbaz-whatsapp-bot
echo 'MONGO_URI="mongodb+srv://fbtrmehmet_db_user:M4kifLocalData@gambling-bot-wp.afiy7yk.mongodb.net/kumarbaz?retryWrites=true&w=majority&appName=gambling-bot-wp"' > .env
npm install
pm2 start src/index.js --name kumarbaz-bot
`;

conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '193.164.4.57',
  port: 22,
  username: 'm4kif',
  password: 'L0calappdata',
  readyTimeout: 99999
});
