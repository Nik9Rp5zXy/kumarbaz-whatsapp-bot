require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✅ Bağlantı başarılı!');
    process.exit(0);
  })
  .catch((e) => {
    console.log('HATA:', e.message);
    process.exit(1);
  });
