import { load } from 'cheerio';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { safeHtml } from './safe-html';
import { fetchSource } from './http';
import type { ContentSection, SiteContent, SitePage } from '../src/types';

interface WordPressPage {
  id: number;
  slug: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
}

const root = 'https://www.d365ppug.com';
const assets: Record<string, string> = {};
await mkdir('public/assets', { recursive: true });
await mkdir('content', { recursive: true });

async function localImage(source: string): Promise<string> {
  const url = new URL(source, root);
  if (assets[url.href]) return assets[url.href];
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error(`Invalid image ${source}`);
  const bytes = Buffer.from(await (await fetchSource(url.href)).arrayBuffer());
  const name = createHash('sha256').update(url.href).digest('hex').slice(0, 14);
  const image = await sharp(bytes).rotate().resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  await writeFile(`public/assets/${name}.webp`, image);
  assets[url.href] = `/assets/${name}.webp`;
  return assets[url.href];
}

const legacyAliases: Record<string, string> = {
  '/london-user-group/': '/london/',
  '/south-west/': '/bristol/',
  '/manchester/contact': '/contact/',
  '/etn_category/': '/events/',
  '/etn-speaker-category/': '/events/',
  '/etn-tags/': '/events/',
};
const pages = await (await fetchSource(`${root}/wp-json/wp/v2/pages?per_page=50`)).json() as WordPressPage[];
const migrated: SitePage[] = [];
for (const page of pages) {
  if (['etn_category', 'etn-speaker-category', 'etn-tags'].includes(page.slug)) continue;
  const $ = load(page.content.rendered.trim() ? page.content.rendered : await (await fetchSource(page.link)).text());
  const path = new URL(page.link).pathname;
  const sections: ContentSection[] = [];
  for (const section of $('[data-elementor-type="wp-page"] > section, [data-elementor-type="wp-page"] > .e-con, [data-elementor-type="single-page"] > section').toArray()) {
    let markup = '';
    const widgets = $(section).find('[data-widget_type]').toArray();
    for (let index = 0; index < widgets.length; index++) {
      const widget = widgets[index];
      const type = $(widget).attr('data-widget_type') ?? '';
      if (/^(etn-|form|counter|menu-anchor|icon\.|image-carousel)/.test(type)) continue;
      const body = $(widget).find('.elementor-widget-container').first();
      if (/heading/.test(type) && /^(Upcoming Events|Meet The Team)$/i.test(body.text().trim())) {
        if (/Upcoming/.test(body.text())) continue;
      }
      if (/call-to-action/.test(type)) {
        const background = body.find('[role="img"]').first();
        const image = /url\(([^)]+)\)/i.exec(background.attr('style') ?? '')?.[1];
        const name = body.find('.elementor-cta__title').html() ?? '';
        const description = body.find('.elementor-cta__description').html() ?? '';
        const next = widgets[index + 1];
        const social = next && $(next).attr('data-widget_type') === 'social-icons.default' ? $(next).find('.elementor-widget-container').html() ?? '' : '';
        if (social) index++;
        markup += `<figure>${image ? `<img src="${image}" alt="${background.attr('aria-label') ?? ''}" />` : ''}<figcaption><h3>${name}</h3><p>${description}</p><p>${social}</p></figcaption></figure>`;
        continue;
      }
      markup += body.html() ?? $(widget).html() ?? '';
    }
    const clean = load(safeHtml(markup));
    for (const image of clean('img').toArray()) {
      const src = clean(image).attr('src');
      if (!src) throw new Error(`Image has no source on ${path}`);
      const local = await localImage(src);
      const metadata = await sharp(`public${local}`).metadata();
      clean(image).attr({ src: local, width: String(metadata.width), height: String(metadata.height) });
      if (!clean(image).attr('alt')) clean(image).attr('alt', '');
    }
    for (const link of clean('a[href]').toArray()) {
      const href = clean(link).attr('href')!;
      const url = new URL(href, root);
      if (url.hostname === 'www.d365ppug.com' || url.hostname === 'd365ppug.com') {
        const target = url.pathname.startsWith('/etn/') ? '/events/' : legacyAliases[url.pathname] ?? url.pathname;
        clean(link).attr('href', target + url.hash);
      }
    }
    clean('h2,h3').first().each((_, heading) => {
      if (clean(heading).text().trim().toLowerCase() === load(page.title.rendered).text().trim().toLowerCase()) clean(heading).remove();
    });
    const html = clean('body').html()?.trim() ?? '';
    if (clean('body').text().trim() || clean('img').length) sections.push({
      html,
      ...(widgets.some(widget => $(widget).attr('data-widget_type') === 'call-to-action.default') ? { kind: 'team' as const } : {}),
    });
  }
  if (!sections.length && path !== '/events/') throw new Error(`No content extracted for ${path}`);
  if (path === '/sponsors/') sections.push({ html: '<h2>Become a sponsor</h2><p>To ask about supporting the user groups, <a href="/contact/">get in touch with the team</a>.</p>' });
  const text = load(sections[0]?.html ?? '').text().replace(/\s+/g, ' ').trim();
  migrated.push({ path, title: load(page.title.rendered).text(), description: text.slice(0, 155), sections });
  console.log(`Migrated ${path}: ${sections.length} sections`);
}

const homepage = await (await fetchSource(root)).text();
const home = load(homepage);
for (const href of home('a[href*="/etn/"]').map((_, a) => home(a).attr('href')!).get()) {
  legacyAliases[new URL(href).pathname] = '/events/';
}
Object.assign(legacyAliases, {
  '/etn/virtual-meeting-18th-november-2026-evening/': '/events/310817747/',
  '/etn/birmingham-in-person-meeting-19th-november-2026-evening/': '/events/311198824/',
  '/etn/national-london-in-person-meeting-7th-december-2026-all-day/': '/events/310429777/',
});
const brandAssets = {
  headerLogo: `${root}/wp-content/uploads/2022/01/D365PPUG-Generic-logo-initials-white.png`,
  heroBackdrop: `${root}/wp-content/uploads/2022/01/BG-HomePage-High.png`,
  logo: `${root}/wp-content/uploads/2022/01/D365PPUG-Generic-logo-white-e1650378302482.png`,
  mark: `${root}/wp-content/uploads/2022/01/D365PPUG-Logo-only-e1650384902771.png`,
  community: `${root}/wp-content/uploads/2024/05/IMG_6855-scaled.jpeg`,
  meeting: `${root}/wp-content/uploads/2022/04/IMG_1631-1.jpg`,
};
for (const [key, url] of Object.entries(brandAssets)) assets[key] = await localImage(url);

for (const [family, name] of [['Varela+Round', 'varela'], ['Montserrat:wght@400..700', 'montserrat']]) {
  const response = await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  if (!response.ok) throw new Error(`Font stylesheet HTTP ${response.status}`);
  const css = await response.text();
  const blocks = css.split('/* latin */')[1];
  if (!blocks) throw new Error(`Latin font subset missing for ${family}`);
  const source = /url\((https[^)]+)\)/.exec(blocks)?.[1];
  if (!source) throw new Error(`Font URL missing for ${family}`);
  const font = await fetchSource(source);
  await writeFile(`public/assets/${name}.woff2`, Buffer.from(await font.arrayBuffer()));
}
for (const [family, directory] of [['varelaround', 'VarelaRound'], ['montserrat', 'Montserrat']]) {
  const licence = await fetchSource(`https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`);
  await writeFile(`public/assets/${directory}-OFL.txt`, await licence.text());
}

const content: SiteContent = { pages: migrated, assets, redirects: legacyAliases };
await writeFile('content/site.json', JSON.stringify(content, null, 2) + '\n');
console.log(`Saved ${migrated.length} pages and ${Object.keys(assets).length} asset references.`);
