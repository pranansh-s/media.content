const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/g;

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
