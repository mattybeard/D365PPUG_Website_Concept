import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { EventData } from '../../src/types';

test('homepage hydrates without errors, has accessible navigation, and fits the viewport', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Events', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('header retains the original brand treatment and user group dropdown', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('.brand img')).toHaveAttribute('src', /\/assets\/.+\.webp/);
  const styles = await page.locator('.site-header').evaluate(header => ({
    background: getComputedStyle(header).backgroundImage,
    bodySize: Number.parseFloat(getComputedStyle(document.body).fontSize),
    heroSize: Number.parseFloat(getComputedStyle(document.querySelector('.hero-description')!).fontSize),
    headingSpacing: getComputedStyle(document.querySelector('h1')!).letterSpacing,
  }));
  expect(styles.background).toContain('linear-gradient(130deg');
  expect(styles.bodySize).toBeGreaterThanOrEqual(testInfo.project.name === 'mobile' ? 18 : 20);
  expect(styles.heroSize).toBeGreaterThanOrEqual(testInfo.project.name === 'mobile' ? 18 : 20);
  expect(styles.headingSpacing).toBe('normal');
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const brand = await page.locator('.brand').boundingBox();
    const menuButton = await page.getByRole('button', { name: 'Close menu' }).boundingBox();
    expect(brand).not.toBeNull();
    expect(menuButton).not.toBeNull();
    expect(Math.abs(brand!.y + brand!.height / 2 - menuButton!.y - menuButton!.height / 2)).toBeLessThan(2);
  } else {
    await expect(page.getByRole('navigation', { name: 'Community links' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Community links' }).getByRole('link')).toHaveCount(6);
  }
  const toggle = page.getByRole('button', { name: 'Show user groups' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#group-menu').getByRole('link')).toHaveCount(8);
  await expect(page.locator('#group-menu').getByRole('link', { name: 'Birmingham user group', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await page.locator('#group-menu').getByRole('link', { name: 'Birmingham user group', exact: true }).click();
  await expect(page).toHaveURL('/birmingham/');
});

test('event search, group selection, online filter and recent-past limit work', async ({ page }) => {
  const data: EventData = JSON.parse(await readFile('src/generated/events.json', 'utf8'));
  await page.clock.setFixedTime(new Date(data.fetchedAt));
  await page.goto('/events/');
  await expect(page.locator('.event-card')).toHaveCount(data.events.filter(event => Date.parse(event.end) > Date.parse(data.fetchedAt)).length);
  await page.getByLabel('Online only').check();
  await expect(page.locator('.event-card')).toHaveCount(data.events.filter(event => event.online && Date.parse(event.end) > Date.parse(data.fetchedAt)).length);
  await page.getByLabel('Online only').uncheck();
  await page.getByLabel('User group', { exact: true }).selectOption('birmingham');
  await expect(page.locator('.event-card')).toHaveCount(data.events.filter(event => event.group === 'birmingham' && Date.parse(event.end) > Date.parse(data.fetchedAt)).length);
  await page.getByLabel('Search events').fill('this event does not exist');
  await expect(page.getByRole('heading', { name: 'No matching events' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: /Past events/ }).click();
  await expect(page.locator('.event-card')).toHaveCount(Math.min(10, data.events.filter(event => Date.parse(event.end) <= Date.parse(data.fetchedAt)).length));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('larger typography fits narrow phones and intermediate screen widths', async ({ page }) => {
  for (const width of [320, 390, 768, 900, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow at ${width}px`).toBe(true);
    const clippedCards = await page.locator('.group-card').evaluateAll(cards => cards.filter(card =>
      Array.from(card.children).some(child => child.getBoundingClientRect().right > card.getBoundingClientRect().right)
    ).length);
    expect(clippedCards, `Group card text exceeds its card at ${width}px`).toBe(0);
  }
});

test('event deep links show full details and do not offer registration after the event ends', async ({ page }) => {
  const data: EventData = JSON.parse(await readFile('src/generated/events.json', 'utf8'));
  const event = data.events.find(event => !event.cancelled)!;
  await page.clock.setFixedTime(new Date(Date.parse(event.end) + 60_000));
  await page.goto(`/events/${event.id}/`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(event.title);
  await expect(page.locator('.event-description')).not.toBeEmpty();
  await expect(page.getByText('This event has ended.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Register on Meetup' })).toHaveCount(0);
  const structured = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '');
  expect(structured.name).toBe(event.title);
  expect(structured.startDate).toBe(event.start);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(event.title);
});

test('contact is a labelled demo and sends no message', async ({ page }) => {
  const requests: string[] = [];
  await page.goto('/contact/');
  page.on('request', request => { if (request.method() !== 'GET') requests.push(request.url()); });
  await expect(page.getByText('Demo form.', { exact: true })).toBeVisible();
  await page.getByLabel('Full name').fill('Example User');
  await page.getByLabel('Email address').fill('example@example.com');
  await page.getByLabel('Your message').fill('This is a test of the demo.');
  await page.getByRole('button', { name: 'Try the demo form' }).click();
  await expect(page.getByRole('status')).toContainText('No message was sent or stored');
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test('legacy redirects, true not-found responses and group pages work', async ({ page, request }) => {
  const redirect = await request.get('/south-west/', { maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(redirect.headers().location).toBe('/bristol/');
  await page.goto('/birmingham/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Birmingham user group');
  await expect(page.getByRole('heading', { name: 'Imtiaz Hussain', exact: true })).toBeVisible();
  const notFound = await page.goto('/events/000000000/');
  expect(notFound?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("couldn't find");
});

test('team profiles and sponsor descriptions use separate readable layouts', async ({ page }) => {
  await page.goto('/birmingham/');
  await expect(page.locator('.team-section')).toHaveCSS('display', 'grid');
  expect(await page.locator('.team-section figure').count()).toBeGreaterThan(0);
  await page.goto('/sponsors/');
  await expect(page.locator('.sponsor-content .team-section')).toHaveCount(0);
  await expect(page.locator('.sponsor-content').getByText(/DigPacks is a well-established/)).toBeVisible();
  const logo = page.locator('.sponsor-content img').first();
  expect(await logo.evaluate(image => image.getBoundingClientRect().width)).toBeLessThanOrEqual(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('homepage initial resource transfer stays within the 750 KiB budget', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The transfer budget uses a fixed desktop viewport.');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const measurement = await page.evaluate(() => {
    const entries = [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')] as PerformanceResourceTiming[];
    return { bytes: entries.reduce((sum, entry) => sum + entry.encodedBodySize, 0), urls: entries.map(entry => entry.name) };
  });
  console.log(`Initial homepage compressed resources: ${(measurement.bytes / 1024).toFixed(1)} KiB`);
  expect(measurement.bytes).toBeGreaterThan(0);
  expect(measurement.bytes).toBeLessThanOrEqual(750 * 1024);
  expect(measurement.urls.every(url => url.startsWith('http://127.0.0.1:4173/'))).toBe(true);
});
