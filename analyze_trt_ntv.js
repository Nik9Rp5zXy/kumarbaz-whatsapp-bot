const fs = require('fs');
const cheerio = require('cheerio');

function analyze(filename) {
    console.log(`\n\n=== Analyzing ${filename} ===`);
    try {
        const html = fs.readFileSync(filename, 'utf8');
        const $ = cheerio.load(html);

        console.log('Title:', $('title').text().trim());

        if (filename.includes('trt')) {
            // Check TRT specific
            console.log('.bilgi-kutu:', $('.bilgi-kutu').length);
            console.log('.sehir-info:', $('.sehir-info').length);
            console.log('.derece:', $('.derece').length);
            console.log('.durum:', $('.durum').length);
            console.log('.temperature:', $('.temperature').text().trim());
            console.log('.weather-status:', $('.weather-status').text().trim());

            // Dump whatever looks like temp
            const temp = $('body').text().match(/(\d+)\s*°/);
            if (temp) console.log('Regex temp match:', temp[0]);
        } else {
            // Check NTV specific
            console.log('.d-weather-temperature:', $('.d-weather-temperature').length);
            console.log('.d-weather-summary:', $('.d-weather-summary').length);
            console.log('.temp:', $('.temp').text().trim());
            // Dump whatever looks like temp
            const temp = $('body').text().match(/(\d+)\s*°/);
            if (temp) console.log('Regex temp match:', temp[0]);
        }

    } catch (e) {
        console.log('Error:', e.message);
    }
}

analyze('trt.html');
analyze('ntv.html');
