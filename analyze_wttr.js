const axios = require('axios');

(async () => {
    try {
        const url = 'https://wttr.in/Pendik?format=j1&lang=tr';
        const { data } = await axios.get(url);
        console.log('Query: Pendik');
        console.log('Nearest Area:', JSON.stringify(data.nearest_area[0]));
        console.log('Request:', JSON.stringify(data.request[0]));
        console.log('Current:', JSON.stringify(data.current_condition[0]));
    } catch (e) {
        console.error(e.message);
    }
})();
