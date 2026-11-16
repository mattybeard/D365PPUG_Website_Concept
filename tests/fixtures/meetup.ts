export function listing(options: { upcoming?: string[]; past?: string[]; hasNextPage?: boolean; totalPast?: number } = {}) {
  const upcoming = options.upcoming ?? ['310940163', '310817747'];
  const past = options.past ?? ['310795570'];
  const connection = (ids: string[], hasNextPage: boolean, totalCount: number) => ({
    totalCount, pageInfo: { hasNextPage, endCursor: 'public-cursor' },
    edges: ids.map(id => ({ node: { __ref: `Event:${id}` } })),
  });
  const data = {
    props: { pageProps: { __APOLLO_STATE__: {
      ROOT_QUERY: { 'groupByUrlname:{"urlname":"d365ppug"}': { __ref: 'Group:36399065' } },
      'Group:36399065': {
        urlname: 'd365ppug', timezone: 'Europe/London',
        'events({"filter":{"afterDateTime":"2026-10-27T08:00:00Z"},"first":30,"sort":"ASC"})': connection(upcoming, options.hasNextPage ?? false, upcoming.length),
        'events({"filter":{"beforeDateTime":"2026-10-27T08:00:00Z"},"first":10,"sort":"DESC"})': connection(past, (options.totalPast ?? past.length) > past.length, options.totalPast ?? past.length),
      },
    } } },
  };
  return `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>`;
}

export function detail(options: {
  id?: string; title?: string; start?: string; end?: string; status?: string;
  mode?: string; description?: string; venue?: boolean; image?: boolean;
} = {}) {
  const id = options.id ?? '310940163';
  const data = {
    '@context': 'https://schema.org', '@type': 'Event',
    name: options.title ?? 'Bristol D365PPUG - November 2026',
    url: `https://www.meetup.com/d365ppug/events/${id}/`,
    description: 'A truncated description',
    startDate: options.start ?? '2026-11-12T18:30:00Z',
    endDate: options.end ?? '2026-11-12T20:30:00Z',
    eventAttendanceMode: `https://schema.org/${options.mode ?? 'OfflineEventAttendanceMode'}`,
    eventStatus: `https://schema.org/${options.status === 'CANCELLED' ? 'EventCancelled' : 'EventScheduled'}`,
    ...(options.venue === false ? {} : { location: { '@type': 'Place', name: 'Changing Social', address: { streetAddress: 'Lewins Mead', addressLocality: 'Bristol', postalCode: 'BS1 2NH' } } }),
    ...(options.image === false ? {} : { image: ['https://secure-content.meetupstatic.com/images/classic-events/505373330/676x380.jpg'] }),
  };
  const cache = { props: { pageProps: { __APOLLO_STATE__: {
    [`Event:${id}`]: { id, status: options.status ?? 'ACTIVE', description: options.description ?? 'A full description with **speaker details**.\n\n[Read more](https://www.d365ppug.com/)' },
  } } } };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(cache)}</script>`;
}
