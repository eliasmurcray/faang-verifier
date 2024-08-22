"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVerificationCode = exports.formatTimestamp = void 0;
const node_crypto_1 = require("node:crypto");
/*const crypto = require('node:crypto');*/
function formatTimestamp(timestamp) {
    const pad = (v) => `0${v}`.slice(-2);
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${pad(date.getMonth().toString())}-${pad(date.getDate().toString())} ${pad(date.getHours().toString())}:${pad(date.getMinutes().toString())}:${pad(date.getSeconds().toString())}`;
}
exports.formatTimestamp = formatTimestamp;
function generateVerificationCode() {
    const u32 = (0, node_crypto_1.getRandomValues)(new Uint32Array(1))[0];
    if (!u32)
        return null;
    return Math.floor(u32 / 2 ** 32 * 1000000).toString().padStart(6, '0');
}
exports.generateVerificationCode = generateVerificationCode;
