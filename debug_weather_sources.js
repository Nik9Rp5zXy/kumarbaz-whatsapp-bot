const axios = require('axios');
const fs = require('fs');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function test(url, filename) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': UA,
                'Accept-Language': 'tr-TR,tr;q=0.9'
            }
        });
        console.log(`\n--- ${url} --- Status: 200`);
        fs.writeFileSync(filename, data);
        console.log(`Saved to ${filename}`);
    } catch (e) {
        console.log(`\n--- ${url} --- ERROR: ${e.message}`);
    }
}

(async () => {
    // Note: TRT uses city names in URL, need to be lowercase-english.
    // "istanbul" is fine. "izmir" is fine. "sanliurfa" might be needed.
    await test('https://www.trthaber.com/hava-durumu/istanbul/', 'trt.html');
    await test('https://www.ntv.com.tr/istanbul-hava-durumu', 'ntv.html');
})();
