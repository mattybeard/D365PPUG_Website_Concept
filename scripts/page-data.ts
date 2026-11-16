import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import type { CommunityEvent, EventData, PageData, SiteContent } from '../src/types';
import { groups } from '../src/events';

export async function loadContent(): Promise<{ content: SiteContent; events: EventData }> {
  const content: SiteContent = JSON.parse(await readFile('content/site.json', 'utf8'));
  const events: EventData = JSON.parse(await readFile('src/generated/events.json', 'utf8'));
  const privacy = content.pages.find(page => page.path === '/privacy-policy/');
  if (!privacy) throw new Error('Privacy policy missing');
  privacy.sections = [{ html: await readFile('content/privacy.html', 'utf8') }];
  privacy.description = 'How the UK Dynamics 365 and Power Platform User Group website handles information.';
  return { content, events };
}

export function pageData(path: string, content: SiteContent, data: EventData): PageData {
  let page = content.pages.find(page => page.path === path);
  const event = data.events.find(event => `/events/${event.id}/` === path);
  const group = groups.find(group => `/${group.slug}/` === path);
  if (group && page) {
    const first = load(page.sections[0]?.html ?? '');
    if (first('h2,h3').length === 1 && !first('p,img,a,figure').length) page = { ...page, sections: page.sections.slice(1) };
  }
  const sponsorsPage = content.pages.find(page => page.path === '/sponsors/');
  const $ = load(sponsorsPage?.sections.map(section => section.html).join('') ?? '');
  const sponsors = $('a:has(img)').toArray().map(element => {
    const url = $(element).attr('href');
    const image = $(element).find('img').attr('src');
    if (!url || !image) throw new Error('Sponsor link or image missing');
    return { image, name: $(element).find('img').attr('alt') || `Visit ${new URL(url).hostname}`, url };
  });
  return {
    path,
    page: path === '/' || path === '/events/' || path === '/contact/' ? page ? { ...page, sections: [] } : undefined : page,
    event,
    events: path === '/events/' ? data.events : path === '/' ? data.events.filter(event => Date.parse(event.end) > Date.parse(data.fetchedAt)) : group ? data.events.filter(event => event.group === group.slug) : [],
    fetchedAt: data.fetchedAt,
    assets: Object.fromEntries(['logo', 'headerLogo', 'heroBackdrop', 'mark', 'community', 'meeting'].map(key => [key, content.assets[key]])),
    sponsors: path === '/' ? sponsors : [],
  };
}

function escaped(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function jsonScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function structuredEvent(event: CommunityEvent) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: load(event.description).text(),
    url: `https://www.d365ppug.com/events/${event.id}/`,
    startDate: event.start,
    endDate: event.end,
    eventStatus: `https://schema.org/${event.cancelled ? 'EventCancelled' : 'EventScheduled'}`,
    eventAttendanceMode: `https://schema.org/${event.online ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode'}`,
    image: `https://www.d365ppug.com${event.image || '/event-fallback.svg'}`,
    location: event.online ? { '@type': 'VirtualLocation', url: event.url } : {
      '@type': 'Place', name: event.venue || 'Venue to be confirmed', address: event.address || undefined,
    },
    isAccessibleForFree: true,
    organizer: { '@type': 'Organization', name: 'UK Dynamics 365 & Power Platform User Group', url: 'https://www.d365ppug.com/' },
  };
}

export function head(data: PageData): string {
  const title = data.event?.title ?? (data.path === '/' ? 'Learn, share, and connect' : data.page?.title ?? 'Page not found');
  const description = data.event ? load(data.event.description).text().slice(0, 155) : data.path === '/' ? 'Free Dynamics 365 and Power Platform user group events across the UK and online. Find your local community, learn, and share what you know.' : data.page?.description ?? 'Browse our community events and user groups.';
  const image = `https://www.d365ppug.com${data.event?.image || data.assets.mark}`;
  const canonical = `https://www.d365ppug.com${data.path}`;
  return `<title>${escaped(title)} | D365PPUG UK</title>
<meta name="description" content="${escaped(description)}" />
<link rel="canonical" href="${escaped(canonical)}" />
<link rel="icon" type="image/webp" href="${data.assets.mark}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="D365PPUG UK" />
<meta property="og:title" content="${escaped(title)}" />
<meta property="og:description" content="${escaped(description)}" />
<meta property="og:url" content="${escaped(canonical)}" />
<meta property="og:image" content="${escaped(image)}" />
<meta name="twitter:card" content="summary_large_image" />
${data.path === '/404/' ? '<meta name="robots" content="noindex" />' : ''}
${data.event ? `<script type="application/ld+json">${jsonScript(structuredEvent(data.event))}</script>` : ''}`;
}

export function documentHtml(template: string, data: PageData, app: string): string {
  return template.replace('<!--head-->', head(data)).replace('<!--app-->', () => app)
    .replace('</body>', () => `<script id="page-data" type="application/json">${jsonScript(data)}</script></body>`);
}

export function contentSecurityPolicy(): string {
  // JSON data blocks are non-executable. Keep executable scripts external.
  return "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'";
}
