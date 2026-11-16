import { afterEach, expect, it, vi } from 'vitest';
import { fetchSource } from '../scripts/http';

afterEach(() => vi.unstubAllGlobals());

it('returns a successful source response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('html')));
  expect(await (await fetchSource('https://www.meetup.com/d365ppug/events/')).text()).toBe('html');
});

it('rejects access denial without a browser workaround', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(fetchSource('https://www.meetup.com/d365ppug/events/')).rejects.toThrow('HTTP 403');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('stops when the requested rate-limit delay is too long', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Limited', { status: 429, headers: { 'retry-after': '120' } })));
  await expect(fetchSource('https://www.meetup.com/d365ppug/events/')).rejects.toThrow('long retry delay');
});

it('retries a transient server failure', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('Unavailable', { status: 503, headers: { 'retry-after': '1' } })).mockResolvedValueOnce(new Response('OK'));
  vi.stubGlobal('fetch', fetcher);
  expect(await (await fetchSource('https://www.meetup.com/d365ppug/events/')).text()).toBe('OK');
  expect(fetcher).toHaveBeenCalledTimes(2);
});
