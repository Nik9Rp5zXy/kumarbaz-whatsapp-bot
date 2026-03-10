const axios = require('axios');
const { centeredBox } = require('./utils');

const cache = {}; // city -> { data, timestamp }
const CACHE_DURATION = 30 * 60 * 1000; // 30 dakika cache

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getWeather(city) {
    const now = Date.now();
    const cityLower = city.toLowerCase().trim();

    // 1. Check Cache
    if (cache[cityLower] && (now - cache[cityLower].time < CACHE_DURATION)) {
        return { ...cache[cityLower], fromCache: true };
    }

    try {
        // wttr.in returns JSON without API key. stable and fast.
        // lang=tr translates condition text.
        const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=tr`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': UA } });

        const current = data.current_condition[0];
        const location = data.nearest_area[0];

        const result = {
            temp: current.temp_C,
            weather: current.lang_tr ? current.lang_tr[0].value : current.weatherDesc[0].value,
            loc: location.areaName[0].value,
            country: location.country[0].value,
            humidity: current.humidity,
            wind: current.windspeedKmph,
            feelsLike: current.FeelsLikeC,
            time: now
        };

        // 3. Update Cache
        cache[cityLower] = result;
        return result;

    } catch (e) {
        console.error(`Weather fetch error for ${city}:`, e.message);
        return null; // City not found or server error
    }
}

module.exports = async (command, args, msg) => {
    switch (command) {
        case 'hava':
        case 'weather':
        case 'durum': {
            if (args.length === 0) return msg.reply('⚠️ Hangi şehir?\nÖrnek: !hava Istanbul');

            const city = args.join(' ');
            const msgRef = await msg.reply(centeredBox(['🔍 Hava durumu alınıyor...', city], 'METEOROLOJİ'));

            const data = await getWeather(city);

            if (!data) {
                // Try fallback to "Istanbul" if input was weird, but usually wttr handles it.
                return msgRef.edit(centeredBox([
                    '❌ Şehir bulunamadı.',
                    'Lütfen ismini doğru yaz.',
                    'Örn: !hava Ankara'
                ], 'HATA'));
            }

            const country = data.country === 'Turkey' ? 'Türkiye' : data.country;
            const station = data.loc;

            const lines = [
                `🌡️ Sıcaklık: ${data.temp}°C`,
                `🤔 Hissedilen: ${data.feelsLike}°C`,
                `☁️ Durum: ${data.weather}`,
                `💧 Nem: %${data.humidity}`,
                `💨 Rüzgar: ${data.wind} km/s`,
                ' ',
                `📍 İstasyon: ${station}, ${country}`,
                data.fromCache ? '🕒 (Önbellek)' : '🟢 (Canlı Veri)'
            ];

            return msgRef.edit(centeredBox(lines, `HAVA DURUMU: ${city.toUpperCase()}`));
        }

        default:
            return false;
    }
};
