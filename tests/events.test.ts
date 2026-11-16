import { describe, expect, it } from 'vitest';
import { eventDate, filterEvents, isPast, matchGroup, selectEvents } from '../src/events';
import { parseEvent } from '../scripts/meetup';
import { detail } from './fixtures/meetup';

const event = parseEvent(detail(), '310940163', 'Europe/London');

describe('event presentation', () => {
  it('distinguishes National events from London evening meetings', () => {
    expect(matchGroup('London (All Day) D365PPUG', false)).toBe('uk');
    expect(matchGroup('Manchester (All Day) D365PPUG', false)).toBe('uk');
    expect(matchGroup('London (Evening) D365PPUG', false)).toBe('london');
    expect(matchGroup('Newcastle user group', false)).toBe('northeast');
    expect(matchGroup('South West user group', false)).toBe('bristol');
    expect(matchGroup('A new group', false)).toBe('');
    expect(matchGroup('Birmingham online', true)).toBe('virtual');
  });
  it('sorts upcoming ascending and caps past events at ten in descending order', () => {
    const events = Array.from({ length: 15 }, (_, index) => ({ ...event, id: String(index), start: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), end: new Date(Date.UTC(2026, 0, index + 1, 2)).toISOString() }));
    expect(selectEvents(events, true, Date.UTC(2026, 1, 1)).map(e => e.id)).toEqual(['14','13','12','11','10','9','8','7','6','5']);
    expect(selectEvents(events, false, Date.UTC(2025, 0, 1))[0].id).toBe('0');
  });
  it('changes the event state at its end, including between deployments', () => {
    expect(isPast(event, Date.parse(event.end) - 1)).toBe(false);
    expect(isPast(event, Date.parse(event.end))).toBe(true);
  });
  it('filters by case-insensitive text, group, and online mode', () => {
    const online = { ...event, id: '2', online: true, group: 'virtual' };
    expect(filterEvents([event, online], ' BRISTOL ', 'bristol', false)).toEqual([event]);
    expect(filterEvents([event, online], '', '', true)).toEqual([online]);
    expect(filterEvents([event], 'no match', '', false)).toEqual([]);
  });
  it('formats both daylight-saving transitions using the source timezone', () => {
    const format = (start: string) => eventDate({ ...event, start }, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    expect(format('2026-03-29T00:30:00Z')).toBe('00:30 GMT');
    expect(format('2026-03-29T01:30:00Z')).toBe('02:30 BST');
    expect(format('2026-10-25T00:30:00Z')).toBe('01:30 BST');
    expect(format('2026-10-25T01:30:00Z')).toBe('01:30 GMT');
  });
});
