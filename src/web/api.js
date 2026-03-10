const express = require('express');
const router = express.Router();
const { getAllUsers, getUser, updateBalance, setBalance, deleteUser,
    getAllAliases, getAllWanted, removeWanted, getSpamLogs, addUser } = require('../database/db');

// ─── Dashboard Stats ───
router.get('/stats', (req, res) => {
    const users = getAllUsers();
    const totalUsers = users.length;
    const totalEconomy = users.reduce((sum, u) => sum + u.balance, 0);
    const totalMessages = users.reduce((sum, u) => sum + (u.msg_count || 0), 0);
    const totalGamesWon = users.reduce((sum, u) => sum + (u.games_won || 0), 0);
    const totalGamesLost = users.reduce((sum, u) => sum + (u.games_lost || 0), 0);
    const richest = users[0] || null;
    const poorest = users[users.length - 1] || null;

    res.json({ totalUsers, totalEconomy, totalMessages, totalGamesWon, totalGamesLost, richest, poorest });
});

// ─── Users ───
router.get('/users', (req, res) => {
    const users = getAllUsers();
    res.json(users);
});

router.get('/users/:id', (req, res) => {
    const user = getUser(decodeURIComponent(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

router.post('/users/:id/balance', (req, res) => {
    const { amount, action } = req.body; // action: 'add', 'remove', 'set'
    const id = decodeURIComponent(req.params.id);
    let user = getUser(id);
    if (!user) user = addUser(id);

    if (action === 'set') setBalance(id, amount);
    else if (action === 'remove') updateBalance(id, -Math.abs(amount));
    else updateBalance(id, Math.abs(amount));

    res.json(getUser(id));
});

router.delete('/users/:id', (req, res) => {
    const id = decodeURIComponent(req.params.id);
    deleteUser(id);
    res.json({ success: true });
});

// ─── Aliases ───
router.get('/aliases', (req, res) => {
    res.json(getAllAliases());
});

// ─── Wanted ───
router.get('/wanted', (req, res) => {
    res.json(getAllWanted());
});

router.delete('/wanted/:id', (req, res) => {
    removeWanted(decodeURIComponent(req.params.id));
    res.json({ success: true });
});

// ─── Spam Logs ───
router.get('/spam', (req, res) => {
    res.json(getSpamLogs(100));
});

module.exports = router;
