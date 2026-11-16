import { mkdir, writeFile, rename, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { discoverEvents, collectEvents } from './meetup';
import { fetchSource } from './http';
import type { EventData } from '../src/types';

await mkdir('src/generated', { recursive: true });
await mkdir('.cache', { recursive: true });
await mkdir('public/event-images', { recursive: true });
const listing = await (await fetchSource('https://www.meetup.com/d365ppug/events/')).text();
const discovery = discoverEvents(listing);
await writeFile('.cache/meetup-listing.html', listing);
const events = await collectEvents(listing, async id => {
  const html = await (await fetchSource(`https://www.meetup.com/d365ppug/events/${id}/`)).text();
  await writeFile(`.cache/meetup-${id}.html`, html);
  return html;
});
const usedImages = new Set<string>();
for (const event of events) {
  if (event.image) {
    const url = new URL(event.image);
    if (!url.hostname.endsWith('.meetupstatic.com') && url.hostname !== 'meetupstatic.com') throw new Error(`Unexpected event image host: ${url.hostname}`);
    const image = Buffer.from(await (await fetchSource(event.image)).arrayBuffer());
    const bytes = await sharp(image).rotate().resize(800, 450, { fit: 'contain', background: '#ffffff' }).webp({ quality: 75 }).toBuffer();
    const name = createHash('sha256').update(bytes).digest('hex').slice(0, 14);
    await writeFile(`public/event-images/${name}.webp`, bytes);
    usedImages.add(`${name}.webp`);
    event.image = `/event-images/${name}.webp`;
  }
  console.log(`Scraped ${event.id}: ${event.title}`);
}
const data: EventData = { fetchedAt: new Date().toISOString(), events };
await writeFile('src/generated/events.json.tmp', JSON.stringify(data, null, 2) + '\n');
await rename('src/generated/events.json.tmp', 'src/generated/events.json');
for (const filename of await readdir('public/event-images')) {
  if (/^[a-f0-9]{14}\.webp$/.test(filename) && !usedImages.has(filename)) await unlink(`public/event-images/${filename}`);
}
console.log(`Validated ${discovery.upcoming.length} upcoming and ${discovery.past.length} past events. Published ${events.length} records.`);
