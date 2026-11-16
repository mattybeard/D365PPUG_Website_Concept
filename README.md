# D365PPUG website

A React and TypeScript website built with Vite for Azure Static Web Apps. Each public route has build-rendered HTML. React hydrates the navigation, event filters, and demonstration contact form.

## Local development

Use Node.js 22.12 or later.

```powershell
npm ci
npm run scrape
npm run dev
```

The development server prints its local URL. Content and licensed fonts are already included. Normal development and deployment do not need the old WordPress site.

```powershell
npm test
npm run build
npm run check:output
npm run preview
```

The production preview runs at `http://127.0.0.1:4173`. It serves the generated files, gzip compression, redirects, not-found response, and security headers. It is a local preview, not the Azure hosting runtime.

To run browser checks:

```powershell
npx playwright install chromium
npm run test:browser
```

`npm run build` always performs a fresh Meetup scrape before type checking and building. `npm run build:site` rebuilds using the most recently generated event data for local layout work. Do not use it as the deployment build command.

## Content

- [content/site.json](content/site.json) contains the migrated pages, team information, sponsor descriptions, asset references, and verified legacy redirects.
- [content/privacy.html](content/privacy.html) replaces WordPress-specific privacy statements. The organisers must review the policy before launch, including email handling and retention.
- [src/styles.css](src/styles.css) defines the existing navy and purple palette and the responsive layouts.
- [src/App.tsx](src/App.tsx) contains the shared layouts, homepage, contact demo, and event components.
- [public/assets](public/assets) contains local optimised photography, logos, and fonts. The font licence files are included alongside the fonts.

Edit local content rather than fetching it on each build. Page content is trusted editorial HTML. Keep it semantic and do not add scripts, inline event handlers, tracking pixels, or embedded forms.

The one-time migration script is available as `npm run migrate`. It downloads the current public WordPress content and assets and overwrites [content/site.json](content/site.json). Do not rerun it after editorial changes unless you intend to replace those changes. The separately maintained privacy policy is not overwritten.

The homepage uses a condensed introduction and links to the complete user group and sponsor pages. The eight group pages retain the source descriptions, team profiles where present, and external links. WordPress event-plugin utility pages redirect to events rather than becoming visitor pages.

The header retains the original navy-to-purple gradient, initials logo, community links, and user-group dropdown. The welcome section uses the original background artwork and logo. Varela Round headings use normal letter spacing. Montserrat body text is 20px on desktop and 18px on small screens; controls and supporting text have separate readable sizes. The dropdown supports keyboard input and Escape, and the mobile menu contains the same group links.

## Event scraping

The build reads `https://www.meetup.com/d365ppug/events/` and each selected child event page. It uses public embedded page data and Event structured data, not a Meetup API key, logged-in session, private API, or headless browser.

The output includes all upcoming events exposed by a complete listing and only the latest 10 past events. It does not accumulate a historical archive. Each selected event has a stable local `/events/<meetup-id>/` route. Registration stays on Meetup. Older past detail routes leave the site when they fall outside the selected 10.

The normalised data contract in [src/types.ts](src/types.ts) includes:

- The Meetup ID, title, source URL, and full public description.
- UTC start/end timestamps and the group's source timezone.
- Attendance mode, cancellation status, and public venue/address when available.
- A local event image and a matched user group.

Descriptions use the full embedded event description, not the truncated search-engine description. Markdown is parsed and sanitised before rendering. National/all-day meetings are distinct from regional evening meetings. Unknown group names remain visible in the general listing.

Missing optional images use a branded local image. Missing venues are labelled as unconfirmed. Invalid required data, unexpected status, partial listings, failed requests, or failed child pages stop the build. Upcoming pagination beyond the initial listing also stops the build until a permitted public HTML navigation route is implemented. No incomplete data or stale snapshot is published as a successful refresh.

Requests have timeouts and limited transient-error retries. A long rate-limit delay fails the build. The scraper does not bypass login, access controls, or anti-bot challenges. Review Meetup's current terms and public crawling rules before enabling scheduled use.

Generated event data is ignored by Git and written only after the selected scrape succeeds. Cached public source HTML stays in the ignored `.cache` directory for local diagnosis. It is not deployed.

Event timestamps display in the source timezone, currently Europe/London. Hydrated pages re-evaluate event status at load and once per minute so ended events do not continue to offer registration between deployments.

## Contact form

The form is a labelled demonstration. It validates fields in the browser, does not send requests, does not persist entered values, and explicitly says no message was sent. The email link to `hello@d365ppug.com` and the existing Microsoft Forms speaker submission link work independently.

A production contact service, CMS, full event archive, live event updates, attendee management, analytics, and Azure resource provisioning are outside this implementation.

## Azure Static Web Apps

1. Put the project in a GitHub repository with `main` as the default branch, or edit the workflow branch filters.
2. Create an Azure Static Web Apps resource. Avoid adding a second competing deployment workflow.
3. Store its deployment token in the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_SALMON_GLACIER_0DFE38D0F`, which the workflow references. If Azure creates a different secret name, update the workflow to match.
4. Run the workflow manually or push to `main`.
5. Add and verify `www.d365ppug.com` in the Azure portal. Configure its DNS records using Azure's instructions. Configure the apex domain and preferred-host redirect if required.
6. Review the privacy policy, content, contact-demo notice, and live deployment before changing production DNS.

The [GitHub Actions workflow](.github/workflows/azure-static-web-apps.yml) installs dependencies from the lockfile, runs unit tests, performs a fresh scrape and production build, checks output and size budgets, and runs browser tests. It uploads `dist` with Azure's build step disabled. Pull requests validate and produce a downloadable build artifact but do not deploy previews or use deployment credentials.

Manual dispatch is enabled. To schedule refreshes, uncomment and set the `schedule` block in the workflow. The sample cron runs daily at 06:00 UTC. GitHub schedules run on the default branch and may be delayed. No schedule is enabled by default.

A failed scrape prevents deployment. Azure continues serving the last successful deployment. Review GitHub Actions failures when Meetup changes its markup or access behavior.

[scripts/render.ts](scripts/render.ts) writes `dist/staticwebapp.config.json`, including verified redirects, the legacy `/etn/*` fallback, HTML revalidation, asset caching, a real 404 response, and security headers. There is no catch-all SPA rewrite. The generated sitemap includes substantive pages and selected event routes.

No Azure resource or live domain is created or changed by running the local build.

## Validation and size limits

Unit tests cover source parsing, completeness checks, malformed data, sanitisation, HTTP errors, event grouping, filters, ordering, and UK daylight-saving boundaries. Browser tests cover hydration, mobile navigation, filters, demo submission, event deep links, post-event registration controls, redirects, and not-found responses.

Output checks validate route HTML, metadata, local links/assets, and the exact set of event routes. The homepage budgets are 100 KiB gzipped JavaScript, 25 KiB gzipped CSS, and 750 KiB compressed initial resources at a 1280 by 900 viewport with an empty browser cache. The browser test measures the last limit without scrolling or loading offscreen content deliberately.
