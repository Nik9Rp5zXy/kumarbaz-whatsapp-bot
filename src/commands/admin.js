const { getUser, addUser, updateBalance, setBalance, deleteUser,
  getAllUsers, getSpamLogs, getAllAliases,
  hasRole, isOwner, addAdmin, removeAdmin, getAllAdmins, getAdmin, OWNER_ID } = require('../database/db');
const { centeredBox } = require('./utils');

// ─── Ban system (in-memory, shared with spam.js) ───
const manualBans = new Map(); // userId -> bannedUntil timestamp

const isManuallyBanned = (userId) => {
  const until = manualBans.get(userId);
  if (!until) return false;
  if (Date.now() > until) { manualBans.delete(userId); return false; }
  return true;
};

const getManualBanRemaining = (userId) => {
  const until = manualBans.get(userId);
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
};

module.exports = async (command, args, msg, userId, user, resolve, client) => {
  switch (command) {

    // ═══════════════════════════════════════
    //  OWNER KOMUTLARI
    // ═══════════════════════════════════════

    case 'admin_ata': {
      if (!isOwner(userId)) return msg.reply('🚫 Bu komutu sadece bot sahibi kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !admin_ata @kisi');
      const normTarget = resolve(target);
      addAdmin(normTarget, 'admin', userId);
      return msg.reply(`✅ @${normTarget.split('@')[0]} artık *Admin* 🛡️`, undefined, { mentions: [target] });
    }

    case 'admin_cikar': {
      if (!isOwner(userId)) return msg.reply('🚫 Bu komutu sadece bot sahibi kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !admin_cikar @kisi');
      const normTarget = resolve(target);
      const adminInfo = getAdmin(normTarget);
      if (!adminInfo) return msg.reply('⚠️ Bu kişi zaten admin/mod değil.');
      if (adminInfo.role === 'owner') return msg.reply('⚠️ Owner kaldırılamaz.');
      removeAdmin(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} admin yetkisi kaldırıldı.`, undefined, { mentions: [target] });
    }

    // ═══════════════════════════════════════
    //  ADMIN + OWNER KOMUTLARI
    // ═══════════════════════════════════════

    case 'mod_ata': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !mod_ata @kisi');
      const normTarget = resolve(target);
      addAdmin(normTarget, 'mod', userId);
      return msg.reply(`✅ @${normTarget.split('@')[0]} artık *Moderatör* 🔧`, undefined, { mentions: [target] });
    }

    case 'mod_cikar': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !mod_cikar @kisi');
      const normTarget = resolve(target);
      const modInfo = getAdmin(normTarget);
      if (!modInfo || modInfo.role !== 'mod') return msg.reply('⚠️ Bu kişi mod değil.');
      removeAdmin(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} mod yetkisi kaldırıldı.`, undefined, { mentions: [target] });
    }

    case 'admin_ekle':
    case 'addmoney': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const addTarget = msg.mentionedIds && msg.mentionedIds[0];
      if (!addTarget) return msg.reply('⚠️ Kullanım: !admin_ekle @kisi <miktar>');

      let addAmount = NaN;
      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && !arg.includes('@')) { addAmount = num; break; }
      }
      if (isNaN(addAmount)) return msg.reply('⚠️ Miktar gir.');

      const normAddTarget = resolve(addTarget);
      let targetUserAdd = getUser(normAddTarget);
      if (!targetUserAdd) targetUserAdd = addUser(normAddTarget);

      updateBalance(normAddTarget, addAmount);
      return msg.reply(`✅ @${normAddTarget.split('@')[0]} hesabına *${addAmount}$* eklendi.`, undefined, { mentions: [addTarget] });
    }

    case 'admin_sil':
    case 'removemoney': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const remTarget = msg.mentionedIds && msg.mentionedIds[0];
      if (!remTarget) return msg.reply('⚠️ Kullanım: !admin_sil @kisi <miktar>');

      let remAmount = NaN;
      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && !arg.includes('@')) { remAmount = num; break; }
      }
      if (isNaN(remAmount)) return msg.reply('⚠️ Miktar gir.');

      const normRemTarget = resolve(remTarget);
      let targetUserRem = getUser(normRemTarget);
      if (!targetUserRem) targetUserRem = addUser(normRemTarget);

      updateBalance(normRemTarget, -remAmount);
      return msg.reply(`✅ @${normRemTarget.split('@')[0]} hesabından *${remAmount}$* silindi.`, undefined, { mentions: [remTarget] });
    }

    case 'bakiye_ayarla': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !bakiye_ayarla @kisi <miktar>');

      let amount = NaN;
      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && !arg.includes('@')) { amount = num; break; }
      }
      if (isNaN(amount)) return msg.reply('⚠️ Miktar gir.');

      const normTarget = resolve(target);
      let tUser = getUser(normTarget);
      if (!tUser) tUser = addUser(normTarget);
      setBalance(normTarget, amount);
      return msg.reply(`✅ @${normTarget.split('@')[0]} bakiyesi *${amount}$* olarak ayarlandı.`, undefined, { mentions: [target] });
    }

    case 'kullanici_sil': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !kullanici_sil @kisi');
      const normTarget = resolve(target);
      deleteUser(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} veritabanından silindi.`, undefined, { mentions: [target] });
    }

    // ═══════════════════════════════════════
    //  MOD + ADMIN + OWNER KOMUTLARI
    // ═══════════════════════════════════════

    case 'ban': {
      if (!hasRole(userId, 'mod')) return msg.reply('🚫 Bu komutu sadece modlar kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !ban @kisi <süre_dakika>');
      const normTarget = resolve(target);

      // Cannot ban someone with equal or higher role
      if (hasRole(normTarget, 'mod')) return msg.reply('⚠️ Admin/Mod banlayamazsın.');

      let duration = 5; // default 5 dakika
      for (const arg of args) {
        const num = parseInt(arg);
        if (!isNaN(num) && !arg.includes('@')) { duration = num; break; }
      }

      manualBans.set(normTarget, Date.now() + duration * 60 * 1000);
      return msg.reply(`🔨 @${normTarget.split('@')[0]} *${duration} dakika* banlandı.`, undefined, { mentions: [target] });
    }

    case 'unban': {
      if (!hasRole(userId, 'mod')) return msg.reply('🚫 Bu komutu sadece modlar kullanabilir.');
      const target = msg.mentionedIds && msg.mentionedIds[0];
      if (!target) return msg.reply('⚠️ Kullanım: !unban @kisi');
      const normTarget = resolve(target);
      manualBans.delete(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} banı kaldırıldı.`, undefined, { mentions: [target] });
    }

    case 'adminler': {
      if (!hasRole(userId, 'mod')) return msg.reply('🚫 Bu komutu sadece yetkililer görebilir.');
      const admins = getAllAdmins();
      if (admins.length === 0) return msg.reply('📋 Hiç admin/mod yok.');

      const roleEmoji = { owner: '👑', admin: '🛡️', mod: '🔧' };
      const roleLabel = { owner: 'Owner', admin: 'Admin', mod: 'Mod' };
      let text = '╔══════════════════════╗\n';
      text += '║    👥 YETKİLİLER      ║\n';
      text += '╠══════════════════════╣\n';
      for (const a of admins) {
        const emoji = roleEmoji[a.role] || '❓';
        const label = roleLabel[a.role] || a.role;
        const phone = a.user_id.split('@')[0];
        text += `║ ${emoji} ${label}: ${phone}\n`;
      }
      text += '╚══════════════════════╝';
      return msg.reply(text);
    }

    case 'istatistik':
    case 'stats': {
      if (!hasRole(userId, 'mod')) return msg.reply('🚫 Bu komutu sadece yetkililer görebilir.');
      const users = getAllUsers();
      const totalUsers = users.length;
      const totalEconomy = users.reduce((s, u) => s + u.balance, 0);
      const totalMessages = users.reduce((s, u) => s + (u.msg_count || 0), 0);
      const totalGamesWon = users.reduce((s, u) => s + (u.games_won || 0), 0);
      const totalGamesLost = users.reduce((s, u) => s + (u.games_lost || 0), 0);
      const richest = users[0];
      const poorest = users[users.length - 1];

      let text = '╔══════════════════════╗\n';
      text += '║    📊 İSTATİSTİKLER   ║\n';
      text += '╠══════════════════════╣\n';
      text += `║ 👤 Toplam Kullanıcı: ${totalUsers}\n`;
      text += `║ 💰 Toplam Ekonomi: ${totalEconomy.toLocaleString('tr-TR')}$\n`;
      text += `║ 💬 Toplam Mesaj: ${totalMessages.toLocaleString('tr-TR')}\n`;
      text += `║ 🏆 Kazanılan Oyun: ${totalGamesWon}\n`;
      text += `║ 💀 Kaybedilen Oyun: ${totalGamesLost}\n`;
      if (richest) text += `║ 🤑 En Zengin: ${richest.id.split('@')[0]} (${richest.balance.toLocaleString('tr-TR')}$)\n`;
      if (poorest && poorest.id !== richest?.id) text += `║ 😢 En Fakir: ${poorest.id.split('@')[0]} (${poorest.balance.toLocaleString('tr-TR')}$)\n`;
      text += '╚══════════════════════╝';
      return msg.reply(text);
    }

    case 'spamlog': {
      if (!hasRole(userId, 'mod')) return msg.reply('🚫 Bu komutu sadece yetkililer görebilir.');
      const logs = getSpamLogs(15);
      if (logs.length === 0) return msg.reply('📋 Spam kaydı yok.');

      let text = '╔══════════════════════╗\n';
      text += '║    🚨 SPAM KAYITLARI  ║\n';
      text += '╠══════════════════════╣\n';
      for (const log of logs) {
        const phone = log.user_id.split('@')[0];
        const date = new Date(log.created_at).toLocaleString('tr-TR');
        text += `║ ${phone}: ${log.action} (${date})\n`;
      }
      text += '╚══════════════════════╝';
      return msg.reply(text);
    }

    case 'adminhelp':
    case 'adminyardim': {
      if (!hasRole(userId, 'mod')) return msg.reply('🚫 Yetkisiz erişim.');
      const myRole = getAdmin(userId);
      let text = '╔══════════════════════════╗\n';
      text += '║   🛡️ ADMİN KOMUTLARI     ║\n';
      text += '╠══════════════════════════╣\n';

      // Mod commands
      text += '║\n║ 🔧 *MOD KOMUTLARI*\n';
      text += '║ !adminler — Yetkili listesi\n';
      text += '║ !istatistik — Bot istatistikleri\n';
      text += '║ !spamlog — Spam kayıtları\n';
      text += '║ !ban @kisi <dk> — Banla\n';
      text += '║ !unban @kisi — Ban kaldır\n';

      if (hasRole(userId, 'admin')) {
        text += '║\n║ 🛡️ *ADMİN KOMUTLARI*\n';
        text += '║ !admin_ekle @kisi <miktar>\n';
        text += '║ !admin_sil @kisi <miktar>\n';
        text += '║ !bakiye_ayarla @kisi <miktar>\n';
        text += '║ !kullanici_sil @kisi\n';
        text += '║ !mod_ata @kisi\n';
        text += '║ !mod_cikar @kisi\n';
      }

      if (isOwner(userId)) {
        text += '║\n║ 👑 *OWNER KOMUTLARI*\n';
        text += '║ !admin_ata @kisi\n';
        text += '║ !admin_cikar @kisi\n';
      }

      text += '╚══════════════════════════╝';
      return msg.reply(text);
    }

    default:
      return false;
  }
};

// Export ban check for use in spam.js / command router
module.exports.isManuallyBanned = isManuallyBanned;
module.exports.getManualBanRemaining = getManualBanRemaining;
