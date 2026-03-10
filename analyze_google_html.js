const fs = require('fs');
const cheerio = require('cheerio');

try {
    const html = fs.readFileSync('google_response.html', 'utf8');
    const $ = cheerio.load(html);

    console.log('Page Title:', $('title').text());
    console.log('Body start:', $('body').text().slice(0, 100).replace(/\s+/g, ' '));

    console.log('#wob_tm count:', $('#wob_tm').length);
    console.log('.wob_t count:', $('.wob_t').length);
    console.log('.BNeawe count:', $('.BNeawe').length);

    if ($('.BNeawe').length > 0) {
        console.log('First .BNeawe text:', $('.BNeawe').first().text());
        console.log('All .BNeawe text:', $('.BNeawe').map((i, el) => $(el).text()).get().join(' | '));
    }

    if ($('#wob_tm').length > 0) {
        console.log('#wob_tm text:', $('#wob_tm').text());
    }

} catch (e) {
    console.error(e);
}
