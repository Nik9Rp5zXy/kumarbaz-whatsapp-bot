# 📜 CHANGELOG (Değişiklik Günlüğü)

Tüm önemli değişiklikler bu dosyada belgelenecektir.

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
