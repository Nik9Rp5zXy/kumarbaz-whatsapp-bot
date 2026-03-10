#!/data/data/com.termux/files/usr/bin/bash

# ============================================
#  🎰 Kumarbaz WhatsApp Bot - Termux Kurulumu
# ============================================

echo "╔══════════════════════════════════════╗"
echo "║  🎰 Kumarbaz Bot - Termux Kurulumu   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Paket listesini güncelle
echo "📦 Paketler güncelleniyor..."
pkg update -y && pkg upgrade -y

# Gerekli paketleri kur
echo "📦 Node.js kuruluyor..."
pkg install -y nodejs-lts

echo "📦 Build araçları kuruluyor (better-sqlite3 için)..."
pkg install -y python make

echo "📦 Chromium kuruluyor (WhatsApp Web için)..."
pkg install -y chromium

# npm bağımlılıklarını kur
echo "📦 npm bağımlılıkları kuruluyor..."
npm install

echo ""
echo "╔══════════════════════════════════════╗"
echo "║  ✅ Kurulum tamamlandı!              ║"
echo "║                                      ║"
echo "║  Botu başlatmak için:                ║"
echo "║  npm start                           ║"
echo "║                                      ║"
echo "║  Güncellemek için:                   ║"
echo "║  bash update.sh                      ║"
echo "║                                      ║"
echo "║  QR kodu WhatsApp'tan okutun.        ║"
echo "║  Admin Panel: http://localhost:3000   ║"
echo "╚══════════════════════════════════════╝"
