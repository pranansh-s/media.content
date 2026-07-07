import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b! >= 16 && b! <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a! >= 224) return true;
    return false;
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:')) return isPrivateIp(lower.slice('::ffff:'.length));
    return false;
  }
  return false;
}

async function isSafeUrl(raw: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost') return false;
  if (isIP(host)) return !isPrivateIp(host);
  try {
    const { address } = await lookup(host);
    return !isPrivateIp(address);
  } catch {
    return false;
  }
}

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  return [...new Set(matches.map(url => url.replace(/[.,;:]+$/, '')))];
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface FetchOptions {
  timeoutMs?: number;
  maxLength?: number;
}

export async function fetchUrlText(url: string, options: FetchOptions = {}): Promise<string | null> {
  const { timeoutMs = 8000, maxLength = 20000 } = options;
  if (!(await isSafeUrl(url))) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'text/html,text/plain', 'user-agent': 'media-content-bot/0.1' },
    });
    if (!response.ok) return null;
    const raw = await response.text();
    const text = htmlToText(raw.slice(0, maxLength * 10));
    return text ? text.slice(0, maxLength) : null;
  } catch {
    return null;
  }
}
