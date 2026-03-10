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

const parseTargetId = (args, msg, resolve) => {
  // 1. Check mentions first
  if (msg.mentionedIds && msg.mentionedIds.length > 0) {
    return resolve(msg.mentionedIds[0]);
  }
  
  // 2. Check for raw phone numbers in args (e.g., 905551234567)
  for (const arg of args) {
    const cleanArg = arg.replace(/\D/g, ''); // Remove non-digits
    // Assume it's a phone number if it's long enough (e.g., 10+ digits)
    if (cleanArg.length >= 10 && cleanArg.length <= 15) {
      return resolve(`${cleanArg}@c.us`);
    }
  }
  
  return null;
};

module.exports = async (command, args, msg, userId, user, resolve, client) => {
  switch (command) {

    // ═══════════════════════════════════════
    //  OWNER KOMUTLARI
    // ═══════════════════════════════════════

    case 'admin_ata': {
      if (!isOwner(userId)) return msg.reply('🚫 Bu komutu sadece bot sahibi kullanabilir.');
      const normTarget = parseTargetId(args, msg, resolve);
      if (!normTarget) return msg.reply('⚠️ Kullanım: !admin_ata @kisi veya !admin_ata 905510395152');
      addAdmin(normTarget, 'admin', userId);
      return msg.reply(`✅ @${normTarget.split('@')[0]} artık *Admin* 🛡️`);
    }

    case 'admin_cikar': {
      if (!isOwner(userId)) return msg.reply('🚫 Bu komutu sadece bot sahibi kullanabilir.');
      const normTarget = parseTargetId(args, msg, resolve);
      if (!normTarget) return msg.reply('⚠️ Kullanım: !admin_cikar @kisi veya !admin_cikar 90...');
      const adminInfo = getAdmin(normTarget);
      if (!adminInfo) return msg.reply('⚠️ Bu kişi zaten admin/mod değil.');
      if (adminInfo.role === 'owner') return msg.reply('⚠️ Owner kaldırılamaz.');
      removeAdmin(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} admin yetkisi kaldırıldı.`);
    }

    // ═══════════════════════════════════════
    //  ADMIN + OWNER KOMUTLARI
    // ═══════════════════════════════════════

    case 'mod_ata': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const normTarget = parseTargetId(args, msg, resolve);
      if (!normTarget) return msg.reply('⚠️ Kullanım: !mod_ata @kisi veya !mod_ata 90...');
      addAdmin(normTarget, 'mod', userId);
      return msg.reply(`✅ @${normTarget.split('@')[0]} artık *Moderatör* 🔧`);
    }

    case 'mod_cikar': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const normTarget = parseTargetId(args, msg, resolve);
      if (!normTarget) return msg.reply('⚠️ Kullanım: !mod_cikar @kisi veya !mod_cikar 90...');
      const modInfo = getAdmin(normTarget);
      if (!modInfo || modInfo.role !== 'mod') return msg.reply('⚠️ Bu kişi mod değil.');
      removeAdmin(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} mod yetkisi kaldırıldı.`);
    }

    case 'admin_ekle':
    case 'addmoney': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const normAddTarget = parseTargetId(args, msg, resolve);
      if (!normAddTarget) return msg.reply('⚠️ Kullanım: !admin_ekle @kisi <miktar> veya !admin_ekle 90... <miktar>');

      let addAmount = NaN;
      for (const arg of args) {
        // Find a pure number parameter that isn't the phone number
        if (/^\d+$/.test(arg) && arg.length < 10) { 
            addAmount = parseInt(arg); 
            break; 
        }
      }
      if (isNaN(addAmount)) return msg.reply('⚠️ Miktar gir (Örn: 1000).');

      let targetUserAdd = getUser(normAddTarget);
      if (!targetUserAdd) targetUserAdd = addUser(normAddTarget);

      updateBalance(normAddTarget, addAmount);
      return msg.reply(`✅ @${normAddTarget.split('@')[0]} hesabına *${addAmount}$* eklendi.`);
    }

    case 'admin_sil':
    case 'removemoney': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const normRemTarget = parseTargetId(args, msg, resolve);
      if (!normRemTarget) return msg.reply('⚠️ Kullanım: !admin_sil @kisi <miktar>');

      let remAmount = NaN;
      for (const arg of args) {
        if (/^\d+$/.test(arg) && arg.length < 10) { remAmount = parseInt(arg); break; }
      }
      if (isNaN(remAmount)) return msg.reply('⚠️ Miktar gir.');

      let targetUserRem = getUser(normRemTarget);
      if (!targetUserRem) targetUserRem = addUser(normRemTarget);

      updateBalance(normRemTarget, -remAmount);
      return msg.reply(`✅ @${normRemTarget.split('@')[0]} hesabından *${remAmount}$* silindi.`);
    }

    case 'bakiye_ayarla': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const normTarget = parseTargetId(args, msg, resolve);
      if (!normTarget) return msg.reply('⚠️ Kullanım: !bakiye_ayarla @kisi <miktar> veya !bakiye_ayarla 90555... <miktar>');

      let amount = NaN;
      for (const arg of args) {
        if (/^\d+$/.test(arg) && arg.length < 10) { amount = parseInt(arg); break; }
      }
      if (isNaN(amount)) return msg.reply('⚠️ Miktar gir.');

      let tUser = getUser(normTarget);
      if (!tUser) tUser = addUser(normTarget);
      setBalance(normTarget, amount);
      return msg.reply(`✅ @${normTarget.split('@')[0]} bakiyesi *${amount}$* olarak ayarlandı.`);
    }

    case 'kullanici_sil': {
      if (!hasRole(userId, 'admin')) return msg.reply('🚫 Bu komutu sadece adminler kullanabilir.');
      const normTarget = parseTargetId(args, msg, resolve);
      if (!normTarget) return msg.reply('⚠️ Kullanım: !kullanici_sil @kisi veya 90555...');
      deleteUser(normTarget);
      return msg.reply(`✅ @${normTarget.split('@')[0]} veritabanından silindi.`);
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
      let text = '╔═════════════════════╗\n';
      text += '║ 🛡️ ADMİN KOMUTLARI ║\n';
      text += '╠═════════════════════╣\n';

      text += '║\n║ 👥 *GENEL*\n';
      text += '║ !rlchk (Kendi rolün)\n';

      // Mod commands
      text += '║\n║ 🔧 *MOD KOMUTLARI*\n';
      text += '║ !adminler\n';
      text += '║ !istatistik\n';
      text += '║ !spamlog\n';
      text += '║ !ban @kisi <dk>\n';
      text += '║ !unban @kisi\n';

      if (hasRole(userId, 'admin')) {
        text += '║\n║ 🛡️ *ADMİN KOMUTLARI*\n';
        text += '║ !admin_ekle\n';
        text += '║ !admin_sil\n';
        text += '║ !bakiye_ayarla\n';
        text += '║ !kullanici_sil\n';
        text += '║ !mod_ata / !mod_cikar\n';
      }

      if (isOwner(userId)) {
        text += '║\n║ 👑 *OWNER KOMUTLARI*\n';
        text += '║ !admin_ata\n';
        text += '║ !admin_cikar\n';
      }

      text += '╚═════════════════════╝';
      return msg.reply(text);
    }

    case 'rlchk':
    case 'rolum': {
      let roleName = 'Kullanıcı 👤';
      if (isOwner(userId)) roleName = 'Owner 👑';
      else if (hasRole(userId, 'admin')) roleName = 'Admin 🛡️';
      else if (hasRole(userId, 'mod')) roleName = 'Moderatör 🔧';

      return msg.reply(`🏷️ Senin mevcut rolün: *${roleName}*`);
    }

    default:
      return false;
  }
};

// Export ban check for use in spam.js / command router
module.exports.isManuallyBanned = isManuallyBanned;
module.exports.getManualBanRemaining = getManualBanRemaining;

