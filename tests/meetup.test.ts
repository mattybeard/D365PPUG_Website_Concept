import { describe, expect, it } from 'vitest';
import { collectEvents, discoverEvents, parseEvent } from '../scripts/meetup';
import { detail, listing } from './fixtures/meetup';
import { safeHtml } from '../scripts/safe-html';

describe('Meetup listing discovery', () => {
  it('reads the group connections, not unrelated cache entries', () => {
    expect(discoverEvents(listing())).toEqual({ upcoming: ['310940163', '310817747'], past: ['310795570'], timezone: 'Europe/London' });
  });
  it('accepts a source-confirmed empty upcoming list', () => {
    expect(discoverEvents(listing({ upcoming: [] })).upcoming).toEqual([]);
  });
  it('fails rather than truncating upcoming pagination', () => {
    expect(() => discoverEvents(listing({ hasNextPage: true }))).toThrow('pagination is incomplete');
  });
  it('selects only the latest ten past event references', () => {
    const past = Array.from({ length: 10 }, (_, index) => String(100 + index));
    expect(discoverEvents(listing({ past, totalPast: 131 })).past).toEqual(past);
  });
  it('rejects a partial past listing and duplicates', () => {
    expect(() => discoverEvents(listing({ totalPast: 131 }))).toThrow('past event connection is incomplete');
    expect(() => discoverEvents(listing({ upcoming: ['123', '123'] }))).toThrow('Duplicate');
  });
  it('rejects markup changes, invalid references, and malformed JSON', () => {
    expect(() => discoverEvents('<h1>Access denied</h1>')).toThrow('__NEXT_DATA__ missing');
    expect(() => discoverEvents(listing({ upcoming: ['not-an-id'] }))).toThrow('Invalid event');
    expect(() => discoverEvents('<script id="__NEXT_DATA__">{invalid}</script>')).toThrow();
  });
  it('fetches each unique selected child and returns data only when all children validate', async () => {
    const selected = listing({ upcoming: ['100', '101'], past: ['102'] });
    const ids: string[] = [];
    const events = await collectEvents(selected, async id => { ids.push(id); return detail({ id }); });
    expect(ids).toEqual(['100', '101', '102']);
    expect(events.map(event => event.id)).toEqual(ids);
    await expect(collectEvents(selected, async id => {
      if (id === '101') throw new Error('HTTP 503 from child');
      return detail({ id });
    })).rejects.toThrow('HTTP 503 from child');
    await expect(collectEvents(selected, async id => detail({ id, title: id === '102' ? '' : 'An event' }))).rejects.toThrow('title');
  });
});

describe('Meetup detail parsing', () => {
  it('uses the full description and renders Markdown safely', () => {
    const event = parseEvent(detail(), '310940163', 'Europe/London');
    expect(event.description).toContain('<strong>speaker details</strong>');
    expect(event.description).not.toContain('truncated');
    expect(event.description).toContain('href="https://www.d365ppug.com/"');
    expect(event.group).toBe('bristol');
    expect(event.start).toBe('2026-11-12T18:30:00.000Z');
    expect(event.address).toBe('Lewins Mead, Bristol, BS1 2NH');
  });
  it('handles online and cancelled events without exposing a joining address', () => {
    const event = parseEvent(detail({ mode: 'OnlineEventAttendanceMode', status: 'CANCELLED' }), '310940163', 'Europe/London');
    expect(event).toMatchObject({ online: true, cancelled: true, venue: 'Online', address: '', group: 'virtual' });
  });
  it('allows absent venue and image, not absent required data', () => {
    expect(parseEvent(detail({ venue: false, image: false }), '310940163', 'Europe/London')).toMatchObject({ venue: '', image: '' });
    expect(() => parseEvent(detail({ title: '' }), '310940163', 'Europe/London')).toThrow('title');
    expect(() => parseEvent(detail({ description: '' }), '310940163', 'Europe/London')).toThrow('description');
  });
  it('rejects invalid dates, reversed intervals, mismatched IDs, status and attendance mode', () => {
    expect(() => parseEvent(detail({ start: 'yesterday' }), '310940163', 'Europe/London')).toThrow('timestamp');
    expect(() => parseEvent(detail({ end: '2020-01-01T00:00:00Z' }), '310940163', 'Europe/London')).toThrow('precedes');
    expect(() => parseEvent(detail(), '123', 'Europe/London')).toThrow('Event 123');
    expect(() => parseEvent(detail({ status: 'DRAFT' }), '310940163', 'Europe/London')).toThrow('unsupported status');
    expect(() => parseEvent(detail({ mode: 'Unknown' }), '310940163', 'Europe/London')).toThrow('attendance mode');
  });
  it('removes executable markup and unsafe link schemes', () => {
    const html = safeHtml('<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><a href="//evil.example">bad</a><p style="display:none">visible</p>');
    expect(html).not.toMatch(/script|onerror|javascript|style=|evil\.example/);
    expect(html).toContain('<p>visible</p>');
  });
});
