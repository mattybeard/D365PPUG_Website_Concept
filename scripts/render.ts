import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadContent, pageData, documentHtml, contentSecurityPolicy } from './page-data';

const serverPath = pathToFileURL(path.resolve('.server/entry-server.js')).href;
const { render } = await import(serverPath) as { render: (data: ReturnType<typeof pageData>) => string };
const { content, events } = await loadContent();
const template = await readFile('dist/index.html', 'utf8');
const routes = [...content.pages.map(page => page.path), ...events.events.map(event => `/events/${event.id}/`), '/404/'];
for (const route of routes) {
  const data = pageData(route, content, events);
  const html = documentHtml(template, data, render(data));
  const directory = path.join('dist', route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), html);
}
await writeFile('dist/404.html', await readFile('dist/404/index.html', 'utf8'));
const config = {
  routes: [
    ...Object.entries(content.redirects).map(([route, target]) => ({ route, redirect: target, statusCode: 301 })),
    { route: '/etn/*', redirect: '/events/', statusCode: 301 },
    { route: '/assets/*', headers: { 'cache-control': 'public, max-age=86400' } },
    { route: '/event-images/*', headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  ],
  responseOverrides: { '404': { rewrite: '/404.html' } },
  globalHeaders: {
    'cache-control': 'public, max-age=0, must-revalidate',
    'content-security-policy': contentSecurityPolicy(),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  },
  mimeTypes: { '.webp': 'image/webp', '.woff2': 'font/woff2' },
};
await writeFile('dist/staticwebapp.config.json', JSON.stringify(config, null, 2));
await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://www.d365ppug.com/sitemap.xml\n');
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.filter(route => route !== '/404/').map(route => `<url><loc>https://www.d365ppug.com${route}</loc></url>`).join('')}</urlset>\n`);
console.log(`Rendered ${routes.length} static routes with metadata and Azure configuration.`);
