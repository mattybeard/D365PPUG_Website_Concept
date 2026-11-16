import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { load } from 'cheerio';
import { loadContent } from './page-data';

const { content, events } = await loadContent();
const routes = [...content.pages.map(page => page.path), ...events.events.map(event => `/events/${event.id}/`)];
const seen = new Set<string>();
for (const route of routes) {
  const file = path.join('dist', route, 'index.html');
  const html = await readFile(file, 'utf8');
  const $ = load(html);
  if (!$('h1').length || !$('title').text() || !$('link[rel=canonical]').length) throw new Error(`Metadata or heading missing: ${route}`);
  if (html.includes('<!--app-->') || html.includes('<!--head-->')) throw new Error(`Unrendered route ${route}`);
  for (const element of $('a[href],img[src],script[src],link[href]').toArray()) {
    const value = $(element).attr('href') ?? $(element).attr('src') ?? '';
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    const resource = value.split(/[?#]/)[0];
    if (seen.has(resource)) continue;
    seen.add(resource);
    const resolved = path.join('dist', resource.endsWith('/') ? `${resource}index.html` : resource);
    if (!(await stat(resolved).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
      throw new Error(`Broken local link ${value} on ${route}`);
    })).isFile()) throw new Error(`Not a file: ${resolved}`);
  }
}
const files = await readdir('dist/events', { withFileTypes: true });
const eventRoutes = files.filter(file => file.isDirectory()).map(file => file.name).sort();
if (JSON.stringify(eventRoutes) !== JSON.stringify(events.events.map(event => event.id).sort())) throw new Error('Published event routes do not match selected events');
const $ = load(await readFile('dist/index.html', 'utf8'));
const scripts = $('script[src]').map((_, element) => $(element).attr('src')!).get();
const preloads = $('link[rel=modulepreload]').map((_, element) => $(element).attr('href')!).get();
const css = $('link[rel=stylesheet]').map((_, element) => $(element).attr('href')!).get();
async function compressedBytes(urls: string[]) {
  let bytes = 0;
  for (const url of new Set(urls)) bytes += gzipSync(await readFile(path.join('dist', url))).length;
  return bytes;
}
const jsBytes = await compressedBytes([...scripts, ...preloads]);
const cssBytes = await compressedBytes(css);
if (jsBytes > 100 * 1024 || cssBytes > 25 * 1024) throw new Error(`Homepage budget failed: JS ${jsBytes} bytes, CSS ${cssBytes} bytes`);
console.log(`Checked ${routes.length} page routes and ${seen.size} local links/assets. Homepage JavaScript ${(jsBytes / 1024).toFixed(1)} KiB gzip; CSS ${(cssBytes / 1024).toFixed(1)} KiB gzip.`);
