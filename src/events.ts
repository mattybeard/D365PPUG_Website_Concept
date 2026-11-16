import type { CommunityEvent } from './types';

export const groups = [
  { slug: 'uk', name: 'National', subtitle: 'All-day events', place: 'London' },
  { slug: 'birmingham', name: 'Birmingham', subtitle: 'West Midlands', place: 'Birmingham' },
  { slug: 'bristol', name: 'Bristol', subtitle: 'South West', place: 'Bristol' },
  { slug: 'london', name: 'London', subtitle: 'Evening events', place: 'London' },
  { slug: 'manchester', name: 'Manchester', subtitle: 'North West', place: 'Manchester' },
  { slug: 'northeast', name: 'North East', subtitle: 'Newcastle', place: 'Newcastle' },
  { slug: 'reading', name: 'Reading', subtitle: 'Thames Valley', place: 'Reading' },
  { slug: 'virtual', name: 'Virtual', subtitle: 'Join from anywhere', place: 'Online' },
];

export function matchGroup(title: string, online: boolean): string {
  if (online) return 'virtual';
  if (/\bnational\b|\ball[\s-]?day\b/i.test(title)) return 'uk';
  if (/\bnewcastle\b|\bnorth east\b/i.test(title)) return 'northeast';
  if (/\bsouth west\b/i.test(title)) return 'bristol';
  return groups.find(group => group.slug !== 'virtual' && group.slug !== 'uk' &&
    title.toLowerCase().includes(group.name.toLowerCase()))?.slug ?? '';
}

export function isPast(event: CommunityEvent, now: number): boolean {
  return Date.parse(event.end) <= now;
}

export function selectEvents(events: CommunityEvent[], past: boolean, now: number): CommunityEvent[] {
  const selected = events.filter(event => isPast(event, now) === past)
    .sort((a, b) => past ? Date.parse(b.start) - Date.parse(a.start) : Date.parse(a.start) - Date.parse(b.start));
  return past ? selected.slice(0, 10) : selected;
}

export function filterEvents(events: CommunityEvent[], query: string, group: string, onlineOnly: boolean) {
  const needle = query.trim().toLowerCase();
  return events.filter(event => (!needle || `${event.title} ${event.venue} ${event.address}`.toLowerCase().includes(needle)) &&
    (!group || event.group === group) && (!onlineOnly || event.online));
}

export function eventDate(event: CommunityEvent, options: Intl.DateTimeFormatOptions): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    ...options, timeZone: event.timezone,
    ...(options.timeZoneName ? { timeZoneName: 'shortOffset' } : {}),
  });
  return formatter.formatToParts(new Date(event.start)).map(part => {
    if (part.type !== 'timeZoneName') return part.value;
    const offset = part.value.replace(/^GMT\+0$/, 'GMT');
    if (event.timezone === 'Europe/London' && offset === 'GMT+1') return 'BST';
    return offset;
  }).join('');
}
