// Mock storage for admin panel entities. Backend-ready shapes.

export interface TemplateVariation {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "draft" | "archived";
  headerFooterId?: string;
  updatedAt: string;
}

export interface HeaderFooter {
  id: string;
  name: string;
  headerHtml: string;
  footerHtml: string;
  updatedAt: string;
}

export interface HeroMetadata {
  json: string;
  updatedAt: string;
}

export interface CacheKey {
  key: string;
  size: string;
  ttl: string;
}
export interface CacheRegion {
  name: string;
  keys: CacheKey[];
}

const TV_KEY = "admin.templateVariations.v1";
const HF_KEY = "admin.headerFooters.v1";
const HERO_KEY = "admin.heroMetadata.v1";

const uid = () => Math.random().toString(36).slice(2, 10);

// ---------- Template Variations ----------
const seedTV: TemplateVariation[] = [
  { id: uid(), code: "STD-EMAIL", name: "Standard Email", description: "Default transactional email variation", status: "active", updatedAt: new Date().toISOString() },
  { id: uid(), code: "MKTG-PROMO", name: "Marketing Promo", description: "Promotional layout with hero banner", status: "active", updatedAt: new Date().toISOString() },
  { id: uid(), code: "SYS-ALERT", name: "System Alert", description: "Minimal alert / incident notice", status: "draft", updatedAt: new Date().toISOString() },
];

export const getTemplateVariations = (): TemplateVariation[] => {
  const raw = localStorage.getItem(TV_KEY);
  if (!raw) { localStorage.setItem(TV_KEY, JSON.stringify(seedTV)); return seedTV; }
  return JSON.parse(raw);
};
export const saveTemplateVariation = (v: TemplateVariation) => {
  const list = getTemplateVariations();
  const idx = list.findIndex(x => x.id === v.id);
  if (idx >= 0) list[idx] = v; else list.push(v);
  localStorage.setItem(TV_KEY, JSON.stringify(list));
};
export const deleteTemplateVariation = (id: string) => {
  localStorage.setItem(TV_KEY, JSON.stringify(getTemplateVariations().filter(x => x.id !== id)));
};

// ---------- Header & Footer ----------
const seedHF: HeaderFooter[] = [
  {
    id: uid(),
    name: "Corporate Default",
    headerHtml: '<table width="100%"><tr><td style="padding:16px;background:#0a2540;color:#fff;font-family:Arial">ACME Corp</td></tr></table>',
    footerHtml: '<table width="100%"><tr><td style="padding:12px;background:#f4f6fa;color:#555;font-size:12px;font-family:Arial">© ACME Corp. All rights reserved.</td></tr></table>',
    updatedAt: new Date().toISOString(),
  },
  {
    id: uid(),
    name: "Minimal",
    headerHtml: '<div style="padding:12px;border-bottom:1px solid #eee;font-family:Arial">Notification</div>',
    footerHtml: '<div style="padding:12px;color:#888;font-size:11px;font-family:Arial">You received this because you are subscribed.</div>',
    updatedAt: new Date().toISOString(),
  },
];
export const getHeaderFooters = (): HeaderFooter[] => {
  const raw = localStorage.getItem(HF_KEY);
  if (!raw) { localStorage.setItem(HF_KEY, JSON.stringify(seedHF)); return seedHF; }
  return JSON.parse(raw);
};
export const saveHeaderFooter = (v: HeaderFooter) => {
  const list = getHeaderFooters();
  const idx = list.findIndex(x => x.id === v.id);
  if (idx >= 0) list[idx] = v; else list.push(v);
  localStorage.setItem(HF_KEY, JSON.stringify(list));
};
export const deleteHeaderFooter = (id: string) => {
  localStorage.setItem(HF_KEY, JSON.stringify(getHeaderFooters().filter(x => x.id !== id)));
};

// ---------- Hero Metadata ----------
const seedHero: HeroMetadata = {
  json: JSON.stringify({
    title: "Welcome to PageBuilder",
    subtitle: "Build outlook-ready emails in minutes",
    cta: { label: "Get started", href: "/templates" },
    highlights: [
      { icon: "zap", title: "Fast", body: "Drag-and-drop sections" },
      { icon: "shield", title: "Compliant", body: "Outlook-safe HTML" },
      { icon: "layers", title: "Reusable", body: "Template variations" },
    ],
  }, null, 2),
  updatedAt: new Date().toISOString(),
};
export const getHeroMetadata = (): HeroMetadata => {
  const raw = localStorage.getItem(HERO_KEY);
  if (!raw) { localStorage.setItem(HERO_KEY, JSON.stringify(seedHero)); return seedHero; }
  return JSON.parse(raw);
};
export const saveHeroMetadata = (json: string) => {
  const v: HeroMetadata = { json, updatedAt: new Date().toISOString() };
  localStorage.setItem(HERO_KEY, JSON.stringify(v));
  return v;
};

// ---------- Cache (mock ops) ----------
export const getBearerToken = (): string => {
  // Mock — in real app read from auth context
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBhY21lLmNvbSIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTcyMTU3MzYwMCwiZXhwIjoxNzIxNjYwMDAwfQ.MOCK_SIGNATURE_PLACEHOLDER_9c5f1a";
};
export const fetchCacheRegions = async (): Promise<CacheRegion[]> => {
  await new Promise(r => setTimeout(r, 400));
  return [
    { name: "templates", keys: [
      { key: "tpl:STD-EMAIL:v3", size: "12.4 KB", ttl: "24h" },
      { key: "tpl:MKTG-PROMO:v1", size: "18.9 KB", ttl: "24h" },
      { key: "tpl:SYS-ALERT:v2", size: "4.1 KB", ttl: "12h" },
    ]},
    { name: "distribution-lists", keys: [
      { key: "dl:all-hands", size: "84.2 KB", ttl: "1h" },
      { key: "dl:cib-trading", size: "22.1 KB", ttl: "1h" },
      { key: "dl:eng-leads", size: "5.6 KB", ttl: "1h" },
      { key: "dl:ops-oncall", size: "3.2 KB", ttl: "1h" },
    ]},
    { name: "roster", keys: [
      { key: "roster:lob:CCB", size: "210 KB", ttl: "6h" },
      { key: "roster:lob:CIB", size: "184 KB", ttl: "6h" },
    ]},
    { name: "sessions", keys: [
      { key: "sess:admin@acme.com", size: "2.1 KB", ttl: "8h" },
      { key: "sess:priya.r@acme.com", size: "2.0 KB", ttl: "8h" },
    ]},
  ];
};
