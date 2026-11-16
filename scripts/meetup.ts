import { load } from 'cheerio';
import { marked } from 'marked';
import { safeHtml } from './safe-html';
import { matchGroup } from '../src/events';
import type { CommunityEvent } from '../src/types';

type RecordValue = Record<string, unknown>;

export function record(value: unknown, label: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: expected an object`);
  return value as RecordValue;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}: missing required text`);
  return value.trim();
}

export function pageCache(html: string): RecordValue {
  const raw = load(html)('#__NEXT_DATA__').text();
  if (!raw) throw new Error('Meetup __NEXT_DATA__ missing. Source may have changed or blocked access.');
  const data = record(JSON.parse(raw), 'Next data');
  const props = record(record(data.props, 'props').pageProps, 'pageProps');
  return record(props.__APOLLO_STATE__, 'Apollo state');
}

export interface Discovery {
  upcoming: string[];
  past: string[];
  timezone: string;
}

export function discoverEvents(html: string): Discovery {
  const cache = pageCache(html);
  const root = record(cache.ROOT_QUERY, 'ROOT_QUERY');
  const key = Object.keys(root).find(key => key.startsWith('groupByUrlname:') && key.includes('"d365ppug"'));
  if (!key) throw new Error('D365PPUG group reference missing');
  const group = record(cache[text(record(root[key], 'group reference').__ref, 'group ref')], 'group');
  if (group.urlname !== 'd365ppug') throw new Error('Unexpected Meetup group');
  const timezone = text(group.timezone, 'group timezone');
  new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
  function connection(direction: 'before' | 'after'): string[] {
    const keys = Object.keys(group).filter(key => key.startsWith('events(') && key.includes(`"${direction}DateTime"`));
    if (keys.length !== 1) throw new Error(`Expected one ${direction} event connection`);
    const data = record(group[keys[0]], `${direction} connection`);
    const info = record(data.pageInfo, 'pageInfo');
    if (typeof info.hasNextPage !== 'boolean') throw new Error('Pagination state missing');
    if (typeof data.totalCount !== 'number' || !Number.isInteger(data.totalCount) || data.totalCount < 0 || !Array.isArray(data.edges)) throw new Error('Event connection is incomplete');
    if (direction === 'after' && (info.hasNextPage || data.edges.length !== data.totalCount)) {
      throw new Error('Upcoming event pagination is incomplete. Add a permitted public HTML pagination route before deploying.');
    }
    if (direction === 'before' && data.edges.length < Math.min(10, data.totalCount)) throw new Error('Recent past event connection is incomplete');
    const ids = data.edges.map(edge => {
      const ref = text(record(record(edge, 'edge').node, 'node').__ref, 'event reference');
      const id = /^Event:(\d+)$/.exec(ref)?.[1];
      if (!id) throw new Error(`Invalid event reference: ${ref}`);
      return id;
    });
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate events in source connection');
    return direction === 'before' ? ids.slice(0, 10) : ids;
  }
  return { upcoming: connection('after'), past: connection('before'), timezone };
}

function timestamp(value: unknown, label: string): string {
  const input = text(value, label);
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(input) || !Number.isFinite(Date.parse(input))) throw new Error(`${label}: invalid timestamp`);
  return new Date(input).toISOString();
}

export function parseEvent(html: string, id: string, timezone: string): CommunityEvent {
  if (!/^\d+$/.test(id)) throw new Error('Invalid event ID');
  const $ = load(html);
  const items = $('script[type="application/ld+json"]').toArray().flatMap(element => {
    const parsed: unknown = JSON.parse($(element).text());
    const objects = Array.isArray(parsed) ? parsed : [parsed];
    return objects.flatMap(item => {
      const object = record(item, 'structured data');
      return Array.isArray(object['@graph']) ? object['@graph'].map(item => record(item, 'graph entry')) : [object];
    });
  });
  const event = items.find(item => item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event')));
  if (!event) throw new Error(`Event ${id}: Event structured data missing`);
  const cache = pageCache(html);
  const detail = record(cache[`Event:${id}`], `Event ${id}`);
  const url = new URL(text(event.url, 'event URL'));
  if (url.origin !== 'https://www.meetup.com' || url.pathname !== `/d365ppug/events/${id}/`) throw new Error(`Event ${id}: unexpected source URL`);
  const start = timestamp(event.startDate, 'start');
  const end = timestamp(event.endDate, 'end');
  if (Date.parse(end) < Date.parse(start)) throw new Error(`Event ${id}: end precedes start`);
  if (!['ACTIVE', 'PAST', 'CANCELLED'].includes(text(detail.status, 'status'))) throw new Error(`Event ${id}: unsupported status`);
  const mode = text(event.eventAttendanceMode, 'attendance mode');
  if (!/\/(OnlineEventAttendanceMode|OfflineEventAttendanceMode|MixedEventAttendanceMode)$/.test(mode)) throw new Error('Unknown attendance mode');
  const online = mode.endsWith('/OnlineEventAttendanceMode');
  const location = Array.isArray(event.location) ? event.location.find(item => record(item, 'location')['@type'] === 'Place') : event.location;
  const venue = location ? record(location, 'location') : {};
  const address = venue.address && typeof venue.address === 'object' ? record(venue.address, 'address') : {};
  const title = text(event.name, 'title');
  const images = Array.isArray(event.image) ? event.image : event.image ? [event.image] : [];
  const image = images.length ? text(images[images.length - 1], 'image') : '';
  if (image && new URL(image).protocol !== 'https:') throw new Error('Unsafe event image URL');
  new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
  return {
    id, title, url: url.href, start, end, timezone, online,
    cancelled: detail.status === 'CANCELLED' || String(event.eventStatus).endsWith('/EventCancelled'),
    venue: online ? 'Online' : typeof venue.name === 'string' ? venue.name : '',
    address: online ? '' : [address.streetAddress, address.addressLocality, address.postalCode].filter(value => typeof value === 'string' && value).join(', '),
    description: safeHtml(marked.parse(text(detail.description, 'description'), { async: false, breaks: true })),
    image,
    group: matchGroup(title, online),
  };
}

export async function collectEvents(listing: string, loadDetail: (id: string) => Promise<string>): Promise<CommunityEvent[]> {
  const discovery = discoverEvents(listing);
  const ids = [...new Set([...discovery.upcoming, ...discovery.past])];
  const events: CommunityEvent[] = [];
  for (const id of ids) events.push(parseEvent(await loadDetail(id), id, discovery.timezone));
  return events;
}
