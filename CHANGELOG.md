# 📜 CHANGELOG (Değişiklik Günlüğü)

Tüm önemli değişiklikler bu dosyada belgelenecektir.

## [1.9.0] - 2024-03-10
### 🚀 İyileştirmeler & Düzeltmeler
- **Mobil Uyumlu Menüler**: `!yardim`, `!yardim full` ve `!adminyardim` içindeki uzun metinler alt satırlara bölünerek daraltıldı. Artık WhatsApp mobil cihazlarında (telefonlarda) satır kayması/ASCİİ tablo bozulması yaşanmayacak.
- **Kapsamlı Yama Bildirimi (Broadcast)**: Yama notları sistemi güncellendi. Artık update geldikten sonra komut yazan kullanıcılara, yeni Milyoner mekaniklerini ve Yatırım Danışmanı simülasyonunu detaylıca anlatan çok daha uzun ve öğretici bir "GÜNCELLEME NOTLARI" mesajı gönderiliyor.


## [1.8.0] - 2024-03-10
### 🚀 Yenilikler
- **Milyoner Dinamik Sayaç & Animasyon:** 
  - Süre artık her soruda azalıyor (30sn -> 10sn).
  - WhatsApp üzerinden canlı sayaç sistemi eklendi (Her 5sn'de bir tık).
  - Her soru öncesinde "*Hazırlan 3... 2... 1...*" ve Final animasyonları eklendi.
  - Jokerler sadece zor sorulara (4 ve 5) özel yapıldı.
- **Yatırım Danışmanı Simülasyonu (Broke Advice):** Bakiyesi 500$'ın altına düşen kullanıcılar bakiye sorguladıklarında (`!bakiye`) rastgele bir şekilde Borsaya (`!borsa`) veya Bankaya (`!banka`) yönlendirilecek finansal tavsiyeler satmaya çalışan bir Broker simülasyonu eklendi.
- **Yama Bildirimi (Update Broadcast):** Bot güncellenip açıldığında, kullanıcılara yeni yama notlarını (örn: v1.8.0 yenilikleri) anlatan tek seferlik bir tanıtım mesajı eklendi.


## [1.7.0] - 2024-03-10
### 🚀 Yenilikler
- **Kim Milyoner Olmak İster Güncellemesi:**
  - ⏳ **Süre Sınırı:** Her soru için katı **30 Saniye** mola süresi. Süre dolarsa anında elenme.
  - 🃏 **Jokerler Eklendi:** `!joker 50` (İki yanlış şıkkı siler) ve `!joker cift` (Çift cevap hakkı verir).
- **Global Crash Logger (Hata Yakalama):** Bot fatal error verip çöktüğünde (`uncaughtException`), logu anında `crash_log.txt`'ye kaydedip **otomatik olarak GitHub'a pushlar.**
- **Canlı Güncelleme Uyarıları (Graceful Restart):** Bot kapatılırken son 1 dakika içinde komut kullanan kişilere otomatik *"Bot güncelleniyor, lütfen bekleyin"* mesajı atar. Ayrıca bot kapalıyken atılan komutlara, açılır açılmaz *"Bot güncellendi ve aktif"* yanıtını vererek işleme alır.

### 🐛 Hata Düzeltmeleri
- **Turnuva Hatası (`!turnuva`):** SQLite'ta "waiting" stringinin çift tırnakla çevrilmesinden kaynaklanan `no such column: "waiting"` çökme hatası düzeltildi.


## [1.6.0] - 2024-03-10
### 📦 Çevre Birimleri ve Paket Çözümleri (Termux & Android)
- **Chromium Bağımlılıkları:** Termux üzerinde `x11-repo` sisteme eklendi ve `chromium` paketi başarıyla kuruldu.
- **C++ Derleme Araçları:** `better-sqlite3` paketinin Termux'ta derlenebilmesi için `clang` ve `binutils` ayarlandı.
- **Node-Gyp NDK Hatası:** Termux'ta Android NDK yolu değişkeni atlatıldı (`android_ndk_path=`).
- **LLVM Toolchain:** Derleyici araçları standart GNU yerine Termux LLVM'ine yönlendirildi (`llvm-ar`, `clang++`).
- **Puppeteer Hatası Atlatıldı:** ARM64 Android için `PUPPETEER_SKIP_DOWNLOAD=true` eklendi.

### ⚙️ Kaynak Kod Güncellemeleri
- **Chromium Yolu:** `whatsapp-web.js` için Termux'taki yerel Chromium dizini eklendi (`/data/data/com.termux/...`).
- **Performans Argümanları:** Termux kısıtlamalarını aşmak için Chromium args eklendi (`--no-sandbox`, `--disable-dev-shm-usage`, `--single-process` vb.).
- **QR Terminal Spamı Engellendi:** `console.clear()` ile her seferinde terminal temizlenerek gereksiz kaydırma önlendi.
- **Admin Paneli Yenilendi:** Localhost web paneli silindi, yerine WhatsApp içi komut tabanlı Admin/Mod rol sistemi (`admins` tablosu) kuruldu.
- **Kullanıcı Rol Kontrolü:** Tüm kullanıcıların kendi rollerini görebilmeleri için `!rlchk` (veya `!rolum`) komutu eklendi.
- **Numara Desteği (Admin):** Yetkili komutları (örn. `!bakiye_ayarla`) artık salt numara `905551234567` şeklinde (etiket zorunluluğu olmadan) da kullanıma açıldı.
- **Oto-Güncelleme:** Tüm dosyaları git'ten otomatik çeken `update.sh` entegrasyonu sağlandı.


## [1.5.0] - 2024-02-13
### Eklendi (Milyoner & Sorular)
- **Kim Milyoner Olmak İster (!milyoner):** 5 soruluk bilgi yarışması.
  - Ödül basamakları: 250$ - 5000$.
  - %25 Güvence sistemi (yanlış cevapta bir miktar para iadesi).
  - İstediğin zaman çekilme özelliği (!cekilme).
- **Soru Havuzu:**
  - Tarih, Bilim, Coğrafya, Spor, Genel Kültür kategorilerinde toplam **350 soru**.
  - **No-Repeat Sistemi:** Kullanıcının çözdüğü sorular veritabanında saklanır ve bir daha sorulmaz.
- **Yardım Menüsü:** `!yardim` komutu kategorilere ayrılarak güncellendi.

## [1.4.0] - 2024-02-13
### Eklendi (Blackjack & Kartlar)
- **Blackjack (!bj):**
  - Gerçek 52 kartlık deste simülasyonu.
  - `!hit` (kart çek) ve `!dur` (kal) komutları.
  - Krupiye yapay zekası (17'ye kadar çeker).
  - Doğal Blackjack (21) için x1.5 ödeme.
  - Kart görselleri (ASCII art).

## [1.3.0] - 2024-02-13
### Eklendi (Zoo & Hayvanat Bahçesi)
- **Hayvanat Bahçesi Sistemi (!zoo):**
  - **Avlanma (!av):** 6 farklı nadirlik seviyesinde hayvan yakalama.
  - **Envanter (!envanter):** Yakalanan hayvanları ve güçlerini görüntüleme.
  - **Takım Kurma (!takim):** En güçlü hayvanlardan 3 kişilik takım oluşturma.
  - **Oto Takım (!otoolustur):** En güçlü takımı otomatik kuran algoritma.
  - **Savaş (!savas):** Diğer oyuncuların takımlarıyla PvP savaşı yapma.
  - **İlahi Seviye:** %0.1 şansla çıkan **Anka Kuşu** (5000 HP).

## [1.2.0] - 2024-02-13
### Eklendi (Hangman & Adam Asmaca)
- **Adam Asmaca (!aa):**
  - Arkadaşına meydan okuma sistemi.
  - Kelimeyi DM'den (özel mesaj) bot'a gizlice gönderme.
  - Grup sohbetinde canlı ASCII çizimi ile oyun takibi.
  - Bahisli oyun desteği.

## [1.1.0] - 2024-02-12
### Düzeltme & İyileştirme
- **Komut Sistemi (Refactor):**
  - `||` zinciri yerine güvenli `try-catch` döngüsü ile komut işleme.
  - Bir komutun hatası artık tüm botu çökertmiyor.
- **Admin Paneli:** Yerel ağda çalışan (localhost:3000) yönetim paneli eklendi.
- **Spam Koruması:** Flood yapan kullanıcılar için otomatik süreli ban sistemi.
- **Canlı Sayaçlar:** Rulet ve Boss etkinliklerinde saniye sayacı eklendi.
- **İptal Komutu (!iptal):** Aktif tüm oyunları (Rulet, Boss, Hangman) iptal edip paraları iade eden komut.

## [1.0.0] - 2024-02-10
### Başlangıç (Release)
- **Ekonomi:** !gunluk, !bakiye, !transfer, !siralama.
- **Kumar:** !yazitura, !slot, !zar, !rulet.
- **Aksiyon:** !duello, !soygun, !wanted.
- **Sosyal:** !evlilik, !profil, !kader, !falci, !unvan.
- **Veritabanı:** SQLite tabanlı kullanıcı ve bakiye sistemi.
