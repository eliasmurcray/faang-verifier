const crypto = require('node:crypto');

function formatTimestamp(timestamp) {
  const pad = v => `0${v}`.slice(-2);
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth())}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function generateVerificationCode() {
  return Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 2**32 * 1000000).toString().padStart(6, '0');
}

module.exports = {
  formatTimestamp,
  generateVerificationCode,
};
