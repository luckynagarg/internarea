const crypto = require('crypto');

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max, decimals = 2) {
  const v = Math.random() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uid(len = 16) {
  // Firebase-like UID is 20-ish chars; we generate alnum.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function fakeDateWithinLastMonths(months = 12) {
  const now = Date.now();
  const delta = randInt(0, months * 30) * 24 * 60 * 60 * 1000;
  return new Date(now - delta);
}

function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function uniqueId(prefix = '') {
  return `${prefix}${crypto.randomBytes(10).toString('hex')}`;
}

module.exports = {
  pick,
  randInt,
  randFloat,
  shuffleCopy,
  uid,
  fakeDateWithinLastMonths,
  toYMD,
  uniqueId,
};

