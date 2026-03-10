# 🎰 Kumarbaz WhatsApp Bot

Eğlenceli ve interaktif bir WhatsApp kumar botu. Kullanıcılar oyun oynayabilir, düello yapabilir, evlenebilir ve bir ekonomi sistemi içinde rekabet edebilir. Ayrıca kapsamlı bir admin paneli ve spam koruması içerir.

## 🚀 Teknolojiler

*   **Node.js**: Sunucu tarafı çalışma zamanı ortamı.
*   **whatsapp-web.js**: WhatsApp Web protokolünü kullanarak mesajlaşma otomasyonu sağlayan kütüphane.
*   **better-sqlite3**: Hızlı ve güvenilir yerel veritabanı (SQLite) yönetimi.
*   **Express.js**: Yerel admin paneli için web sunucusu ve API.
*   **HTML/CSS/JS**: Admin paneli arayüzü (Vanilla JS).

## 📂 Proje Yapısı

```
src/
├── commands/       # Komut modülleri (ekonomi, kumar, savaş, sosyal, vb.)
│   ├── admin.js    # Admin komutları (para ekle/sil)
│   ├── combat.js   # Düello ve soygun
│   ├── economy.js  # Günlük ödül, transfer, bakiye
│   ├── gambling.js # Yazı-tura, zar, slot
│   ├── hangman.js  # Adam asmaca (DM entegrasyonlu)
│   ├── social.js   # Rulet, Boss, Evlilik, Falcı, Profil
│   ├── index.js    # Komut yönlendiricisi (Router)
│   └── utils.js    # Yardımcı fonksiyonlar (kutu çizimi, troll mesajlar)
├── database/       # Veritabanı işlemleri
│   └── db.js       # SQLite bağlantısı ve sorgular
├── web/            # Admin paneli (Express sunucusu)
│   ├── public/     # Frontend dosyaları (HTML/CSS/JS)
│   ├── api.js      # REST API rotaları
│   └── server.js   # Sunucu başlatma kodu
├── index.js        # Ana giriş dosyası (Bot başlatma, ID çözümleme)
└── spam.js         # Spam koruma sistemi
```

## ✨ Özellikler

### 💰 Ekonomi & Kumar
*   **`!gunluk`**: 24 saatte bir 500$ ödül.
*   **`!bakiye`**: Cüzdan durumu ve unvan.
*   **`!transfer`**: Arkadaşına para gönderme.
*   **`!yazitura`**, **`!zar`**, **`!slot`**: Klasik kumar oyunları.

### ⚔️ Savaş & Rekabet
*   **`!duello`**: Bahisli kapışma (kazanan parayı alır).
*   **`!soygun`**: Riskli hırsızlık (%40 şans, yakalanırsan ceza).
*   **`!wanted`**: Kullanıcıları aranan ilan etme (soyan bonus alır).

### 👥 Sosyal & Grup İçi
*   **`!rulet`**: Gruplu rulet, 30sn katılım süresi, kazanan hepsini alır.
*   **`!boss`**: Grupça boss kesme, hasara göre ödül paylaşımı.
*   **`!aa` (Adam Asmaca)**: DM'den kelime seçmeli, grupça tahmin etmeli oyun.
*   **`!evlilik` / `!bosanma`**: Sanal evlilik sistemi (eş bonusu).
*   **`!profil`**: Tüm istatistiklerin (W/L oranı, net kazanç) olduğu kart.
*   **`!unvan`**: Bakiyeye göre değişen unvanlar (Çöpçü -> Sultan).

### 🛡️ Güvenlik & Sistem
*   **WhatsApp Admin Paneli**: Artık tüm yönetim WhatsApp üzerinden! `Owner`, `Admin` ve `Mod` rolleri.
    *   `!admin_ata`, `!bakiye_ayarla`, `!istatistik`, `!ban`, `!spamlog` gibi komutlarla tam kontrol.
    *   Etiketleyerek (`@kisi`) veya direkt numara yazarak (`90555...`) işlem yapma desteği.
    *   Kullanıcıların kendi rollerini görebilmesi için `!rlchk` (veya `!rolum`) komutu eklendi.
*   **Spam Koruması**: Hızlı komut kullanımında uyarı -> soft ban -> hard ban (+para cezası).
*   **ID Linking**: Farklı cihaz ID'lerini (`@lid`) ve numara ID'lerini (`@c.us`) otomatik eşleştirir.
*   **Oto-Güncelleme (Termux)**: Tek komutla (`bash update.sh`) botu güncelleyebilirsiniz.

---

## 🛠️ Kurulum ve Çalıştırma

### 💻 Normal Kurulum (PC / Windows / Linux / macOS)

1.  **Node.js** yüklü olduğundan emin olun ([nodejs.org](https://nodejs.org/))

2.  Bağımlılıkları yükleyin:
    ```bash
    npm install
    ```

3.  Botu başlatın:
    ```bash
    npm start
    ```

4.  Terminalde çıkan QR kodunu WhatsApp uygulamanızdan okutun.

5.  **Admin Paneli**: Bot çalıştığında tarayıcınızdan `http://localhost:3000` adresine gidin.

---

### 📱 Termux Kurulumu (Android)

Termux, Android cihazınızda bu botu çalıştırmanıza olanak tanır.

#### Otomatik Kurulum (Önerilen)

1.  [Termux](https://f-droid.org/packages/com.termux/) uygulamasını F-Droid'den indirin.

2.  Projeyi klonlayın:
    ```bash
    pkg install git -y
    git clone https://github.com/KULLANICI_ADI/REPO_ADI.git
    cd REPO_ADI
    ```

3.  Kurulum script'ini çalıştırın:
    ```bash
    bash termux-setup.sh
    ```

4.  Botu başlatın:
    ```bash
    npm start
    ```

5.  QR kodunu WhatsApp'tan okutun.

#### Manuel Kurulum

Adım adım kendiniz kurmak isterseniz:

```bash
# Paketleri güncelle
pkg update -y && pkg upgrade -y

# Gerekli paketleri kur
pkg install -y nodejs-lts python make chromium

# Bağımlılıkları kur
npm install

# Botu başlat
npm start
```

> **Not:** Termux ortamı otomatik olarak algılanır ve Chromium ayarları buna göre yapılandırılır. Ekstra bir ayar yapmanıza gerek yoktur.

---

## 📝 Notlar
*   Veritabanı dosyası `gambling.db` proje kök dizininde otomatik oluşturulur.
*   Admin paneli sadece yerel ağda (`localhost`) çalışır.
*   Termux'ta ilk `npm install` biraz uzun sürebilir (native modüller derleniyor).
*   Termux'ta Chromium `--no-sandbox` modunda çalışır (Android kısıtlaması).
