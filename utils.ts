import { getRandomValues } from 'node:crypto';
/*const crypto = require('node:crypto');*/

export function formatTimestamp(timestamp: number): string {
  const pad = (v: string): string => `0${v}`.slice(-2);
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth().toString())}-${pad(date.getDate().toString())} ${pad(date.getHours().toString())}:${pad(date.getMinutes().toString())}:${pad(date.getSeconds().toString())}`;
}

export function generateVerificationCode(): string | null {
  const u32 = getRandomValues(new Uint32Array(1))[0];
  if (!u32) return null;
  return Math.floor(u32 / 2**32 * 1000000).toString().padStart(6, '0');
}
