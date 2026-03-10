const express = require('express');
const path = require('path');
const apiRoutes = require('./api');

const PORT = 3000;

const startWebServer = () => {
    const app = express();

    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    // API routes
    app.use('/api', apiRoutes);

    app.listen(PORT, () => {
        console.log(`🌐 Admin Panel: http://localhost:${PORT}`);
    });
};

module.exports = { startWebServer };
