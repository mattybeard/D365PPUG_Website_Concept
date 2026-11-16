export interface ContentSection {
  html: string;
  kind?: 'team';
}

export interface SitePage {
  path: string;
  title: string;
  description: string;
  sections: ContentSection[];
}

export interface SiteContent {
  pages: SitePage[];
  assets: Record<string, string>;
  redirects: Record<string, string>;
}

export interface CommunityEvent {
  id: string;
  title: string;
  url: string;
  start: string;
  end: string;
  timezone: string;
  online: boolean;
  cancelled: boolean;
  venue: string;
  address: string;
  description: string;
  image: string;
  group: string;
}

export interface EventData {
  fetchedAt: string;
  events: CommunityEvent[];
}

export interface PageData {
  path: string;
  page?: SitePage;
  event?: CommunityEvent;
  events: CommunityEvent[];
  fetchedAt: string;
  assets: Record<string, string>;
  sponsors: { image: string; name: string; url: string }[];
}
