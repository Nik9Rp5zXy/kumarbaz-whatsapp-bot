const { getUser, addUser, updateBalance, getStocks, getStock, updateStockPrices, buyStock, sellStock, getPortfolio } = require('../database/db');
const { centeredBox, troll, getRandom } = require('./utils');

module.exports = async (command, args, msg, userId, user, resolve) => {
    switch (command) {
        case 'borsa':
        case 'piyasa':
        case 'market': {
            updateStockPrices(); // Update prices if stale
            const stocks = getStocks();
            const lines = ['📈 BORSA TABLOSU', ' '];
            for (const s of stocks) {
                const change = s.price - s.prev_price;
                const pct = s.prev_price > 0 ? ((change / s.prev_price) * 100).toFixed(1) : '0.0';
                const arrow = change > 0 ? '🟢↑' : change < 0 ? '🔴↓' : '⚪→';
                const sign = change >= 0 ? '+' : '';
                lines.push(`${s.emoji} ${s.id}: ${s.price}$ ${arrow} ${sign}${pct}%`);
            }
            lines.push(' ', '!al <sembol> <adet> ile satın al');
            lines.push('!sat <sembol> <adet> ile sat');
            return msg.reply(centeredBox(lines, 'BORSA'));
        }

        case 'hisse':
        case 'stock': {
            const symbol = (args[0] || '').toUpperCase();
            if (!symbol) return msg.reply('⚠️ Hangi hisse?\nKullanım: !hisse KUMR');
            updateStockPrices();
            const stock = getStock(symbol);
            if (!stock) return msg.reply('⚠️ Böyle bir hisse yok. !borsa ile listeye bak.');

            const change = stock.price - stock.prev_price;
            const pct = stock.prev_price > 0 ? ((change / stock.prev_price) * 100).toFixed(1) : '0.0';
            const arrow = change > 0 ? '🟢 YUKARI' : change < 0 ? '🔴 AŞAĞI' : '⚪ YATAY';
            const sign = change >= 0 ? '+' : '';

            return msg.reply(centeredBox([
                `${stock.emoji} ${stock.name}`,
                `Sembol: ${stock.id}`,
                ' ',
                `💵 Fiyat: ${stock.price} $`,
                `📊 Değişim: ${sign}${change}$ (${sign}${pct}%)`,
                `${arrow}`,
                ' ',
                `!al ${stock.id} <adet>`,
            ], 'HİSSE DETAY'));
        }

        case 'al':
        case 'buy': {
            const symbol = (args[0] || '').toUpperCase();
            const quantity = parseInt(args[1]);
            if (!symbol || isNaN(quantity) || quantity <= 0) {
                return msg.reply('⚠️ Kullanım: !al <sembol> <adet>\nÖrnek: !al KUMR 5');
            }

            updateStockPrices();
            const stock = getStock(symbol);
            if (!stock) return msg.reply('⚠️ Böyle bir hisse yok. !borsa ile listeye bak.');

            const totalCost = stock.price * quantity;
            if (totalCost > user.balance) return msg.reply(`⚠️ ${getRandom(troll.poor)}\nToplam maliyet: ${totalCost} $ — Bakiye: ${user.balance} $`);

            updateBalance(userId, -totalCost);
            const result = buyStock(userId, symbol, quantity);

            return msg.reply(centeredBox([
                '📈 HİSSE ALINDI',
                ' ',
                `${result.stock.emoji} ${result.stock.name}`,
                `Adet: ${result.quantity}`,
                `Birim Fiyat: ${result.stock.price} $`,
                `Toplam: ${result.totalCost} $`,
            ], 'BORSA İŞLEM'));
        }

        case 'sat':
        case 'sell': {
            const symbol = (args[0] || '').toUpperCase();
            let quantity = args[1];

            // Handle "hepsi" / "all"
            if (quantity === 'hepsi' || quantity === 'all') {
                const portfolio = getPortfolio(userId);
                const holding = portfolio.find(p => p.stock_id === symbol);
                if (!holding) return msg.reply('⚠️ Bu hisseden elinde yok.');
                quantity = holding.quantity;
            } else {
                quantity = parseInt(quantity);
            }

            if (!symbol || isNaN(quantity) || quantity <= 0) {
                return msg.reply('⚠️ Kullanım: !sat <sembol> <adet>\nÖrnek: !sat KUMR 5 veya !sat KUMR hepsi');
            }

            updateStockPrices();
            const result = sellStock(userId, symbol, quantity);
            if (!result) return msg.reply('⚠️ Elinde o kadar hisse yok veya sembol yanlış.');

            updateBalance(userId, result.revenue);

            const profitEmoji = result.profit >= 0 ? '🟢' : '🔴';
            const profitSign = result.profit >= 0 ? '+' : '';

            return msg.reply(centeredBox([
                '📉 HİSSE SATILDI',
                ' ',
                `${result.stock.emoji} ${result.stock.name}`,
                `Adet: ${result.quantity}`,
                `Birim Fiyat: ${result.stock.price} $`,
                `Gelir: ${result.revenue} $`,
                `${profitEmoji} Kâr/Zarar: ${profitSign}${result.profit} $`,
            ], 'BORSA İŞLEM'));
        }

        case 'portfoy':
        case 'portfolio': {
            updateStockPrices();
            const portfolio = getPortfolio(userId);
            if (!portfolio || portfolio.length === 0) {
                return msg.reply(centeredBox([
                    '💼 PORTFÖY',
                    ' ',
                    'Henüz hissen yok.',
                    '!borsa ile piyasayı incele',
                    '!al <sembol> <adet> ile başla',
                ], 'PORTFÖY'));
            }

            let totalValue = 0;
            let totalCost = 0;
            const lines = ['💼 PORTFÖY', ' '];
            for (const p of portfolio) {
                const value = p.quantity * p.current_price;
                const cost = Math.round(p.quantity * p.avg_price);
                const profit = value - cost;
                const sign = profit >= 0 ? '+' : '';
                totalValue += value;
                totalCost += cost;
                lines.push(`${p.emoji} ${p.stock_id}: ${p.quantity} adet`);
                lines.push(`  ${p.current_price}$/adet = ${value}$ (${sign}${profit}$)`);
            }
            const totalProfit = totalValue - totalCost;
            const totalSign = totalProfit >= 0 ? '+' : '';
            lines.push(' ');
            lines.push(`💰 Toplam Değer: ${totalValue} $`);
            lines.push(`${totalProfit >= 0 ? '🟢' : '🔴'} Kâr/Zarar: ${totalSign}${totalProfit} $`);

            return msg.reply(centeredBox(lines, 'PORTFÖY'));
        }

        default:
            return false;
    }
};
