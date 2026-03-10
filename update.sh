#!/data/data/com.termux/files/usr/bin/bash

echo "🔄 Güncelleme başlatılıyor..."

# GitHub'dan en son kodları çek
git pull origin main

# Varsa yeni bağımlılıkları kur
echo "📦 Bağımlılıklar güncelleniyor..."
npm install

echo "✅ Güncelleme tamamlandı! Botu başlatmak için: npm start"
