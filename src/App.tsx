import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { CommunityEvent, PageData } from './types';
import { eventDate, filterEvents, groups, isPast, selectEvents } from './events';

const speakerUrl = 'https://forms.office.com/e/8Y1kQR61Nh';

function Arrow({ back = false }: { back?: boolean }) {
  return <span aria-hidden="true">{back ? '\u2190' : '\u2192'}</span>;
}

function HeaderSocialLinks() {
  return <nav className="header-socials" aria-label="Community links">
    <a href="https://www.meetup.com/d365ppug/" aria-label="Meetup"><svg viewBox="0 0 24 24" aria-hidden="true"><text x="1" y="18" fontFamily="Arial,sans-serif" fontSize="23" fontWeight="700" fontStyle="italic" fill="currentColor">m</text></svg></a>
    <a href="https://linkedin.com/company/d365ppuguk" aria-label="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" /><path d="M7 10v8m5 0v-8m0 4c0-5 6-5 6 0v4" fill="none" stroke="var(--navy)" strokeWidth="2" /><circle cx="7" cy="7" r="1.2" fill="var(--navy)" /></svg></a>
    <a href="https://twitter.com/d365ppuguk" aria-label="X / Twitter"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 3 16 18h-4L2 3h4Zm15 0L5 21" fill="none" stroke="currentColor" strokeWidth="2" /></svg></a>
    <a href="https://youtube.com/d365ppuguk" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="5" fill="currentColor" /><path d="m10 8 7 4-7 4Z" fill="var(--navy)" /></svg></a>
    <a href="https://instagram.com/d365ppuguk" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" /></svg></a>
    <a href="mailto:hello@d365ppug.com" aria-label="Email the user group"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m3 6 9 7 9-7" fill="none" stroke="currentColor" strokeWidth="2" /></svg></a>
  </nav>;
}

function Header({ data }: { data: PageData }) {
  const [open, setOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const links = [['/events/', 'Events'], ['/sponsors/', 'Sponsors'], ['/contact/', 'Contact']];
  const onGroupPage = data.path === '/user-groups/' || groups.some(group => data.path === `/${group.slug}/`);
  return <header className="site-header" onKeyDown={event => {
    if (event.key === 'Escape') {
      if (groupsOpen) {
        setGroupsOpen(false);
        document.getElementById('group-menu-toggle')?.focus();
      } else {
        setOpen(false);
        document.getElementById('mobile-menu-toggle')?.focus();
      }
    }
  }}>
    <div className="container header-inner">
      <a className="brand" href="/" aria-label="D365PPUG home"><img src={data.assets.headerLogo} width="280" height="72" alt="D365PPUG, UK Dynamics 365 & Power Platform User Group" /></a>
      <HeaderSocialLinks />
      <button id="mobile-menu-toggle" className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => { setOpen(!open); setGroupsOpen(false); }}>{open ? 'Close menu' : 'Menu'}</button>
      <nav id="main-nav" className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
        <div className="group-navigation" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setGroupsOpen(false); }}>
          <div className="group-navigation-heading"><a href="/user-groups/" aria-current={onGroupPage ? 'page' : undefined}>User groups</a><button id="group-menu-toggle" className="group-menu-toggle" aria-label="Show user groups" aria-expanded={groupsOpen} aria-controls="group-menu" onClick={() => setGroupsOpen(!groupsOpen)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg></button></div>
          <ul id="group-menu" className="group-menu" hidden={!groupsOpen}>
            {groups.map(group => <li key={group.slug}><a href={`/${group.slug}/`} aria-current={data.path === `/${group.slug}/` ? 'page' : undefined}>{group.slug === 'uk' ? 'All day' : group.name} user group</a></li>)}
          </ul>
        </div>
        {links.map(([href, label]) => <a key={href} href={href} aria-current={data.path === href ? 'page' : undefined}>{label}</a>)}
      </nav>
    </div>
  </header>;
}

function Footer() {
  return <footer className="site-footer"><div className="container">
    <div className="footer-top"><div><a className="footer-name" href="/">D365 &amp; Power Platform UK</a><p>A community for learning, sharing, and connecting.</p></div>
      <div className="social-links"><a href="https://linkedin.com/company/d365ppuguk">LinkedIn</a><a href="https://youtube.com/d365ppuguk">YouTube</a><a href="https://instagram.com/d365ppuguk">Instagram</a><a href="https://twitter.com/d365ppuguk">X / Twitter</a></div>
    </div>
    <div className="footer-bottom"><p>UK Dynamics 365 &amp; Power Platform User Group</p><nav aria-label="Footer"><a href="/code-of-conduct/">Code of conduct</a><a href="/privacy-policy/">Privacy policy</a><a href="/session-submission-guidelines/">Speaker guidelines</a><a href="mailto:hello@d365ppug.com">Email us</a></nav></div>
  </div></footer>;
}

function Breadcrumb({ title, event = false }: { title: string; event?: boolean }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span>{event && <><a href="/events/">Events</a><span aria-hidden="true">/</span></>}<span aria-current="page">{title}</span></nav>;
}

function SpeakerBanner() {
  return <aside className="speaker-banner"><div><p className="eyebrow">Share what you know</p><h2>Have a story worth sharing?</h2><p>First-time speaker or familiar face, we'd love to hear from you.</p></div><a className="button button-white" href={speakerUrl}>Speak at a user group <Arrow /></a></aside>;
}

function EventCard({ event, now }: { event: CommunityEvent; now: number }) {
  const past = isPast(event, now);
  return <article className="event-card">
    <a className="event-image-link" href={`/events/${event.id}/`} tabIndex={-1} aria-hidden="true">
      <img src={event.image || '/event-fallback.svg'} alt="" width="800" height="450" loading="lazy" decoding="async" />
      <span className="event-format">{event.online ? 'Online' : groups.find(g => g.slug === event.group)?.name ?? 'In person'}</span>
    </a>
    <div className="event-card-body">
      <p className="event-date"><time dateTime={event.start}>{eventDate(event, { day: 'numeric', month: 'short', year: 'numeric' })}</time><span>{eventDate(event, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</span></p>
      <h3><a href={`/events/${event.id}/`}>{event.title}</a></h3>
      <p className="event-venue">{event.venue || 'Venue to be confirmed'}</p>
      <a className="text-link" href={`/events/${event.id}/`}>{event.cancelled ? 'Cancelled event' : past ? 'View past event' : 'View event'} <Arrow /></a>
    </div>
  </article>;
}

function EventGrid({ events, now }: { events: CommunityEvent[]; now: number }) {
  return events.length ? <div className="event-grid">{events.map(event => <EventCard key={event.id} event={event} now={now} />)}</div> : <div className="empty-state"><h3>No events to show</h3><p>Check back for new dates, or <a href="https://www.meetup.com/d365ppug/events/">visit Meetup</a> for updates.</p></div>;
}

function GroupGrid() {
  return <div className="group-grid">{groups.map((group, index) => <a className="group-card" key={group.slug} href={`/${group.slug}/`}>
    <span className="group-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{group.name}</h3><p>{group.subtitle}</p></div><Arrow />
  </a>)}</div>;
}

function Home({ data, now }: { data: PageData; now: number }) {
  return <>
    <section className="home-hero"><img className="hero-backdrop" src={data.assets.heroBackdrop} alt="" width="1600" height="650" /><div className="container hero-grid">
      <div className="hero-copy">
        <img className="hero-logo" src={data.assets.logo} alt="Dynamics 365 & Power Platform UK User Groups" width="500" height="167" />
        <h1>Welcome</h1>
        <p className="hero-description">Are you interested in Dynamics 365 and the Microsoft Power Platform? You're in the right place! We run meetings and events across the UK covering everything from CRM to RPA. Join us at a local meeting!</p>
        <div className="button-row"><a className="button" href="/events/">Find your next event <Arrow /></a><a className="quiet-link" href="/user-groups/">Explore the user groups <Arrow /></a></div>
        <div className="hero-notes"><span>Free to attend</span><span>All experience levels</span></div>
      </div>
      <div className="hero-visual"><img className="hero-photo" src={data.assets.meeting} alt="Members of the user group meeting and sharing ideas at an event" width="1000" height="750" fetchPriority="high" /></div>
    </div></section>
    <div className="community-strip"><div className="container"><p>A community built around</p><span>Dynamics 365</span><span>Power Apps</span><span>Power Automate</span><span>Power BI</span><span>Copilot Studio</span></div></div>
    <section className="section container"><div className="section-heading"><div><p className="eyebrow">Meet. Learn. Connect.</p><h2>Coming up in the community</h2><p>Make room in your calendar for a little shared learning.</p></div><a className="text-link" href="/events/">All events <Arrow /></a></div>
      <EventGrid events={selectEvents(data.events, false, now).slice(0, 3)} now={now} />
    </section>
    <section className="section section-tinted"><div className="container"><div className="section-heading"><div><p className="eyebrow">Find your people</p><h2>A user group near you</h2><p>Local evening meetups, national all-day events, and an online community.</p></div><a className="text-link" href="/user-groups/">About our community <Arrow /></a></div><GroupGrid /></div></section>
    <section className="section container"><SpeakerBanner /></section>
    <section className="sponsor-section container"><p className="eyebrow">Free events, thanks to their support</p><h2>Meet our sponsors</h2>
      <div className="sponsor-logos">{data.sponsors.map(sponsor => <a key={sponsor.url} href={sponsor.url}><img src={sponsor.image} alt={sponsor.name} width="180" height="70" loading="lazy" /></a>)}</div>
      <a className="text-link" href="/sponsors/">Get to know our sponsors <Arrow /></a>
    </section>
  </>;
}

function Events({ data, now }: { data: PageData; now: number }) {
  const [past, setPast] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const selected = selectEvents(data.events, past, now);
  const filtered = filterEvents(selected, query, group, onlineOnly);
  return <div className="container page-content"><Breadcrumb title="Events" /><div className="page-intro"><p className="eyebrow">Your next conversation starts here</p><h1>Community events</h1><p>Meet the Dynamics 365 and Power Platform community. All our user group events are free to attend.</p></div>
    <div className="event-tabs" aria-label="Event period"><button aria-pressed={!past} onClick={() => setPast(false)}>Upcoming <span>{selectEvents(data.events, false, now).length}</span></button><button aria-pressed={past} onClick={() => setPast(true)}>Past events <span>{selectEvents(data.events, true, now).length}</span></button></div>
    <form className="event-filters" role="search" onSubmit={event => event.preventDefault()}>
      <label>Search events<input type="search" placeholder="Search by name or place" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label>User group<select aria-label="User group" value={group} onChange={event => setGroup(event.target.value)}><option value="">All user groups</option>{groups.map(g => <option key={g.slug} value={g.slug}>{g.name}</option>)}</select></label>
      <label className="checkbox-label"><input type="checkbox" checked={onlineOnly} onChange={event => setOnlineOnly(event.target.checked)} /> Online only</label>
    </form>
    <p className="results-note" role="status">{filtered.length} {past ? 'past' : 'upcoming'} {filtered.length === 1 ? 'event' : 'events'}{past ? '. Showing the latest 10 past events from Meetup.' : '.'}</p>
    {filtered.length ? <EventGrid events={filtered} now={now} /> : <div className="empty-state"><h2>No matching events</h2><p>Try another search or user group.</p><button className="button" onClick={() => { setQuery(''); setGroup(''); setOnlineOnly(false); }}>Clear filters</button></div>}
    <p className="source-note">Event information comes from <a href="https://www.meetup.com/d365ppug/events/">Meetup</a>. Last checked <time dateTime={data.fetchedAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(new Date(data.fetchedAt))} UK time</time>. Registration and the latest updates are on Meetup.</p>
    <SpeakerBanner />
  </div>;
}

function EventDetail({ event, fetchedAt, now }: { event: CommunityEvent; fetchedAt: string; now: number }) {
  const past = isPast(event, now);
  return <div className="container page-content"><Breadcrumb title={event.title} event /><div className="detail-layout">
    <article><p className="eyebrow">{event.cancelled ? 'Cancelled event' : past ? 'Past event' : event.online ? 'Online user group' : 'In-person user group'}</p><h1 className="event-title">{event.title}</h1>
      <img className="detail-image" src={event.image || '/event-fallback.svg'} width="800" height="450" alt="" />
      <div className="prose event-description" dangerouslySetInnerHTML={{ __html: event.description }} />
      <p className="source-note">From <a href={event.url}>Meetup</a>. Last checked <time dateTime={fetchedAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Europe/London' }).format(new Date(fetchedAt))}</time>.</p>
    </article>
    <aside className="event-sidebar"><h2>Event details</h2><dl><dt>When</dt><dd><time dateTime={event.start}>{eventDate(event, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time><br />{eventDate(event, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })} to {eventDate({ ...event, start: event.end }, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</dd><dt>Where</dt><dd>{event.venue || 'Venue to be confirmed'}{event.address && <><br />{event.address}</>}</dd><dt>Admission</dt><dd>Free to attend</dd></dl>
      {event.cancelled ? <p className="status-message">This event has been cancelled.</p> : past ? <p className="status-message">This event has ended.</p> : <a className="button" href={event.url}>Register on Meetup <Arrow /></a>}
      <a className="text-link" href={event.url}>View {past || event.cancelled ? 'event' : 'latest details'} on Meetup <Arrow /></a>
      <p className="small-text">Please read our <a href="/code-of-conduct/">code of conduct</a> before attending.</p>
    </aside>
  </div></div>;
}

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }
  return <div className="contact-layout"><div><p className="eyebrow">Get in touch</p><h2>Drop us a line</h2><p>Have a question about a user group, sponsoring an event, or getting involved? We'd love to hear from you.</p><a className="contact-email" href="mailto:hello@d365ppug.com">hello@d365ppug.com</a><div className="contact-speaker"><h3>Interested in speaking?</h3><p>You don't need to be an experienced presenter to share what you've learned.</p><a className="text-link" href={speakerUrl}>Submit a session <Arrow /></a><a href="/session-submission-guidelines/">Read the session guidelines</a></div></div>
    <form className="contact-form" onSubmit={submit}><p className="demo-notice"><strong>Demo form.</strong> This form does not send or store messages. To contact the team, use the email link.</p>
      <label htmlFor="full-name">Full name<input id="full-name" name="name" autoComplete="name" required maxLength={150} /></label>
      <label htmlFor="email">Email address<input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></label>
      <label htmlFor="message">Your message<textarea id="message" name="message" rows={5} required maxLength={5000} /></label>
      <button className="button" type="submit">Try the demo form <Arrow /></button>
      {submitted && <p className="form-status" role="status">Demo complete. No message was sent or stored. Please email hello@d365ppug.com to reach the team.</p>}
    </form></div>;
}

function ContentPage({ data, now }: { data: PageData; now: number }) {
  const page = data.page!;
  const group = groups.find(g => page.path === `/${g.slug}/`);
  const isGroups = page.path === '/user-groups/';
  const isSponsors = page.path === '/sponsors/';
  const title = group ? `${group.name} user group` : page.title;
  return <div className="container page-content"><Breadcrumb title={title} /><div className="page-intro"><p className="eyebrow">{group ? group.subtitle : isGroups ? 'Learn, share, and connect' : isSponsors ? 'Supporting the community' : 'UK Dynamics 365 & Power Platform'}</p><h1>{title}</h1></div>
    {page.path === '/contact/' ? <Contact /> : <>
      {isGroups && <GroupGrid />}
      <div className={`editorial ${isSponsors ? 'sponsor-content' : ''}`}>{page.sections.map((section, index) => <section key={index} className={`prose content-section${section.kind === 'team' ? ' team-section' : ''}`} dangerouslySetInnerHTML={{ __html: section.html }} />)}</div>
      {group && <section className="section"><div className="section-heading"><div><p className="eyebrow">Join us next time</p><h2>Upcoming {group.name} events</h2></div><a className="text-link" href="/events/">All events <Arrow /></a></div><EventGrid events={selectEvents(data.events, false, now)} now={now} /></section>}
      {(group || isGroups) && <SpeakerBanner />}
    </>}
  </div>;
}

export function App({ data }: { data: PageData }) {
  const [now, setNow] = useState(Date.parse(data.fetchedAt));
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const known = data.path === '/' || data.path === '/events/' || data.event || data.page;
  return <><a className="skip-link" href="#content">Skip to content</a><Header data={data} /><main id="content">
    {!known ? <div className="container not-found"><p className="eyebrow">404</p><h1>We couldn't find that page</h1><p>The event may be outside our recent archive, or the address may have changed.</p><a className="button" href="/events/">Browse events <Arrow /></a><a className="text-link" href="/">Return home <Arrow /></a></div> :
      data.path === '/' ? <Home data={data} now={now} /> : data.path === '/events/' ? <Events data={data} now={now} /> : data.event ? <EventDetail event={data.event} fetchedAt={data.fetchedAt} now={now} /> : <ContentPage data={data} now={now} />}
  </main><Footer /></>;
}
