import { setTimeout as sleep } from 'node:timers/promises';

export async function fetchSource(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(25_000),
        headers: { 'User-Agent': 'D365PPUG-Website-Build/1.0 (contact: hello@d365ppug.com)', Accept: 'text/html,application/json' },
      });
    } catch (error) {
      if (attempt === 2) throw new Error(`Request failed for ${url}`, { cause: error });
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (response.ok) return response;
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retryAfter = response.headers.get('retry-after');
      const delay = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now()) : 2000;
      if (!Number.isFinite(delay) || delay > 60_000) throw new Error(`Source requested a long retry delay: ${url}`);
      await response.body?.cancel();
      await sleep(Math.max(1000, delay));
      continue;
    }
    throw new Error(`HTTP ${response.status} from ${url}`);
  }
  throw new Error(`Retries exhausted for ${url}`);
}
