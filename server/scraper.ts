import * as cheerio from "cheerio";

interface ScrapedBusiness {
  name: string;
  url: string;
  description?: string;
  hasWebsite: boolean;
  source?: string;
  phone?: string;
  email?: string;
  address?: string;
  socialMedia?: string[];
  bbbRating?: string;
  bbbAccredited?: boolean;
  googleRating?: number;
  googleReviewCount?: number;
}

interface ScrapedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  experience: string;
  description: string;
  requirements: string[];
  postedDate: string;
  source: string;
  url: string;
  technologies: string[];
  remote: boolean;
}

interface ScrapedFreelanceProject {
  id: string;
  title: string;
  description: string;
  budget: string;
  budgetType: 'fixed' | 'hourly' | 'negotiable';
  skills: string[];
  experience: string;
  duration: string;
  postedBy: string;
  postedDate: string;
  source: string;
  url: string;
  tags: string[];
  location: string;
  remote: boolean;
  applicants: number;
}

interface WebsiteAnalysis {
  score: number;
  issues: string[];
  hasWebsite: boolean;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SOCIAL_MEDIA_DOMAINS: Record<string, string> = {
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "instagram.com": "instagram",
  "twitter.com": "twitter",
  "x.com": "twitter",
  "tiktok.com": "tiktok",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
  "pinterest.com": "pinterest",
  "nextdoor.com": "nextdoor",
};

function detectSocialMediaUrl(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    for (const [domain, platform] of Object.entries(SOCIAL_MEDIA_DOMAINS)) {
      if (host === domain || host.endsWith(`.${domain}`)) {
        return `${platform}:${parsed.href}`;
      }
    }
  } catch {}
  return null;
}

function extractSocialLinksFromHtml(html: string, $: cheerio.CheerioAPI): string[] {
  const socials: string[] = [];
  const seen = new Set<string>();
  $('a[href]').each((_i, el) => {
    const href = $(el).attr("href") || "";
    const social = detectSocialMediaUrl(href);
    if (social && !seen.has(social.split(":")[0])) {
      seen.add(social.split(":")[0]);
      socials.push(social);
    }
  });
  return socials;
}

interface CacheEntry {
  results: ScrapedBusiness[];
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Increased to 24 hours to save scraping costs
const MAX_CACHE_ENTRIES = 500; // Increased capacity for growing user base

function getCacheKey(category: string, location: string, maxResults: number, page: number = 1): string {
  return `${category.toLowerCase().trim()}|${location.toLowerCase().trim()}|${maxResults}|p${page}`;
}

function pruneCache(): void {
  const now = Date.now();
  const keys = Array.from(searchCache.keys());
  for (const key of keys) {
    const entry = searchCache.get(key);
    if (entry && now - entry.timestamp > CACHE_TTL_MS) {
      searchCache.delete(key);
    }
  }
  if (searchCache.size > MAX_CACHE_ENTRIES) {
    const entries = Array.from(searchCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
    for (const [key] of toRemove) {
      searchCache.delete(key);
    }
  }
}

export function clearSearchCache(): void {
  searchCache.clear();
}

export function getSearchCacheStats(): { size: number; maxSize: number; ttlHours: number } {
  pruneCache();
  return { size: searchCache.size, maxSize: MAX_CACHE_ENTRIES, ttlHours: CACHE_TTL_MS / (60 * 60 * 1000) };
}

function extractPhoneFromText(text: string): string | undefined {
  const phonePatterns = [
    /\+1[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g,
  ];
  for (const pattern of phonePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const clean = m.replace(/[^0-9+]/g, "");
        if (clean.length >= 10 && clean.length <= 15) {
          return m.trim();
        }
      }
    }
  }
  return undefined;
}

function extractEmailFromText(text: string): string | undefined {
  const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailPattern);
  if (!matches) return undefined;
  const invalidDomains = [
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "w3.org", "schema.org", "apache.org", "cloudflare.com",
    "wordpress.org", "gravatar.com", "jquery.com",
  ];
  const invalidExts = [".png", ".jpg", ".svg", ".gif", ".webp", ".css", ".js"];
  return matches.find(e => {
    const lower = e.toLowerCase();
    if (invalidExts.some(ext => lower.endsWith(ext))) return false;
    if (lower.includes("@2x") || lower.includes("@3x")) return false;
    if (invalidDomains.some(d => lower.includes(d))) return false;
    if (lower.split("@")[0].length < 2) return false;
    return true;
  });
}

async function ddgSearchText(query: string, timeoutMs = 8000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      }
    );
    clearTimeout(timeout);
    if (response.status !== 200 && response.status !== 202) return "";
    const html = await response.text();
    const $ = cheerio.load(html);
    const snippets = $(".result__snippet").map((_i, el) => $(el).text()).get().join(" ");
    const titles = $(".result__a").map((_i, el) => $(el).text()).get().join(" ");
    const urls = $(".result__url").map((_i, el) => $(el).text()).get().join(" ");
    return `${snippets} ${titles} ${urls}`;
  } catch {
    return "";
  }
}

async function fetchYPContactInfo(businessName: string, location: string): Promise<{ phone?: string; email?: string }> {
  const result: { phone?: string; email?: string } = {};
  try {
    const searchTerm = encodeURIComponent(businessName);
    const geoLocation = encodeURIComponent(location);
    const url = `https://www.yellowpages.com/search?search_terms=${searchTerm}&geo_location_terms=${geoLocation}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      },
    });
    clearTimeout(timeout);
    if (!response.ok) return result;
    const html = await response.text();
    const $ = cheerio.load(html);
    const bizNameLower = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    $(".result").each((_i, el) => {
      const name = $(el).find(".business-name a, .business-name span").first().text().trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
      if (!name) return;
      const nameWords = bizNameLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = nameWords.filter(w => name.includes(w)).length;
      if (matchCount < Math.ceil(nameWords.length * 0.5)) return;
      const phone = $(el).find(".phones.phone.primary").text().trim();
      if (phone && !result.phone) result.phone = phone;
      const email = $(el).find("a.email-business").attr("href") || "";
      if (email.startsWith("mailto:") && !result.email) {
        result.email = email.replace("mailto:", "").split("?")[0];
      }
      if (result.phone) return false;
    });
  } catch {}
  return result;
}

export async function enrichContactInfo(
  businessName: string,
  location: string
): Promise<{ phone?: string; email?: string }> {
  const result: { phone?: string; email?: string } = {};

  const searches = await Promise.allSettled([
    ddgSearchText(`"${businessName}" ${location} phone number contact`),
    ddgSearchText(`"${businessName}" ${location} email address`),
    fetchYPContactInfo(businessName, location),
  ]);

  const ddgPhoneText = searches[0].status === "fulfilled" ? searches[0].value : "";
  const ddgEmailText = searches[1].status === "fulfilled" ? searches[1].value : "";
  const ypResult = searches[2].status === "fulfilled" ? searches[2].value : {};

  const combinedText = `${ddgPhoneText} ${ddgEmailText}`;

  result.phone = extractPhoneFromText(combinedText) || (ypResult as any).phone;
  result.email = extractEmailFromText(combinedText) || (ypResult as any).email;

  return result;
}

export async function searchBusinesses(
  category: string,
  location: string,
  maxResults: number = 20,
  page: number = 1
): Promise<ScrapedBusiness[]> {
  const cacheKey = getCacheKey(category, location, maxResults, page);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Cache HIT] "${category}" in "${location}" p${page} — returning ${cached.results.length} cached results`);
    return cached.results;
  }

  const businesses: ScrapedBusiness[] = [];

  const categoryVariants = [
    category,
    `${category} services`,
    `${category} companies`,
    `local ${category}`,
    `${category} contractors`,
    `affordable ${category}`,
    `top ${category}`,
    `${category} professionals`,
    `reliable ${category}`,
    `${category} specialists`,
  ];

  const locationParts = location.split(/[,\s]+/).filter(Boolean);
  const stateAbbr = locationParts.length >= 2 ? locationParts[locationParts.length - 1] : "";
  const cityName = locationParts.slice(0, -1).join(" ") || location;
  const locationVariants = [
    location,
    `near ${location}`,
    `in ${cityName} ${stateAbbr}`,
    `${cityName} area`,
    `around ${cityName} ${stateAbbr}`,
  ];

  const querySetIndex = ((page - 1) % 3);

  let bingQueries: string[];
  let ddgQueries: string[];

  if (querySetIndex === 0) {
    bingQueries = [
      `${categoryVariants[0]} ${locationVariants[0]}`,
      `${categoryVariants[0]} ${locationVariants[1]}`,
      `best ${categoryVariants[0]} ${locationVariants[0]}`,
      `${categoryVariants[0]} business ${locationVariants[0]}`,
    ];
    ddgQueries = [
      `${categoryVariants[0]} ${locationVariants[0]}`,
      `${categoryVariants[0]} ${locationVariants[1]}`,
    ];
  } else if (querySetIndex === 1) {
    bingQueries = [
      `${categoryVariants[1]} ${locationVariants[0]}`,
      `${categoryVariants[2]} ${locationVariants[0]}`,
      `${categoryVariants[3]} ${locationVariants[0]}`,
      `${categoryVariants[0]} ${locationVariants[2]}`,
    ];
    ddgQueries = [
      `${categoryVariants[1]} ${locationVariants[0]}`,
      `${categoryVariants[3]} ${locationVariants[2]}`,
    ];
  } else {
    bingQueries = [
      `${categoryVariants[4]} ${locationVariants[0]}`,
      `${categoryVariants[5]} ${locationVariants[0]}`,
      `${categoryVariants[0]} ${locationVariants[3]}`,
      `${categoryVariants[6]} ${locationVariants[4]}`,
    ];
    ddgQueries = [
      `${categoryVariants[4]} ${locationVariants[0]}`,
      `${categoryVariants[0]} ${locationVariants[3]}`,
    ];
  }

  const searchFns: (() => Promise<ScrapedBusiness[]>)[] = [];

  for (const query of bingQueries) {
    searchFns.push(() => searchBing(query, maxResults, category));
  }
  for (const query of ddgQueries) {
    searchFns.push(() => searchDuckDuckGo(query, maxResults, category));
  }
  searchFns.push(() => searchSocialMediaOnly(category, location, maxResults));
  if (page <= 2) {
    searchFns.push(() => searchGoogleMaps(category, location, maxResults));
    searchFns.push(() => searchYellowPages(category, location, maxResults));
    searchFns.push(() => searchYelp(category, location, maxResults));
  }
  searchFns.push(() => searchFacebookPages(category, location, maxResults));
  searchFns.push(() => searchBBB(category, location, maxResults));

  const apiFns: (() => Promise<ScrapedBusiness[]>)[] = [];
  apiFns.push(() => searchOpenStreetMap(category, location, maxResults));
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleApiKey) {
    apiFns.push(() => searchGooglePlaces(category, location, maxResults, googleApiKey));
  }

  const apiResults = await Promise.allSettled(apiFns.map((fn) => fn()));
  for (const result of apiResults) {
    if (result.status === "fulfilled") {
      businesses.push(...result.value);
    }
  }

  const BATCH_SIZE = 2;
  const THROTTLE_MS = 800;
  for (let i = 0; i < searchFns.length; i += BATCH_SIZE) {
    const batch = searchFns.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((fn) => fn()));
    for (const result of results) {
      if (result.status === "fulfilled") {
        businesses.push(...result.value);
      }
    }
    if (i + BATCH_SIZE < searchFns.length) {
      await delay(THROTTLE_MS);
    }
  }

  const byDomain = new Map<string, ScrapedBusiness>();
  const byName = new Map<string, ScrapedBusiness>();
  const byPhone = new Map<string, ScrapedBusiness>();
  const dedupedList: ScrapedBusiness[] = [];

  for (const biz of businesses) {
    const nameKey = normalizeName(biz.name);
    if (!nameKey || nameKey.length < 3) continue;
    const domain = biz.url ? extractDomain(biz.url) : null;
    const phoneKey = biz.phone ? normalizePhone(biz.phone) : null;

    let existing: ScrapedBusiness | undefined;
    if (domain) existing = byDomain.get(domain);
    if (!existing && phoneKey) existing = byPhone.get(phoneKey);
    if (!existing) existing = byName.get(nameKey);
    if (!existing) {
      const fuzzyMatch = findFuzzyNameMatch(nameKey, byName);
      if (fuzzyMatch) existing = fuzzyMatch;
    }

    if (existing) {
      mergeBusinessData(existing, biz);
      continue;
    }

    dedupedList.push(biz);
    byName.set(nameKey, biz);
    if (domain) byDomain.set(domain, biz);
    if (phoneKey) byPhone.set(phoneKey, biz);
  }

  const finalResults = dedupedList.slice(0, maxResults);

  searchCache.set(cacheKey, { results: finalResults, timestamp: Date.now() });
  pruneCache();
  console.log(`[Cache STORE] "${category}" in "${location}" p${page} — cached ${finalResults.length} results`);

  return finalResults;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(the|and|of|in|at|by|for|llc|inc|corp|co|ltd)\b/g, "")
    .replace(/\s+/g, "")
    .slice(0, 40);
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

function findFuzzyNameMatch(nameKey: string, byName: Map<string, ScrapedBusiness>): ScrapedBusiness | undefined {
  if (nameKey.length < 5) return undefined;
  for (const [existingKey, biz] of Array.from(byName.entries())) {
    if (existingKey.length < 5) continue;
    if (existingKey.includes(nameKey) || nameKey.includes(existingKey)) {
      const shorter = Math.min(nameKey.length, existingKey.length);
      const longer = Math.max(nameKey.length, existingKey.length);
      if (shorter / longer >= 0.75) {
        return biz;
      }
    }
    const similarity = calculateSimilarity(nameKey, existingKey);
    if (similarity > 0.85) {
      return biz;
    }
  }
  return undefined;
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer[i - 1] !== shorter[j - 1]) {
          newValue = Math.min(newValue, lastValue, costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]) / longer.length;
}

function mergeBusinessData(existing: ScrapedBusiness, incoming: ScrapedBusiness): void {
  if (!existing.phone && incoming.phone) existing.phone = incoming.phone;
  if (!existing.email && incoming.email) existing.email = incoming.email;
  if (!existing.address && incoming.address) existing.address = incoming.address;
  if ((!existing.description || existing.description.length < 20) && incoming.description && incoming.description.length > (existing.description?.length || 0)) {
    existing.description = incoming.description;
  }
  if (!existing.url && incoming.url) {
    existing.url = incoming.url;
    existing.hasWebsite = true;
  }
  if (incoming.socialMedia?.length) {
    if (!existing.socialMedia) existing.socialMedia = [];
    const platforms = new Set(existing.socialMedia.map(s => s.split(":")[0]));
    for (const s of incoming.socialMedia) {
      if (!platforms.has(s.split(":")[0])) {
        existing.socialMedia.push(s);
        platforms.add(s.split(":")[0]);
      }
    }
  }
}

async function searchSocialMediaOnly(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const queries = [
      `${category} ${location} facebook.com`,
      `${category} ${location} instagram.com`,
    ];

    for (let qi = 0; qi < queries.length; qi++) {
      if (qi > 0) await delay(600);
      const encodedQuery = encodeURIComponent(queries[qi]);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeout);

      if (response.status !== 200 && response.status !== 202) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $(".result").each((_i, el) => {
        if (results.length >= maxResults) return false;

        const linkEl = $(el).find(".result__a");
        let href = linkEl.attr("href") || "";
        const title = linkEl.text().trim();

        if (href.includes("uddg=")) {
          try {
            const urlParam = new URL(href, "https://duckduckgo.com").searchParams.get("uddg");
            if (urlParam) href = urlParam;
          } catch {}
        }

        const social = detectSocialMediaUrl(href);
        if (!social) return;

        let bizName = title
          .replace(/\s*[-|–—]\s*(Facebook|Instagram|Twitter|TikTok|LinkedIn|YouTube).*$/i, "")
          .replace(/\s*\|\s*(Facebook|Instagram|Twitter|TikTok|LinkedIn|YouTube).*$/i, "")
          .replace(/\s*on\s+(Facebook|Instagram|Twitter|TikTok)$/i, "")
          .trim();

        if (!bizName || bizName.length < 3 || bizName.length > 80) return;
        if (isListTitle(bizName, category)) return;

        const snippet = $(el).find(".result__snippet").text().trim();

        const existing = results.find(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, "") === bizName.toLowerCase().replace(/[^a-z0-9]/g, ""));
        if (existing) {
          if (!existing.socialMedia) existing.socialMedia = [];
          const platforms = new Set(existing.socialMedia.map(s => s.split(":")[0]));
          if (!platforms.has(social.split(":")[0])) {
            existing.socialMedia.push(social);
          }
          return;
        }

        results.push({
          name: bizName,
          url: "",
          description: snippet || undefined,
          hasWebsite: false,
          source: "social-search",
          socialMedia: [social],
        });
      });
    }
  } catch (err) {
    console.error("Social media search error:", err);
  }

  return results;
}

function processSearchResult(
  title: string,
  href: string,
  snippet: string,
  category: string
): ScrapedBusiness | null {
  const domain = extractDomain(href);
  if (!domain) return null;
  if (isExcludedDomain(domain)) return null;
  if (isAggregatorSite(domain)) return null;
  if (isListTitle(title, category)) return null;

  const bizName = cleanBusinessName(title);
  if (!bizName || bizName.length < 3 || bizName.length > 80) return null;

  return {
    name: bizName,
    url: normalizeUrl(href),
    description: snippet || undefined,
    hasWebsite: true,
    source: "web",
  };
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number,
  category: string
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    const status = response.status;
    if (status !== 200 && status !== 202) return results;

    const html = await response.text();
    const $ = cheerio.load(html);

    $(".result").each((_i, el) => {
      if (results.length >= maxResults * 2) return false;

      const linkEl = $(el).find(".result__a");
      const href = linkEl.attr("href") || "";
      const title = linkEl.text().trim();
      const snippet = $(el).find(".result__snippet").text().trim();

      let actualUrl = href;
      if (href.includes("uddg=")) {
        try {
          const urlParam = new URL(href, "https://duckduckgo.com").searchParams.get("uddg");
          if (urlParam) actualUrl = urlParam;
        } catch {}
      }

      if (actualUrl && title) {
        const biz = processSearchResult(title, actualUrl, snippet, category);
        if (biz) results.push(biz);
      }
    });

  } catch (err) {
    console.error("DuckDuckGo search error:", err);
  }

  return results;
}

async function searchBing(
  query: string,
  maxResults: number,
  category: string
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/search?q=${encodedQuery}&count=${Math.max(maxResults, 20)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        Connection: "keep-alive",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return results;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("li.b_algo").each((_i, el) => {
      if (results.length >= maxResults * 2) return false;

      const title = $(el).find("h2 a").text().trim();
      const snippet = $(el).find(".b_caption p, .b_lineclamp2").text().trim();

      const cite = $(el).find("cite").text().trim();
      const actualUrl = extractUrlFromCite(cite);

      if (actualUrl && title) {
        const biz = processSearchResult(title, actualUrl, snippet, category);
        if (biz) results.push(biz);
      }
    });

    $(".b_localList .b_scard, .b_ans .b_entityTP, [data-tag='BizRslt.Item']").each((_i, el) => {
      const name = $(el).find(".b_factrow a, .lc_content h2, .b_entityTitle").first().text().trim()
        || $(el).find("h2, h3, .title").first().text().trim();
      if (!name || name.length < 3) return;

      const addr = $(el).find(".b_address, .b_factrow:has(.b_vList)").first().text().trim()
        || $(el).find("[aria-label*='Address'], .lc_content .b_factrow").first().text().trim();
      const phone = $(el).find("a[href^='tel:']").first().text().trim();
      const link = $(el).find("a[href^='http']").first().attr("href") || "";
      const linkDomain = link ? extractDomain(link) : null;
      const isAgg = linkDomain && (isExcludedDomain(linkDomain) || isAggregatorSite(linkDomain));

      results.push({
        name: cleanBusinessName(name),
        url: isAgg ? "" : (link ? normalizeUrl(link) : ""),
        description: addr || undefined,
        hasWebsite: !!link && !isAgg,
        source: "bing-local",
        phone: phone || undefined,
        address: addr || undefined,
      });
    });

  } catch (err) {
    console.error("Bing search error:", err);
  }

  return results;
}

function extractUrlFromCite(cite: string): string {
  if (!cite) return "";
  let url = cite
    .replace(/\s*›\s*/g, "/")
    .replace(/\s+/g, "")
    .trim();

  if (!url.startsWith("http")) {
    url = "https://" + url;
  }

  try {
    new URL(url);
    return url;
  } catch {
    return "";
  }
}

const OSM_CATEGORY_MAP: Record<string, string[]> = {
  restaurant: ['amenity=restaurant'],
  "pizza shop": ['amenity=restaurant', 'cuisine=pizza'],
  cafe: ['amenity=cafe'],
  "coffee shop": ['amenity=cafe'],
  bar: ['amenity=bar', 'amenity=pub'],
  bakery: ['shop=bakery'],
  "food truck": ['amenity=fast_food'],
  "hair salon": ['shop=hairdresser'],
  "barber shop": ['shop=hairdresser'],
  barber: ['shop=hairdresser'],
  "nail salon": ['shop=beauty'],
  spa: ['leisure=spa', 'shop=beauty'],
  "tattoo shop": ['shop=tattoo'],
  dentist: ['amenity=dentist'],
  chiropractor: ['amenity=doctors'],
  veterinarian: ['amenity=veterinary'],
  "auto repair shop": ['shop=car_repair'],
  "auto detailing": ['shop=car_repair'],
  "towing service": ['shop=car_repair'],
  mechanic: ['shop=car_repair'],
  plumber: ['craft=plumber'],
  electrician: ['craft=electrician'],
  "hvac company": ['craft=hvac'],
  hvac: ['craft=hvac'],
  "roofing company": ['craft=roofer'],
  landscaping: ['craft=gardener'],
  "cleaning service": ['shop=dry_cleaning'],
  "pest control": ['craft=pest_control'],
  "moving company": ['shop=storage_rental'],
  gym: ['leisure=fitness_centre'],
  "yoga studio": ['leisure=fitness_centre'],
  "martial arts": ['leisure=fitness_centre'],
  "dance studio": ['leisure=dance'],
  daycare: ['amenity=kindergarten', 'amenity=childcare'],
  "dog groomer": ['shop=pet_grooming'],
  "pet boarding": ['amenity=animal_boarding'],
  florist: ['shop=florist'],
  photographer: ['craft=photographer'],
  "jewelry store": ['shop=jewelry'],
  "dry cleaner": ['shop=dry_cleaning'],
  "print shop": ['shop=copyshop'],
  accountant: ['office=accountant'],
  "insurance agency": ['office=insurance'],
  "real estate agent": ['office=estate_agent'],
  lawyer: ['office=lawyer'],
  pharmacy: ['amenity=pharmacy'],
  bank: ['amenity=bank'],
  hotel: ['tourism=hotel'],
};

interface LocationData {
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  coordinates?: { lat: number; lon: number };
  formatted: string;
  confidence: number;
}

interface GeoCacheEntry {
  data: LocationData;
  timestamp: number;
}

const geoCache = new Map<string, GeoCacheEntry>();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getGeoCacheKey(location: string): string {
  return location.toLowerCase().trim().replace(/\s+/g, ' ');
}

function pruneGeoCache(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(geoCache.entries())) {
    if (now - entry.timestamp > GEO_CACHE_TTL_MS) {
      geoCache.delete(key);
    }
  }
}

function parseLocationString(location: string): Partial<LocationData> {
  const cleaned = location.trim().replace(/\s+/g, ' ');
  const result: Partial<LocationData> = { formatted: cleaned };
  
  // Zip code patterns
  const zipMatch = cleaned.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zipMatch) {
    result.zipCode = zipMatch[1];
  }
  
  // State patterns (2-letter abbreviations and full names)
  const statePatterns = [
    /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/,
    /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new\s+hampshire|new\s+jersey|new\s+mexico|new\s+york|north\s+carolina|north\s+dakota|ohio|oklahoma|oregon|pennsylvania|rhode\s+island|south\s+carolina|south\s+dakota|tennessee|texas|utah|vermont|virginia|washington|west\s+virginia|wisconsin|wyoming)\b/i
  ];
  
  for (const pattern of statePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      result.state = match[1].toUpperCase();
      break;
    }
  }
  
  // City patterns (before comma or state)
  const parts = cleaned.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // Format: "City, State" or "City, State Zip"
    result.city = parts[0];
    if (!result.state && parts[1]) {
      const stateFromParts = parts[1].match(/^([A-Z]{2}|[a-zA-Z\s]+)/);
      if (stateFromParts) {
        result.state = stateFromParts[1].toUpperCase();
      }
    }
  } else if (parts.length === 1) {
    // Single part - try to extract city/state
    const words = parts[0].split(' ');
    if (words.length >= 2 && !result.zipCode) {
      // Likely "City State" format
      result.city = words.slice(0, -1).join(' ');
      result.state = words[words.length - 1].toUpperCase();
    } else if (!result.state && !result.zipCode) {
      // Single city or state
      result.city = parts[0];
    }
  }
  
  return result;
}

function validateUSLocation(location: LocationData): boolean {
  // Must have at least a city or state
  if (!location.city && !location.state) return false;
  
  // If state is provided, it must be a valid US state
  if (location.state) {
    const validStates = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']);
    const stateAbbr = location.state.length === 2 ? location.state : location.state.substring(0, 2).toUpperCase();
    if (!validStates.has(stateAbbr)) return false;
  }
  
  return true;
}

function calculateLocationConfidence(location: LocationData): number {
  let confidence = 0;
  
  if (location.coordinates) confidence += 40;
  if (location.city) confidence += 25;
  if (location.state) confidence += 25;
  if (location.zipCode) confidence += 10;
  
  return Math.min(confidence, 100);
}

async function geocodeLocationMultipleProviders(location: string): Promise<LocationData | null> {
  const parsed = parseLocationString(location);
  if (!parsed.city && !parsed.state && !parsed.zipCode) {
    return null;
  }
  
  const locationData: LocationData = {
    ...parsed,
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    formatted: parsed.formatted || location,
    confidence: 0
  };
  
  // Try multiple geocoding providers in order
  const providers = [
    geocodeWithNominatim,
    geocodeWithOpenCage,
    geocodeWithMapBox
  ];
  
  for (const provider of providers) {
    try {
      const coords = await provider(locationData);
      if (coords) {
        locationData.coordinates = coords;
        locationData.confidence = calculateLocationConfidence(locationData);
        break;
      }
    } catch (error) {
      console.warn(`Geocoding provider failed for ${location}:`, error);
    }
  }
  
  // Validate final location
  if (!validateUSLocation(locationData)) {
    return null;
  }
  
  return locationData;
}

async function geocodeWithNominatim(locationData: LocationData): Promise<{ lat: number; lon: number } | null> {
  const queries = [];
  
  if (locationData.city && locationData.state) {
    queries.push(`${locationData.city}, ${locationData.state}`);
    queries.push(`${locationData.city} ${locationData.state}`);
  }
  if (locationData.city && !locationData.state) {
    queries.push(locationData.city);
  }
  if (locationData.zipCode) {
    queries.push(locationData.zipCode);
  }
  
  for (const query of queries) {
    try {
      const encodedLoc = encodeURIComponent(query);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedLoc}&format=json&limit=1&countrycodes=us`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "FunnelFox/1.0 (lead-discovery-app)",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json() as any[];
      if (data.length === 0) continue;

      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

async function geocodeWithOpenCage(locationData: LocationData): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) return null;
  
  const queries = [];
  
  if (locationData.city && locationData.state) {
    queries.push(`${locationData.city}, ${locationData.state}, USA`);
  }
  if (locationData.zipCode) {
    queries.push(`${locationData.zipCode}, USA`);
  }
  
  for (const query of queries) {
    try {
      const encodedLoc = encodeURIComponent(query);
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedLoc}&key=${apiKey}&countrycode=us&limit=1`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "FunnelFox/1.0 (lead-discovery-app)",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json() as any;
      if (data.status.code !== 200 || !data.results?.length) continue;

      const result = data.results[0];
      return { lat: result.geometry.lat, lon: result.geometry.lng };
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

async function geocodeWithMapBox(locationData: LocationData): Promise<{ lat: number; lon: number } | null> {
  const apiKey = process.env.MAPBOX_API_KEY;
  if (!apiKey) return null;
  
  const queries = [];
  
  if (locationData.city && locationData.state) {
    queries.push(`${locationData.city} ${locationData.state}`);
  }
  if (locationData.zipCode) {
    queries.push(locationData.zipCode);
  }
  
  for (const query of queries) {
    try {
      const encodedLoc = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedLoc}.json?country=us&limit=1&access_token=${apiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "FunnelFox/1.0 (lead-discovery-app)",
        },
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const data = await response.json() as any;
      if (!data.features?.length) continue;

      const result = data.features[0];
      return { lat: result.center[1], lon: result.center[0] };
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = getGeoCacheKey(location);
  const cached = geoCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL_MS) {
    return cached.data.coordinates || null;
  }
  
  const locationData = await geocodeLocationMultipleProviders(location);
  
  if (locationData) {
    geoCache.set(cacheKey, {
      data: locationData,
      timestamp: Date.now()
    });
    pruneGeoCache();
    return locationData.coordinates || null;
  }
  
  return null;
}

function getOptimalSearchRadius(locationData: LocationData, category: string): number {
  // Dynamic radius based on location type and business category
  let baseRadius = 15000; // 15km default
  
  // Adjust for location type
  if (locationData.zipCode) {
    baseRadius = 8000; // Smaller radius for zip codes (more precise)
  } else if (locationData.city && locationData.state) {
    baseRadius = 20000; // Larger radius for city/state searches
  } else if (locationData.city && !locationData.state) {
    baseRadius = 12000; // Medium for city only
  }
  
  // Adjust for business type
  const serviceCategories = ['plumber', 'electrician', 'hvac', 'roofer', 'landscaping', 'cleaning', 'pest control', 'moving company'];
  const retailCategories = ['restaurant', 'cafe', 'bakery', 'bar', 'shop', 'store'];
  const professionalCategories = ['lawyer', 'accountant', 'dentist', 'doctor', 'veterinarian'];
  
  if (serviceCategories.some(cat => category.toLowerCase().includes(cat))) {
    baseRadius *= 1.3; // Service businesses need larger radius
  } else if (retailCategories.some(cat => category.toLowerCase().includes(cat))) {
    baseRadius *= 0.8; // Retail needs smaller radius (more local)
  } else if (professionalCategories.some(cat => category.toLowerCase().includes(cat))) {
    baseRadius *= 1.1; // Professional services moderate radius
  }
  
  // Adjust for confidence in location data
  if (locationData.confidence && locationData.confidence < 60) {
    baseRadius *= 1.5; // Larger radius for uncertain locations
  }
  
  return Math.round(baseRadius);
}

async function searchOpenStreetMap(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    // Get enhanced location data
    const cacheKey = getGeoCacheKey(location);
    let locationData: LocationData | null = null;
    
    const cached = geoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL_MS) {
      locationData = cached.data;
    } else {
      locationData = await geocodeLocationMultipleProviders(location);
      if (locationData) {
        geoCache.set(cacheKey, {
          data: locationData,
          timestamp: Date.now()
        });
        pruneGeoCache();
      }
    }
    
    if (!locationData?.coordinates) {
      console.warn(`Could not geocode location: ${location}`);
      return results;
    }

    const catLower = category.toLowerCase();
    let osmTags = OSM_CATEGORY_MAP[catLower];
    if (!osmTags) {
      for (const [key, tags] of Object.entries(OSM_CATEGORY_MAP)) {
        if (catLower.includes(key) || key.includes(catLower)) {
          osmTags = tags;
          break;
        }
      }
    }
    
    // Use dynamic radius based on location and business type
    const radius = getOptimalSearchRadius(locationData, category);
    let tagFilters: string;

    if (!osmTags) {
      tagFilters = `node["name"~"${category}",i](around:${radius},${locationData.coordinates!.lat},${locationData.coordinates!.lon});\nway["name"~"${category}",i](around:${radius},${locationData.coordinates!.lat},${locationData.coordinates!.lon});`;
    } else {
      tagFilters = osmTags.map((tag) => {
        const eqIdx = tag.indexOf("=");
        if (eqIdx < 0) return "";
        const key = tag.slice(0, eqIdx);
        const val = tag.slice(eqIdx + 1);
        return `node["${key}"="${val}"](around:${radius},${locationData.coordinates!.lat},${locationData.coordinates!.lon});\nway["${key}"="${val}"](around:${radius},${locationData.coordinates!.lat},${locationData.coordinates!.lon});`;
      }).filter(Boolean).join("\n");
    }

    const query = `[out:json][timeout:25];(\n${tagFilters}\n);out body ${maxResults * 3};`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "FunnelFox/1.0 (lead-discovery-app)",
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    clearTimeout(timeout);

    if (!response.ok) return results;

    const data = await response.json() as any;
    const elements = data.elements || [];

    for (const el of elements) {
      if (results.length >= maxResults) break;
      const tags = el.tags || {};
      const name = tags.name;
      if (!name || name.length < 3) continue;

      if (osmTags) {
        const hasMatchingTag = osmTags.some((tag) => {
          const eqIdx = tag.indexOf("=");
          if (eqIdx < 0) return false;
          const k = tag.slice(0, eqIdx);
          const v = tag.slice(eqIdx + 1);
          return tags[k] === v;
        });
        if (!hasMatchingTag) continue;
      }

      const website = tags.website || tags["contact:website"] || "";
      const phone = tags.phone || tags["contact:phone"] || "";
      const emailTag = tags.email || tags["contact:email"] || "";
      const street = tags["addr:street"] || "";
      const houseNum = tags["addr:housenumber"] || "";
      const city = tags["addr:city"] || locationData.city || "";
      const state = tags["addr:state"] || locationData.state || "";

      let address = "";
      if (street) {
        address = houseNum ? `${houseNum} ${street}` : street;
        if (city) address += `, ${city}`;
        if (state) address += `, ${state}`;
      } else if (city) {
        address = state ? `${city}, ${state}` : city;
      }

      const cuisine = tags.cuisine ? `Cuisine: ${tags.cuisine}` : "";

      results.push({
        name,
        url: website ? normalizeUrl(website) : "",
        description: [address, cuisine].filter(Boolean).join(" | ") || undefined,
        hasWebsite: !!website,
        source: "openstreetmap",
        phone: phone || undefined,
        email: emailTag || undefined,
        address: address || undefined,
      });
    }
  } catch (err) {
    console.error("OpenStreetMap search error:", err);
  }

  return results;
}

async function searchGooglePlaces(
  category: string,
  location: string,
  maxResults: number,
  apiKey: string
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    // Get enhanced location data for better search
    const cacheKey = getGeoCacheKey(location);
    let locationData: LocationData | null = null;
    
    const cached = geoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL_MS) {
      locationData = cached.data;
    } else {
      locationData = await geocodeLocationMultipleProviders(location);
      if (locationData) {
        geoCache.set(cacheKey, {
          data: locationData,
          timestamp: Date.now()
        });
        pruneGeoCache();
      }
    }
    
    // Build better search queries
    const searchQueries = [];
    
    if (locationData?.city && locationData?.state) {
      searchQueries.push(`${category} in ${locationData.city}, ${locationData.state}`);
      searchQueries.push(`${category} ${locationData.city} ${locationData.state}`);
    } else if (locationData?.city) {
      searchQueries.push(`${category} in ${locationData.city}`);
    } else {
      searchQueries.push(`${category} in ${location}`);
    }
    
    // Try each query until we get results
    for (const textQuery of searchQueries) {
      if (results.length >= maxResults) break;
      
      const url = `https://places.googleapis.com/v1/places:searchText`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.primaryType,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: Math.min(maxResults - results.length, 20),
          languageCode: "en",
          includedType: getGooglePlacesType(category),
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        console.error("Google Places API error:", response.status, await response.text());
        continue;
      }

      const data = await response.json() as any;
      const places = data.places || [];

      for (const place of places) {
        if (results.length >= maxResults) break;
        const name = place.displayName?.text;
        if (!name || name.length < 3) continue;

        const website = place.websiteUri || "";
        const phone = place.nationalPhoneNumber || "";
        const address = place.formattedAddress || "";
        const rating = place.rating;
        const reviewCount = place.userRatingCount;

        if (website) {
          const domain = extractDomain(website);
          if (domain && (isExcludedDomain(domain) || isAggregatorSite(domain))) continue;
        }

        const descriptionParts = [address];
        if (rating && reviewCount) {
          descriptionParts.push(`Rating: ${rating.toFixed(1)} (${reviewCount.toLocaleString()} reviews)`);
        }

        results.push({
          name,
          url: website ? normalizeUrl(website) : "",
          description: descriptionParts.filter(Boolean).join(" | ") || undefined,
          hasWebsite: !!website,
          source: "google-places",
          phone: phone || undefined,
          address: address || undefined,
          googleRating: rating,
          googleReviewCount: reviewCount,
        });
      }
      
      // If we got results from this query, don't try others
      if (data.places?.length > 0) break;
    }
  } catch (err) {
    console.error("Google Places search error:", err);
  }

  return results;
}

function getGooglePlacesType(category: string): string | undefined {
  const categoryMap: Record<string, string> = {
    'restaurant': 'restaurant',
    'pizza': 'restaurant',
    'cafe': 'cafe',
    'coffee': 'cafe',
    'bar': 'bar',
    'bakery': 'bakery',
    'hair salon': 'hair_care',
    'barber': 'hair_care',
    'nail salon': 'beauty_salon',
    'spa': 'spa',
    'dentist': 'dentist',
    'doctor': 'doctor',
    'veterinarian': 'veterinary_care',
    'auto repair': 'car_repair',
    'mechanic': 'car_repair',
    'plumber': 'plumber',
    'electrician': 'electrician',
    'gym': 'gym',
    'yoga': 'gym',
    'pharmacy': 'pharmacy',
    'bank': 'bank',
    'hotel': 'lodging',
    'lawyer': 'lawyer',
    'accountant': 'accounting',
    'insurance': 'insurance_agency',
    'real estate': 'real_estate_agency',
  };
  
  const lower = category.toLowerCase();
  for (const [key, type] of Object.entries(categoryMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      return type;
    }
  }
  
  return undefined;
}

async function searchGoogleMaps(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const queries = [
      `${category} ${location} site:google.com/maps`,
      `${category} near ${location} google maps`,
    ];

    for (let qi = 0; qi < queries.length; qi++) {
      if (qi > 0) await delay(600);
      if (results.length >= maxResults) break;

      const encodedQuery = encodeURIComponent(queries[qi]);
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(ddgUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": getRandomUA(),
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) continue;

        const html = await response.text();
        const $ = cheerio.load(html);

        $(".result").each((_i, el) => {
          if (results.length >= maxResults) return false;

          const title = $(el).find(".result__a").text().trim();
          const snippet = $(el).find(".result__snippet").text().trim();

          let bizName = title
            .replace(/\s*[-–—|·]\s*(Google Maps|Maps|Google).*$/i, "")
            .replace(/\s*·\s*Google Maps$/i, "")
            .replace(/\s*-\s*Google$/i, "")
            .trim();

          if (!bizName || bizName.length < 3 || bizName.length > 80) return;
          if (isListTitle(bizName, category)) return;

          bizName = cleanBusinessName(bizName);
          if (!bizName || bizName.length < 3) return;

          const existing = results.find((r) => normalizeName(r.name) === normalizeName(bizName));

          const phoneMatch = snippet.match(/(\(\d{3}\)\s*\d{3}[\s-]?\d{4}|\d{3}[\s.-]\d{3}[\s.-]\d{4})/);
          const addrMatch = snippet.match(/(\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Hwy)\b[^,]*(?:,\s*[A-Z][a-zA-Z\s]+)?)/i);
          const websiteMatch = snippet.match(/(?:website|web)\s*:\s*(https?:\/\/[^\s,]+)/i);

          if (existing) {
            if (!existing.phone && phoneMatch) existing.phone = phoneMatch[1];
            if (!existing.address && addrMatch) existing.address = addrMatch[1];
            if (!existing.url && websiteMatch) {
              const domain = extractDomain(websiteMatch[1]);
              if (domain && !isExcludedDomain(domain) && !isAggregatorSite(domain)) {
                existing.url = normalizeUrl(websiteMatch[1]);
                existing.hasWebsite = true;
              }
            }
            return;
          }

          let website = "";
          let hasWebsite = false;
          if (websiteMatch) {
            const domain = extractDomain(websiteMatch[1]);
            if (domain && !isExcludedDomain(domain) && !isAggregatorSite(domain)) {
              website = normalizeUrl(websiteMatch[1]);
              hasWebsite = true;
            }
          }

          results.push({
            name: bizName,
            url: website,
            hasWebsite,
            source: "google-maps",
            phone: phoneMatch ? phoneMatch[1] : undefined,
            address: addrMatch ? addrMatch[1] : undefined,
          });
        });
      } catch {
        clearTimeout(timeout);
      }
    }
  } catch (err) {
    console.error("Google Maps search error:", err);
  }

  return results;
}

async function searchYellowPages(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const searchTerm = encodeURIComponent(category);
    const geoLocation = encodeURIComponent(location);
    const url = `https://www.yellowpages.com/search?search_terms=${searchTerm}&geo_location_terms=${geoLocation}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return results;

    const html = await response.text();
    const $ = cheerio.load(html);

    $(".result").each((_i, el) => {
      if (results.length >= maxResults) return false;

      const name = $(el).find(".business-name a, .business-name span").first().text().trim();
      if (!name || name.length < 3 || name.length > 80) return;

      const phone = $(el).find(".phones.phone.primary").text().trim();
      const street = $(el).find(".street-address").text().trim();
      const locality = $(el).find(".locality").text().trim();
      const address = [street, locality].filter(Boolean).join(", ");

      const websiteLink = $(el).find("a.track-visit-website").attr("href") || "";
      let website = "";
      if (websiteLink && !websiteLink.includes("yellowpages.com")) {
        website = websiteLink;
        const domain = extractDomain(website);
        if (domain && (isExcludedDomain(domain) || isAggregatorSite(domain))) {
          website = "";
        }
      }

      const categories = $(el).find(".categories a").map((_j, catEl) => $(catEl).text().trim()).get().join(", ");

      results.push({
        name: cleanBusinessName(name),
        url: website ? normalizeUrl(website) : "",
        description: categories || address || undefined,
        hasWebsite: !!website,
        source: "yellowpages",
        phone: phone || undefined,
        address: address || undefined,
      });
    });

    if (results.length === 0) {
      $(".organic .srp-listing, .search-results .v-card").each((_i, el) => {
        if (results.length >= maxResults) return false;

        const name = $(el).find("a.business-name, h2.n a").first().text().trim();
        if (!name || name.length < 3) return;

        const phone = $(el).find(".phone, .phones").first().text().trim();
        const addr = $(el).find(".adr, .address").first().text().trim();

        results.push({
          name: cleanBusinessName(name),
          url: "",
          hasWebsite: false,
          source: "yellowpages",
          phone: phone || undefined,
          address: addr || undefined,
        });
      });
    }
  } catch (err) {
    console.error("Yellow Pages search error:", err);
  }

  if (results.length < maxResults / 2) {
    try {
      await delay(600);
      const ddgQuery = encodeURIComponent(`${category} ${location} site:yellowpages.com`);
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${ddgQuery}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(ddgUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        $(".result").each((_i, el) => {
          if (results.length >= maxResults) return false;

          const title = $(".result__a", el).text().trim();
          const snippet = $(".result__snippet", el).text().trim();

          let bizName = title
            .replace(/\s*[-–—|]\s*(Yellow\s*Pages|YP|yellowpages\.com).*$/i, "")
            .replace(/\s*in\s+[A-Z][a-zA-Z\s,]+$/i, "")
            .trim();

          if (!bizName || bizName.length < 3 || bizName.length > 80) return;
          if (isListTitle(bizName, category)) return;
          bizName = cleanBusinessName(bizName);

          const existing = results.find((r) => normalizeName(r.name) === normalizeName(bizName));
          if (existing) return;

          const phoneMatch = snippet.match(/(\(\d{3}\)\s*\d{3}[\s-]?\d{4}|\d{3}[\s.-]\d{3}[\s.-]\d{4})/);
          const addrMatch = snippet.match(/(\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Hwy)\b[^,]*)/i);

          results.push({
            name: bizName,
            url: "",
            hasWebsite: false,
            source: "yellowpages",
            phone: phoneMatch ? phoneMatch[1] : undefined,
            address: addrMatch ? addrMatch[1] : undefined,
          });
        });
      }
    } catch (err) {
      console.error("Yellow Pages DDG fallback error:", err);
    }
  }

  return results;
}

async function searchYelp(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const encodedLoc = encodeURIComponent(location);
    const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(category)}&find_loc=${encodedLoc}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(yelpUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Yelp returned ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    $('[data-testid="serp-ia-card"], .container__09f24__FeTO6, .arrange-unit__09f24__rqHTg').each((_i, el) => {
      if (results.length >= maxResults) return false;

      const nameEl = $(el).find('a[href*="/biz/"], h3 a, .css-19v1rkv').first();
      const name = nameEl.text().trim().replace(/^\d+\.\s*/, "");
      if (!name || name.length < 3) return;

      const phone = $(el).find('a[href^="tel:"]').first().text().trim() ||
        $(el).find('.css-chan6m, [class*="phone"]').first().text().trim();
      const addr = $(el).find('.css-qyp8bo, [class*="address"], .raw__09f24__T4Ezm').first().text().trim();
      const ratingText = $(el).find('[aria-label*="star"], .css-gutk1c').first().attr("aria-label") || "";
      const reviewCount = $(el).find('.css-chan6m').last().text().trim();

      let websiteUrl = "";
      $(el).find('a[href]').each((_j, linkEl) => {
        const href = $(linkEl).attr("href") || "";
        if (href.includes("biz_redir") && href.includes("website")) {
          try {
            const urlParam = new URL(href, "https://www.yelp.com").searchParams.get("url");
            if (urlParam) websiteUrl = urlParam;
          } catch {}
        }
      });

      const description = [
        ratingText ? ratingText.replace(/\s+/g, " ").trim() : "",
        reviewCount && reviewCount.includes("review") ? reviewCount : "",
        addr || "",
      ].filter(Boolean).join(" - ");

      results.push({
        name: cleanBusinessName(name),
        url: websiteUrl || "",
        hasWebsite: !!websiteUrl,
        source: "yelp",
        phone: phone || undefined,
        address: addr || undefined,
        description: description || undefined,
      });
    });

    if (results.length === 0) {
      const scriptTags = $('script[type="application/json"]');
      scriptTags.each((_i, el) => {
        if (results.length >= maxResults) return false;
        try {
          const jsonText = $(el).html() || "";
          if (!jsonText.includes("searchPageProps") && !jsonText.includes("bizName")) return;
          const data = JSON.parse(jsonText);
          const businesses = extractYelpJsonBusinesses(data);
          for (const biz of businesses) {
            if (results.length >= maxResults) break;
            results.push(biz);
          }
        } catch {}
      });
    }
  } catch (err) {
    console.error("Yelp direct search error:", err);
  }

  if (results.length < maxResults / 2) {
    try {
      await delay(600);
      const ddgQuery = encodeURIComponent(`${category} ${location} site:yelp.com`);
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${ddgQuery}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(ddgUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);

        $(".result").each((_i, el) => {
          if (results.length >= maxResults) return false;

          const title = $(".result__a", el).text().trim();
          const snippet = $(".result__snippet", el).text().trim();

          let bizName = title
            .replace(/\s*[-–—|]\s*(Yelp|yelp\.com).*$/i, "")
            .replace(/\s*-\s*Updated\s+\d{4}.*$/i, "")
            .replace(/\s*in\s+[A-Z][a-zA-Z\s,]+$/i, "")
            .trim();

          if (!bizName || bizName.length < 3 || bizName.length > 80) return;
          if (isListTitle(bizName, category)) return;
          bizName = cleanBusinessName(bizName);

          const existing = results.find((r) => normalizeName(r.name) === normalizeName(bizName));
          if (existing) return;

          const phoneMatch = snippet.match(/(\(\d{3}\)\s*\d{3}[\s-]?\d{4}|\d{3}[\s.-]\d{3}[\s.-]\d{4})/);
          const addrMatch = snippet.match(/(\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Hwy)\b[^,]*)/i);

          results.push({
            name: bizName,
            url: "",
            hasWebsite: false,
            source: "yelp",
            phone: phoneMatch ? phoneMatch[1] : undefined,
            address: addrMatch ? addrMatch[1] : undefined,
            description: snippet.slice(0, 200) || undefined,
          });
        });
      }
    } catch (err) {
      console.error("Yelp DDG fallback error:", err);
    }
  }

  return results;
}

function extractYelpJsonBusinesses(data: any): ScrapedBusiness[] {
  const results: ScrapedBusiness[] = [];
  const seenNames = new Set<string>();
  try {
    const search = (obj: any, depth: number): void => {
      if (!obj || typeof obj !== "object" || depth > 8) return;
      if (obj.bizName || (obj.name && (obj.phone || obj.displayPhone || obj.addressLines || obj.rating || obj.reviewCount))) {
        const name = obj.bizName || obj.name;
        if (typeof name === "string" && name.length >= 3 && name.length <= 80) {
          const normalized = normalizeName(name);
          if (seenNames.has(normalized)) return;
          const hasContactInfo = obj.phone || obj.displayPhone || obj.addressLines || obj.address;
          if (!hasContactInfo && !obj.rating && !obj.reviewCount) return;
          seenNames.add(normalized);
          results.push({
            name: cleanBusinessName(name),
            url: obj.website || "",
            hasWebsite: !!obj.website,
            source: "yelp",
            phone: obj.phone || obj.displayPhone || undefined,
            address: obj.addressLines?.join(", ") || obj.address || undefined,
            description: obj.categories?.map((c: any) => c.title || c).join(", ") || undefined,
          });
        }
      }
      if (Array.isArray(obj)) {
        for (const item of obj) search(item, depth + 1);
      } else {
        for (const val of Object.values(obj)) search(val, depth + 1);
      }
    };
    search(data, 0);
  } catch {}
  return results;
}

async function searchFacebookPages(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const queries = [
      `${category} ${location} site:facebook.com -"log in" -"sign up"`,
      `${category} ${location} site:instagram.com`,
    ];

    for (let qi = 0; qi < queries.length; qi++) {
      if (qi > 0) await delay(600);

      const encodedQuery = encodeURIComponent(queries[qi]);
      const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      clearTimeout(timeout);

      if (response.status !== 200 && response.status !== 202) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $(".result").each((_i, el) => {
        if (results.length >= maxResults) return false;

        const linkEl = $(el).find(".result__a");
        let href = linkEl.attr("href") || "";
        const title = linkEl.text().trim();
        const snippet = $(el).find(".result__snippet").text().trim();

        if (href.includes("uddg=")) {
          try {
            const urlParam = new URL(href, "https://duckduckgo.com").searchParams.get("uddg");
            if (urlParam) href = urlParam;
          } catch {}
        }

        const isFacebook = href.includes("facebook.com");
        const isInstagram = href.includes("instagram.com");
        if (!isFacebook && !isInstagram) return;

        if (href.includes("/login") || href.includes("/signup") || href.includes("/help") ||
            href.includes("/watch") || href.includes("/groups") || href.includes("/events") ||
            href.includes("/marketplace") || href.includes("/pages/category") ||
            href.includes("/reel/") || href.includes("/stories/")) return;

        let bizName = title
          .replace(/\s*[-|–—]\s*(Facebook|Instagram|Meta|Home|About|Photos|Videos|Posts|Reels).*$/i, "")
          .replace(/\s*\|\s*(Facebook|Instagram).*$/i, "")
          .replace(/\s*on\s+(Facebook|Instagram)$/i, "")
          .replace(/^(Facebook|Instagram)\s*[-–—|]\s*/i, "")
          .replace(/@\w+\s*[-·]\s*/i, "")
          .trim();

        if (!bizName || bizName.length < 3 || bizName.length > 80) return;
        if (isListTitle(bizName, category)) return;
        if (/^(log\s*in|sign\s*up|facebook|instagram|meta)\s*$/i.test(bizName)) return;

        const social = detectSocialMediaUrl(href);
        if (!social) return;

        const existing = results.find(r =>
          normalizeName(r.name) === normalizeName(bizName)
        );
        if (existing) {
          if (!existing.socialMedia) existing.socialMedia = [];
          const platforms = new Set(existing.socialMedia.map(s => s.split(":")[0]));
          if (!platforms.has(social.split(":")[0])) {
            existing.socialMedia.push(social);
          }
          return;
        }

        const phoneMatch = snippet.match(/(\(\d{3}\)\s*\d{3}[\s-]?\d{4}|\d{3}[\s.-]\d{3}[\s.-]\d{4})/);
        const addrMatch = snippet.match(/(\d+\s+[A-Z][a-zA-Z\s]+(?:St|Ave|Blvd|Dr|Rd|Ln|Way|Ct|Pl|Hwy)\b[^,]*)/i);

        results.push({
          name: cleanBusinessName(bizName),
          url: "",
          description: snippet.slice(0, 200) || undefined,
          hasWebsite: false,
          source: isFacebook ? "facebook" : "instagram",
          socialMedia: [social],
          phone: phoneMatch ? phoneMatch[1] : undefined,
          address: addrMatch ? addrMatch[1] : undefined,
        });
      });
    }
  } catch (err) {
    console.error("Facebook/Instagram search error:", err);
  }

  return results;
}

async function searchBBB(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const encodedCategory = encodeURIComponent(category);
    const encodedLocation = encodeURIComponent(location);
    const url = `https://www.bbb.org/search?find_country=US&find_text=${encodedCategory}&find_loc=${encodedLocation}&find_type=Category&page=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return results;

    const html = await response.text();
    const $ = cheerio.load(html);

    $('[data-testid="search-result"], .search-result-card, .result-item, .bds-card, [class*="result"]').each((_i, el) => {
      if (results.length >= maxResults) return false;

      const nameEl = $(el).find('a.text-blue-medium, a[class*="business-name"], h3 a, h4 a, .result-name a, a[href*="/profile/"]').first();
      const name = nameEl.text().trim() || $(el).find('h3, h4, .name, [class*="name"]').first().text().trim();
      if (!name || name.length < 3 || name.length > 80) return;
      if (isListTitle(name, category)) return;

      const ratingEl = $(el).find('[class*="rating"], .bds-rating, [data-rating], .letter-grade, [class*="grade"]').first();
      let bbbRating = ratingEl.text().trim() || ratingEl.attr("data-rating") || "";
      const ratingMatch = bbbRating.match(/([A-F][+-]?)/i);
      if (ratingMatch) {
        bbbRating = ratingMatch[1].toUpperCase();
      } else {
        bbbRating = "";
      }

      const accreditedEl = $(el).find('[class*="accredit"], .accredited, [data-accredited]');
      const accreditedText = accreditedEl.text().toLowerCase();
      const bbbAccredited = accreditedText.includes("accredited") ||
        accreditedEl.length > 0 && !accreditedText.includes("not accredited");

      const phone = $(el).find('a[href^="tel:"], .phone, [class*="phone"]').first().text().trim();
      const address = $(el).find('.address, [class*="address"], .location').first().text().trim();

      let websiteUrl = "";
      $(el).find('a[href]').each((_j, linkEl) => {
        const href = $(linkEl).attr("href") || "";
        if (href.startsWith("http") && !href.includes("bbb.org")) {
          const domain = extractDomain(href);
          if (domain && !isExcludedDomain(domain) && !isAggregatorSite(domain)) {
            websiteUrl = normalizeUrl(href);
          }
        }
      });

      results.push({
        name: cleanBusinessName(name),
        url: websiteUrl,
        hasWebsite: !!websiteUrl,
        source: "bbb",
        phone: phone || undefined,
        address: address || undefined,
        bbbRating: bbbRating || undefined,
        bbbAccredited: bbbAccredited || undefined,
      });
    });

    if (results.length === 0) {
      $('a[href*="/profile/"]').each((_i, el) => {
        if (results.length >= maxResults) return false;

        const name = $(el).text().trim();
        if (!name || name.length < 3 || name.length > 80) return;
        if (isListTitle(name, category)) return;

        const parentEl = $(el).closest('div, li, article');
        const phone = parentEl.find('a[href^="tel:"]').first().text().trim();
        const address = parentEl.find('.address, [class*="address"]').first().text().trim();

        const existing = results.find(r => normalizeName(r.name) === normalizeName(name));
        if (existing) return;

        results.push({
          name: cleanBusinessName(name),
          url: "",
          hasWebsite: false,
          source: "bbb",
          phone: phone || undefined,
          address: address || undefined,
        });
      });
    }
  } catch (err) {
    console.error("BBB search error:", err);
  }

  return results;
}

async function scrapeGoogleBusinessRating(
  businessName: string,
  location: string
): Promise<{ rating: number | null; reviewCount: number | null }> {
  try {
    const query = encodeURIComponent(`"${businessName}" "${location}" site:google.com/maps`);
    const url = `https://html.duckduckgo.com/html/?q=${query}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return { rating: null, reviewCount: null };

    const html = await response.text();
    const $ = cheerio.load(html);

    let rating: number | null = null;
    let reviewCount: number | null = null;

    $(".result").each((_i, el) => {
      if (rating !== null) return false;

      const snippet = $(el).find(".result__snippet").text().trim();
      const title = $(el).find(".result__a").text().trim();
      const combined = `${title} ${snippet}`;

      const ratingPatterns = [
        /Rating:\s*(\d+(?:\.\d+)?)\s*[·\-]\s*(\d[\d,]*)\s*reviews?/i,
        /(\d+(?:\.\d+)?)\s*\((\d[\d,]*)\)/,
        /(\d+(?:\.\d+)?)\s*stars?\s*[·\-]\s*(\d[\d,]*)\s*reviews?/i,
        /(\d+(?:\.\d+)?)\s*out of\s*5\s*[·\-]\s*(\d[\d,]*)\s*reviews?/i,
        /(\d+(?:\.\d+)?)\s*[·\-]\s*(\d[\d,]*)\s*(?:reviews?|Google\s*reviews?)/i,
      ];

      for (const pattern of ratingPatterns) {
        const match = combined.match(pattern);
        if (match) {
          const r = parseFloat(match[1]);
          if (r >= 1 && r <= 5) {
            rating = r;
            reviewCount = parseInt(match[2].replace(/,/g, ""), 10);
            return false;
          }
        }
      }

      const simpleRating = combined.match(/(\d+(?:\.\d+)?)\s*(?:stars?|rating)/i);
      if (simpleRating) {
        const r = parseFloat(simpleRating[1]);
        if (r >= 1 && r <= 5) {
          rating = r;
        }
      }
    });

    return { rating, reviewCount };
  } catch (err) {
    console.error("Google Business rating scrape error:", err);
    return { rating: null, reviewCount: null };
  }
}

function isListTitle(title: string, category: string): boolean {
  const lower = title.toLowerCase();

  const listPatterns = [
    /^(the\s+)?(top|best)\s+\d+/i,
    /\d+\s+(best|top)\s+/i,
    /best\s+.{3,30}\s+(in|near)\s+/i,
    /top\s+.{3,30}\s+(in|near)\s+/i,
    /updated\s+20\d{2}/i,
    /^(find|view|search|browse|list|compare|discover)\s+/i,
    /near\s+(me|you)\b/i,
    /\b(ranking|ratings)\b/i,
    /\breview(s|ed)?\b.*\b(in|near|for)\b/i,
  ];

  for (const pattern of listPatterns) {
    if (pattern.test(lower)) return true;
  }

  const catLower = category.toLowerCase();
  const plurals = [`${catLower}s in `, `${catLower}s near `, `${catLower} shops in `, `${catLower} shops near `];
  for (const phrase of plurals) {
    if (lower.includes(phrase) && !lower.includes(" - ")) return true;
  }

  return false;
}

function isAggregatorSite(domain: string): boolean {
  const aggregators = [
    "yelp.com", "yellowpages.com", "bbb.org", "angieslist.com", "angi.com",
    "thumbtack.com", "homeadvisor.com", "nextdoor.com",
    "mapquest.com", "manta.com", "chamberofcommerce.com",
    "superpages.com", "citysearch.com", "local.com",
    "merchantcircle.com", "hotfrog.com", "brownbook.net",
    "cylex.us.com", "dexknows.com", "judysbook.com",
    "foursquare.com", "tripadvisor.com",
    "barberhead.com", "barbershops.net", "onebarber.com",
    "bestprosintown.com", "marylandrecommendations.com",
    "booksy.com", "thecut.co", "vagaro.com", "styleseat.com",
    "fresha.com", "schedulicity.com", "genbook.com",
    "expertise.com", "therealyellowpages.com",
    "bark.com", "houzz.com", "care.com", "taskrabbit.com",
    "handy.com", "porch.com", "buildzoom.com", "fixr.com",
    "healthgrades.com", "zocdoc.com", "vitals.com",
    "avvo.com", "findlaw.com", "justia.com", "lawyers.com",
    "realtor.com", "zillow.com", "trulia.com", "redfin.com",
    "opentable.com", "doordash.com", "grubhub.com", "ubereats.com",
    "niche.com", "greatschools.org",
    "whitepages.com", "spokeo.com",
    "patch.com", "newsbreak.com",
    "guide.michelin.com", "michelin.com",
    "timeout.com", "eater.com", "infatuation.com", "thrillist.com",
  ];
  return aggregators.some((ex) => domain.includes(ex));
}

function isExcludedDomain(domain: string): boolean {
  const excluded = [
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com",
    "reddit.com", "wikipedia.org",
    "google.com", "bing.com", "duckduckgo.com",
    "amazon.com", "ebay.com", "craigslist.org", "indeed.com",
    "glassdoor.com", "apple.com", "microsoft.com",
    "stackexchange.com", "stackoverflow.com", "quora.com",
    "medium.com", "wordpress.com", "blogspot.com",
    "stitcher.com", "spotify.com", "soundcloud.com",
    "github.com", "gitlab.com", "bitbucket.org",
  ];
  if (domain.endsWith(".gov")) return true;
  return excluded.some((ex) => domain.includes(ex));
}

interface ExtractedContact {
  emails: string[];
  phones: string[];
  contactPageUrl?: string;
  hasContactForm?: boolean;
}

interface InternalContactResult extends ExtractedContact {
  discoveredPages: string[];
}

function extractContactInfo(html: string, $: cheerio.CheerioAPI, baseUrl: string): InternalContactResult {
  const emails = new Set<string>();
  const phones = new Set<string>();
  let contactPageUrl: string | undefined;

  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const emailMatches = html.match(emailRegex) || [];
  for (const email of emailMatches) {
    const lower = email.toLowerCase();
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".gif") || lower.endsWith(".svg")) continue;
    if (lower.includes("example.com") || lower.includes("yoursite") || lower.includes("domain.com")) continue;
    if (lower.includes("wixpress") || lower.includes("sentry") || lower.includes("webpack")) continue;
    if (lower.startsWith("noreply@") || lower.startsWith("no-reply@")) continue;
    emails.add(lower);
  }

  $('a[href^="mailto:"]').each((_i, el) => {
    const href = $(el).attr("href") || "";
    const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
    if (email && email.includes("@") && !email.includes("example.com")) {
      emails.add(email);
    }
  });

  const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const textContent = $("body").text();
  const phoneMatches = textContent.match(phoneRegex) || [];
  for (const phone of phoneMatches) {
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length >= 10 && digits.length <= 11) {
      phones.add(phone.trim());
    }
  }

  $('a[href^="tel:"]').each((_i, el) => {
    const href = $(el).attr("href") || "";
    const phone = href.replace("tel:", "").trim();
    if (phone) {
      const digits = phone.replace(/[^0-9]/g, "");
      if (digits.length >= 10) {
        phones.add(phone);
      }
    }
  });

  const contactPages: string[] = [];
  $('a[href]').each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().toLowerCase().trim();
    const hrefLower = href.toLowerCase();
    const isContactLink =
      text.includes("contact") ||
      text.includes("about") ||
      text.includes("team") ||
      text.includes("staff") ||
      text.includes("our people") ||
      text.includes("meet us") ||
      text.includes("get in touch") ||
      hrefLower.includes("/contact") ||
      hrefLower.includes("/about") ||
      hrefLower.includes("/team") ||
      hrefLower.includes("/staff") ||
      hrefLower.includes("/get-in-touch") ||
      hrefLower.includes("/reach-us") ||
      hrefLower.includes("/our-team") ||
      hrefLower.includes("/meet-the-team") ||
      hrefLower.includes("/people");
    if (isContactLink) {
      try {
        const resolved = new URL(href, baseUrl).href;
        if (!contactPages.includes(resolved) && contactPages.length < 5) {
          contactPages.push(resolved);
        }
        if (!contactPageUrl && (
          hrefLower.includes("/contact") || text.includes("contact") ||
          hrefLower.includes("/get-in-touch") || text.includes("get in touch") ||
          hrefLower.includes("/reach-us") || text.includes("reach us")
        )) {
          contactPageUrl = resolved;
        }
      } catch {}
    }
  });

  let hasContactForm = false;
  $("form").each((_i, el) => {
    const formHtml = $(el).html()?.toLowerCase() || "";
    const formAction = ($(el).attr("action") || "").toLowerCase();
    if (
      formHtml.includes("email") ||
      formHtml.includes("message") ||
      formHtml.includes("name") ||
      formAction.includes("contact") ||
      formAction.includes("inquiry") ||
      formAction.includes("message")
    ) {
      hasContactForm = true;
      return false;
    }
  });

  return {
    emails: Array.from(emails).slice(0, 5),
    phones: Array.from(phones).slice(0, 3),
    contactPageUrl,
    hasContactForm: hasContactForm || undefined,
    discoveredPages: contactPages,
  };
}

async function scrapeContactPage(url: string): Promise<{ emails: string[]; phones: string[] }> {
  const emails = new Set<string>();
  const phones = new Set<string>();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": getRandomUA(), Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) return { emails: [], phones: [] };
    const html = await response.text();
    const $ = cheerio.load(html);

    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emailMatches = html.match(emailRegex) || [];
    for (const email of emailMatches) {
      const lower = email.toLowerCase();
      if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".gif")) continue;
      if (lower.includes("example.com") || lower.includes("wixpress") || lower.includes("sentry")) continue;
      if (lower.startsWith("noreply@") || lower.startsWith("no-reply@")) continue;
      emails.add(lower);
    }

    $('a[href^="mailto:"]').each((_i, el) => {
      const href = $(el).attr("href") || "";
      const email = href.replace("mailto:", "").split("?")[0].trim().toLowerCase();
      if (email && email.includes("@") && !email.includes("example.com")) {
        emails.add(email);
      }
    });

    const textContent = $("body").text();
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    const phoneMatches = textContent.match(phoneRegex) || [];
    for (const phone of phoneMatches) {
      const digits = phone.replace(/[^0-9]/g, "");
      if (digits.length >= 10 && digits.length <= 11) phones.add(phone.trim());
    }

    $('a[href^="tel:"]').each((_i, el) => {
      const href = $(el).attr("href") || "";
      const phone = href.replace("tel:", "").trim();
      if (phone) {
        const digits = phone.replace(/[^0-9]/g, "");
        if (digits.length >= 10) phones.add(phone);
      }
    });
  } catch {}

  return { emails: Array.from(emails).slice(0, 5), phones: Array.from(phones).slice(0, 3) };
}

interface TechnologyDetection {
  cms?: string;
  framework?: string;
  server?: string;
  analytics: string[];
  marketing: string[];
  ecommerce?: string;
  hosting?: string;
  uiLibraries?: string[];
}

function detectTechnologies(html: string, $: cheerio.CheerioAPI, headers: Headers): TechnologyDetection {
  const tech: TechnologyDetection = { analytics: [], marketing: [] };

  if (html.includes("wp-content") || html.includes("wp-includes") || html.includes("wordpress")) tech.cms = "WordPress";
  else if (html.includes("wix.com") || html.includes("X-Wix-")) tech.cms = "Wix";
  else if (html.includes("squarespace.com") || html.includes("squarespace-cdn")) tech.cms = "Squarespace";
  else if (html.includes("shopify") || html.includes("myshopify.com") || html.includes("Shopify.theme")) tech.cms = "Shopify";
  else if (html.includes("webflow.com") || html.includes("wf-page")) tech.cms = "Webflow";
  else if (html.includes("weebly.com")) tech.cms = "Weebly";
  else if (html.includes("godaddy.com/website-builder") || html.includes("godaddy-dns")) tech.cms = "GoDaddy Builder";
  else if (html.includes("site123.com")) tech.cms = "Site123";
  else if (html.includes("jimdo.com")) tech.cms = "Jimdo";
  else if (html.includes("duda.co") || html.includes("dudaone")) tech.cms = "Duda";
  else if (html.includes("ghost.org") || html.includes("ghost-")) tech.cms = "Ghost";
  else if (html.includes("drupal") || html.includes("Drupal.settings")) tech.cms = "Drupal";
  else if (html.includes("joomla") || html.includes("/media/jui/")) tech.cms = "Joomla";
  else if (html.includes("hubspot") && html.includes("hs-scripts")) tech.cms = "HubSpot CMS";
  else if (html.includes("cargo.site") || html.includes("cargocollective")) tech.cms = "Cargo";
  else if ($('meta[name="generator"]').attr("content")?.toLowerCase().includes("wordpress")) tech.cms = "WordPress";
  else if ($('meta[name="generator"]').attr("content")?.toLowerCase().includes("drupal")) tech.cms = "Drupal";

  if (html.includes("__NEXT_DATA__") || html.includes("_next/")) tech.framework = "Next.js";
  else if (html.includes("__NUXT__") || html.includes("_nuxt/")) tech.framework = "Nuxt.js";
  else if (html.includes("reactroot") || html.includes("react-root") || html.includes("__react")) tech.framework = "React";
  else if (html.includes("ng-app") || html.includes("ng-version")) tech.framework = "Angular";
  else if (html.includes("data-v-") || html.includes("vue-")) tech.framework = "Vue.js";
  else if (html.includes("__svelte") || html.includes("svelte-")) tech.framework = "Svelte";
  else if (html.includes("gatsby")) tech.framework = "Gatsby";
  else if (html.includes("astro-")) tech.framework = "Astro";
  else if (html.includes("ember") || html.includes("data-ember")) tech.framework = "Ember.js";

  const serverHeader = headers.get("server") || headers.get("x-powered-by") || "";
  if (serverHeader.toLowerCase().includes("nginx")) tech.server = "Nginx";
  else if (serverHeader.toLowerCase().includes("apache")) tech.server = "Apache";
  else if (serverHeader.toLowerCase().includes("cloudflare")) tech.server = "Cloudflare";
  else if (serverHeader.toLowerCase().includes("netlify")) tech.server = "Netlify";
  else if (serverHeader.toLowerCase().includes("vercel")) tech.server = "Vercel";
  else if (serverHeader.toLowerCase().includes("iis")) tech.server = "IIS";

  if (html.includes("google-analytics") || html.includes("gtag") || html.includes("analytics.js") || html.includes("ga.js")) tech.analytics.push("Google Analytics");
  if (html.includes("googletagmanager.com")) tech.analytics.push("Google Tag Manager");
  if (html.includes("hotjar.com")) tech.analytics.push("Hotjar");
  if (html.includes("segment.com") || html.includes("analytics.min.js")) tech.analytics.push("Segment");
  if (html.includes("mixpanel.com")) tech.analytics.push("Mixpanel");
  if (html.includes("plausible.io")) tech.analytics.push("Plausible");
  if (html.includes("fathom")) tech.analytics.push("Fathom");
  if (html.includes("clarity.ms")) tech.analytics.push("Microsoft Clarity");
  if (html.includes("heap") && html.includes("heap-")) tech.analytics.push("Heap");

  if (html.includes("mailchimp.com")) tech.marketing.push("Mailchimp");
  if (html.includes("hubspot.com") || html.includes("hs-scripts")) tech.marketing.push("HubSpot");
  if (html.includes("intercom.com") || html.includes("intercomSettings")) tech.marketing.push("Intercom");
  if (html.includes("drift.com")) tech.marketing.push("Drift");
  if (html.includes("crisp.chat")) tech.marketing.push("Crisp");
  if (html.includes("tawk.to")) tech.marketing.push("Tawk.to");
  if (html.includes("zendesk.com")) tech.marketing.push("Zendesk");
  if (html.includes("livechat")) tech.marketing.push("LiveChat");
  if (html.includes("calendly.com")) tech.marketing.push("Calendly");
  if (html.includes("convertkit")) tech.marketing.push("ConvertKit");
  if (html.includes("activecampaign")) tech.marketing.push("ActiveCampaign");

  if (html.includes("shopify") || html.includes("myshopify")) tech.ecommerce = "Shopify";
  else if (html.includes("woocommerce") || html.includes("wc-")) tech.ecommerce = "WooCommerce";
  else if (html.includes("bigcommerce")) tech.ecommerce = "BigCommerce";
  else if (html.includes("magento")) tech.ecommerce = "Magento";
  else if (html.includes("stripe.com") || html.includes("stripe.js")) tech.ecommerce = "Stripe";
  else if (html.includes("paypal.com")) tech.ecommerce = "PayPal";
  else if (html.includes("square.com") || html.includes("squareup.com")) tech.ecommerce = "Square";

  if (headers.get("x-vercel-id") || html.includes("vercel-insights")) tech.hosting = "Vercel";
  else if (headers.get("x-nf-request-id") || html.includes("netlify-identity")) tech.hosting = "Netlify";
  else if (headers.get("server")?.includes("cloudflare") || headers.get("cf-ray")) tech.hosting = "Cloudflare";
  else if (headers.get("server")?.includes("AmazonS3") || headers.get("x-amz-request-id") || headers.get("x-amz-cf-id")) tech.hosting = "AWS";
  else if (html.includes("firebase") || html.includes("firebaseapp.com")) tech.hosting = "Firebase";
  else if (html.includes("herokuapp.com")) tech.hosting = "Heroku";
  else if (html.includes("github.io") || html.includes("github.dev")) tech.hosting = "GitHub Pages";
  else if (html.includes("render.com")) tech.hosting = "Render";
  else if (html.includes("fly.io") || headers.get("fly-request-id")) tech.hosting = "Fly.io";
  else if (html.includes("digitalocean") || headers.get("x-do-app-origin")) tech.hosting = "DigitalOcean";
  else if (html.includes("azurewebsites.net") || headers.get("x-azure-ref")) tech.hosting = "Azure";
  else if (html.includes("pages.dev") || html.includes("workers.dev")) tech.hosting = "Cloudflare Pages";

  const hasjQuery = html.includes("jquery") || html.includes("jQuery");
  const hasBootstrap = html.includes("bootstrap") || html.includes("Bootstrap");
  const hasTailwind = html.includes("tailwindcss") || html.includes("tailwind");

  tech.uiLibraries = [];
  if (hasjQuery) tech.uiLibraries.push("jQuery");
  if (hasBootstrap) tech.uiLibraries.push("Bootstrap");
  if (hasTailwind) tech.uiLibraries.push("Tailwind CSS");
  if (html.includes("material-ui") || html.includes("@mui")) tech.uiLibraries.push("Material UI");
  if (html.includes("ant-design") || html.includes("antd")) tech.uiLibraries.push("Ant Design");
  if (html.includes("chakra-ui")) tech.uiLibraries.push("Chakra UI");

  if (html.includes("recaptcha") || html.includes("hcaptcha")) tech.marketing.push("CAPTCHA");
  if (html.includes("cookieconsent") || html.includes("cookie-consent") || html.includes("cookie-banner") || html.includes("gdpr")) tech.marketing.push("Cookie Consent");
  if (html.includes("fbq(") || html.includes("facebook.com/tr")) tech.analytics.push("Facebook Pixel");
  if (html.includes("snap.licdn.com") || html.includes("linkedin.com/insight")) tech.analytics.push("LinkedIn Insight");
  if (html.includes("tiktok.com/i18n") || html.includes("analytics.tiktok.com")) tech.analytics.push("TikTok Pixel");

  return tech;
}

function formatTechnologies(tech: TechnologyDetection): string[] {
  const result: string[] = [];
  if (tech.cms) result.push(`CMS: ${tech.cms}`);
  if (tech.framework) result.push(`Framework: ${tech.framework}`);
  if (tech.uiLibraries) {
    for (const lib of tech.uiLibraries) result.push(`UI: ${lib}`);
  }
  if (tech.server) result.push(`Server: ${tech.server}`);
  if (tech.hosting) result.push(`Hosting: ${tech.hosting}`);
  if (tech.ecommerce) result.push(`E-commerce: ${tech.ecommerce}`);
  for (const a of tech.analytics) result.push(`Analytics: ${a}`);
  for (const m of tech.marketing) result.push(`Tool: ${m}`);
  return result;
}

function generateScreenshotUrl(targetUrl: string): string {
  let url = targetUrl;
  if (!url.startsWith("http")) url = `https://${url}`;
  return `https://image.thum.io/get/width/1280/crop/800/noanimate/${url}`;
}

export async function analyzeWebsite(targetUrl: string, businessName?: string, location?: string): Promise<WebsiteAnalysis & { socialMedia?: string[]; contactInfo?: ExtractedContact; technologies?: string[]; screenshotUrl?: string; googleRating?: number; googleReviewCount?: number; hasSitemap?: boolean; hasRobotsTxt?: boolean; sitemapIssues?: string[] }> {
  const issues: string[] = [];
  let score = 100;

  if (!targetUrl || targetUrl.trim() === "" || targetUrl === "none") {
    return {
      score: 0,
      issues: ["No website found", "Business needs a website built from scratch"],
      hasWebsite: false,
    };
  }

  let fullUrl = targetUrl;
  if (!fullUrl.startsWith("http")) {
    fullUrl = `https://${fullUrl}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const startTime = Date.now();
    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const loadTime = Date.now() - startTime;

    if (!response.ok) {
      issues.push("Website returns error status");
      score -= 30;
      return { score: Math.max(0, score), issues, hasWebsite: true };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      issues.push("Website does not serve HTML");
      score -= 20;
      return { score: Math.max(0, score), issues, hasWebsite: true };
    }

    const finalUrl = response.url;
    if (!finalUrl.startsWith("https://")) {
      issues.push("No HTTPS - security risk");
      score -= 15;
    }

    if (loadTime > 5000) {
      issues.push("Very slow load time (>5s)");
      score -= 20;
    } else if (loadTime > 3000) {
      issues.push("Slow load time (>3s)");
      score -= 10;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const viewport = $('meta[name="viewport"]').attr("content");
    if (!viewport) {
      issues.push("Not mobile-responsive");
      score -= 20;
    }

    const metaDesc = $('meta[name="description"]').attr("content");
    if (!metaDesc || metaDesc.length < 10) {
      issues.push("Missing or poor meta description");
      score -= 10;
    }

    const pageTitle = $("title").text().trim();
    if (!pageTitle || pageTitle.length < 3) {
      issues.push("Missing or empty title tag");
      score -= 10;
    }

    const hasStructuredData =
      html.includes("schema.org") ||
      html.includes("application/ld+json") ||
      $('script[type="application/ld+json"]').length > 0;

    if (!hasStructuredData) {
      issues.push("No structured data (SEO)");
      score -= 5;
    }

    const hasCustomFonts =
      html.includes("fonts.googleapis.com") ||
      html.includes("fonts.gstatic.com") ||
      html.includes("typekit") ||
      html.includes("font-face");

    if (!hasCustomFonts) {
      issues.push("No custom typography");
      score -= 5;
    }

    const images = $("img");
    const imagesWithAlt = $("img[alt]").filter((_i, el) => {
      const alt = $(el).attr("alt");
      return !!alt && alt.trim().length > 0;
    });
    if (images.length > 0 && imagesWithAlt.length < images.length * 0.5) {
      issues.push("Images missing alt text (accessibility)");
      score -= 5;
    }

    if (html.length > 500000) {
      issues.push("Excessive page size (performance)");
      score -= 10;
    }

    const hasCTA = $('a[href*="contact"], a[href*="quote"], a[href*="book"], button').length > 0;
    const hasContactForm = html.includes("contact") || html.includes("form");

    if (!hasCTA && !hasContactForm) {
      issues.push("No clear call-to-action");
      score -= 5;
    }

    const lastModified = response.headers.get("last-modified");
    if (lastModified) {
      const lastModDate = new Date(lastModified);
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 2);
      if (lastModDate < yearAgo) {
        issues.push("Website appears outdated (>2 years)");
        score -= 10;
      }
    }

    const technologies = detectTechnologies(html, $, response.headers);

    if (!technologies.framework && !technologies.cms) {
      issues.push("No modern framework detected");
      score -= 10;
    }

    if (technologies.cms && ["Wix", "Weebly", "GoDaddy Builder", "Site123", "Jimdo"].includes(technologies.cms)) {
      issues.push(`Uses basic website builder (${technologies.cms})`);
      score -= 5;
    } else if (technologies.cms === "Squarespace" || technologies.cms === "WordPress") {
      issues.push(`Built with ${technologies.cms} template`);
      score -= 3;
    }

    if (technologies.analytics.length === 0) {
      issues.push("No analytics tracking");
      score -= 5;
    }

    const h1Count = $("h1").length;
    if (h1Count === 0) {
      issues.push("Missing H1 heading (accessibility/SEO)");
      score -= 5;
    } else if (h1Count > 1) {
      issues.push("Multiple H1 headings (SEO issue)");
      score -= 3;
    }

    const hasSkipLink = $('a[href="#main"], a[href="#content"], a.skip-link, a.skip-to-content').length > 0;
    const hasAriaLandmarks = $('[role="main"], [role="navigation"], [role="banner"], main, nav, header').length > 0;
    if (!hasAriaLandmarks && !hasSkipLink) {
      issues.push("No ARIA landmarks (accessibility)");
      score -= 5;
    }

    const formInputs = $("input, textarea, select");
    const formLabels = $("label");
    if (formInputs.length > 0 && formLabels.length < formInputs.length * 0.5) {
      issues.push("Form inputs missing labels (accessibility)");
      score -= 5;
    }

    const htmlLang = $("html").attr("lang");
    if (!htmlLang) {
      issues.push("Missing lang attribute on HTML (accessibility)");
      score -= 3;
    }

    const hasLazyLoading = $('img[loading="lazy"]').length > 0 || html.includes("lazyload") || html.includes("lazy-load");
    if (images.length > 5 && !hasLazyLoading) {
      issues.push("No lazy loading for images (performance)");
      score -= 3;
    }

    const hasMinifiedCSS = $('link[rel="stylesheet"]').length > 0 && (html.includes(".min.css") || html.includes("chunk"));
    const hasMinifiedJS = html.includes(".min.js") || html.includes("chunk") || html.includes("bundle");
    if (!hasMinifiedCSS && !hasMinifiedJS && $('link[rel="stylesheet"]').length > 0) {
      issues.push("Resources may not be minified (performance)");
      score -= 3;
    }

    const hasOgTags = $('meta[property^="og:"]').length > 0;
    if (!hasOgTags) {
      issues.push("Missing Open Graph tags (social sharing/SEO)");
      score -= 3;
    }

    const hasCanonical = $('link[rel="canonical"]').length > 0;
    if (!hasCanonical) {
      issues.push("Missing canonical URL (SEO)");
      score -= 3;
    }

    const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
    if (!hasFavicon) {
      issues.push("Missing favicon (SEO)");
      score -= 2;
    }

    const hasRobotsMeta = $('meta[name="robots"]').length > 0;
    const hasSitemapLink = html.includes("sitemap.xml") || html.includes("sitemap");

    const scriptCount = $("script[src]").length;
    const stylesheetCount = $('link[rel="stylesheet"]').length;
    if (scriptCount + stylesheetCount > 30) {
      issues.push(`Too many resources loaded: ${scriptCount + stylesheetCount} scripts/styles (performance)`);
      score -= 5;
    } else if (scriptCount + stylesheetCount > 20) {
      issues.push(`High resource count: ${scriptCount + stylesheetCount} scripts/styles (performance)`);
      score -= 3;
    }

    // --- Core Web Vitals proxy checks ---

    const renderBlockingCSS = $('link[rel="stylesheet"]').filter((_i, el) => {
      const media = $(el).attr("media");
      return !media || media === "all" || media === "screen";
    });
    const renderBlockingScripts = $('script[src]').filter((_i, el) => {
      return !$(el).attr("async") && !$(el).attr("defer") && !$(el).attr("type")?.includes("module");
    });
    if (renderBlockingScripts.length > 5) {
      issues.push(`${renderBlockingScripts.length} render-blocking scripts — delays first paint (performance)`);
      score -= 5;
    } else if (renderBlockingScripts.length > 2) {
      issues.push(`${renderBlockingScripts.length} render-blocking scripts (performance)`);
      score -= 3;
    }

    if (renderBlockingCSS.length > 4) {
      issues.push(`${renderBlockingCSS.length} render-blocking stylesheets — delays first paint (performance)`);
      score -= 3;
    }

    const hasPreconnect = $('link[rel="preconnect"], link[rel="dns-prefetch"]').length > 0;
    const hasPreload = $('link[rel="preload"]').length > 0;
    if (!hasPreconnect && !hasPreload && scriptCount > 3) {
      issues.push("No resource preloading or preconnect hints (performance)");
      score -= 2;
    }

    const inlineStyleLength = $("style").text().length;
    const inlineScriptLength = $("script:not([src])").text().length;
    if (inlineStyleLength > 50000) {
      issues.push("Excessive inline CSS (>50KB) — hurts first paint (performance)");
      score -= 3;
    }
    if (inlineScriptLength > 100000) {
      issues.push("Excessive inline JavaScript (>100KB) — blocks rendering (performance)");
      score -= 3;
    }

    const imagesWithoutDimensions = $("img").filter((_i, el) => {
      return !$(el).attr("width") && !$(el).attr("height") && !$(el).attr("style")?.includes("width");
    });
    if (imagesWithoutDimensions.length > 3) {
      issues.push(`${imagesWithoutDimensions.length} images without width/height — causes layout shifts (performance)`);
      score -= 4;
    }

    const hasWebpOrAvif = $('img[src*=".webp"], img[src*=".avif"], source[type="image/webp"], source[type="image/avif"]').length > 0;
    if (images.length > 3 && !hasWebpOrAvif) {
      issues.push("No next-gen image formats (WebP/AVIF) — larger file sizes (performance)");
      score -= 3;
    }

    const hasFontDisplay = html.includes("font-display:") || html.includes("font-display:");
    const hasGoogleFontsDisplay = html.includes("display=swap") || html.includes("display=optional");
    if (hasCustomFonts && !hasFontDisplay && !hasGoogleFontsDisplay) {
      issues.push("Custom fonts missing font-display — causes text flash (performance)");
      score -= 2;
    }

    // --- Deeper Accessibility checks ---

    const hasColorContrast = html.includes("contrast") || html.includes("a11y") || html.includes("accessibility");
    const focusStyles = html.includes(":focus") || html.includes("focus-visible") || html.includes("outline");
    if (!focusStyles) {
      issues.push("No visible focus indicators detected (accessibility)");
      score -= 3;
    }

    const tabindex = $("[tabindex]").filter((_i, el) => {
      const val = parseInt($(el).attr("tabindex") || "0");
      return val > 0;
    });
    if (tabindex.length > 0) {
      issues.push(`${tabindex.length} elements with positive tabindex — disrupts keyboard navigation (accessibility)`);
      score -= 3;
    }

    const linksWithoutText = $("a").filter((_i, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr("aria-label");
      const title = $(el).attr("title");
      const img = $(el).find("img[alt]");
      return !text && !ariaLabel && !title && img.length === 0;
    });
    if (linksWithoutText.length > 2) {
      issues.push(`${linksWithoutText.length} links without accessible text (accessibility)`);
      score -= 3;
    }

    const buttonsWithoutText = $("button").filter((_i, el) => {
      const text = $(el).text().trim();
      const ariaLabel = $(el).attr("aria-label");
      return !text && !ariaLabel;
    });
    if (buttonsWithoutText.length > 0) {
      issues.push(`${buttonsWithoutText.length} buttons without accessible labels (accessibility)`);
      score -= 3;
    }

    const iframes = $("iframe");
    const iframesWithoutTitle = iframes.filter((_i, el) => !$(el).attr("title"));
    if (iframesWithoutTitle.length > 0) {
      issues.push(`${iframesWithoutTitle.length} iframes missing title attribute (accessibility)`);
      score -= 2;
    }

    // --- Deeper SEO checks ---

    const titleLength = pageTitle?.length || 0;
    if (titleLength > 60) {
      issues.push(`Title tag too long (${titleLength} chars, recommended <60) (SEO)`);
      score -= 2;
    }

    const metaDescLength = metaDesc?.length || 0;
    if (metaDesc && metaDescLength > 160) {
      issues.push(`Meta description too long (${metaDescLength} chars, recommended <160) (SEO)`);
      score -= 2;
    }

    if (!hasSitemapLink && !hasRobotsMeta) {
      issues.push("No sitemap reference or robots meta — poor crawlability (SEO)");
      score -= 3;
    }

    const hasTwitterCards = $('meta[name^="twitter:"]').length > 0;
    if (!hasOgTags && !hasTwitterCards) {
      issues.push("No social media meta tags (Twitter Cards or OG) (SEO)");
      score -= 2;
    }

    const headingOrder: number[] = [];
    $("h1, h2, h3, h4, h5, h6").each((_i, el) => {
      headingOrder.push(parseInt(el.tagName.replace("h", "")));
    });
    let headingSkipped = false;
    for (let i = 1; i < headingOrder.length; i++) {
      if (headingOrder[i] - headingOrder[i - 1] > 1) {
        headingSkipped = true;
        break;
      }
    }
    if (headingSkipped) {
      issues.push("Heading levels skipped (e.g. H1 to H3) — bad for screen readers (accessibility/SEO)");
      score -= 2;
    }

    // --- Security checks ---

    const csp = response.headers.get("content-security-policy");
    const xFrame = response.headers.get("x-frame-options");
    const xContent = response.headers.get("x-content-type-options");
    const hsts = response.headers.get("strict-transport-security");

    if (!csp) {
      issues.push("No Content Security Policy header (security)");
      score -= 3;
    }
    if (!xFrame) {
      issues.push("No X-Frame-Options header — clickjacking risk (security)");
      score -= 2;
    }
    if (!xContent) {
      issues.push("No X-Content-Type-Options header (security)");
      score -= 2;
    }
    if (!hsts && finalUrl.startsWith("https://")) {
      issues.push("No HSTS header — HTTPS downgrade risk (security)");
      score -= 2;
    }

    const hasMixedContent = html.includes('src="http://') || html.includes("src='http://");
    if (hasMixedContent) {
      issues.push("Mixed content detected (HTTP resources on HTTPS page) (security)");
      score -= 5;
    }

    let hasRobotsTxtFile = false;
    let hasSitemapFile = false;
    const sitemapIssuesList: string[] = [];

    const parsedUrl = new URL(finalUrl);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;

    try {
      const robotsController = new AbortController();
      const robotsTimeout = setTimeout(() => robotsController.abort(), 5000);
      const robotsResponse = await fetch(`${baseUrl}/robots.txt`, {
        signal: robotsController.signal,
        headers: { "User-Agent": getRandomUA() },
      });
      clearTimeout(robotsTimeout);

      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        if (robotsText && robotsText.length > 0 && !robotsText.includes("<html")) {
          hasRobotsTxtFile = true;
          const lines = robotsText.split("\n").map(l => l.trim().toLowerCase());
          const hasDisallowAll = lines.some(l => l === "disallow: /");
          const userAgentAll = lines.some(l => l === "user-agent: *");
          if (hasDisallowAll && userAgentAll) {
            issues.push("robots.txt blocks search engines (SEO)");
            score -= 10;
            sitemapIssuesList.push("robots.txt blocks all crawlers");
          }
          const sitemapDirective = robotsText.match(/^Sitemap:\s*(.+)$/im);
          if (sitemapDirective) {
            sitemapIssuesList.push(`Sitemap declared in robots.txt: ${sitemapDirective[1].trim()}`);
          }
        } else {
          issues.push("No robots.txt file (SEO)");
          score -= 2;
          sitemapIssuesList.push("Missing robots.txt");
        }
      } else {
        issues.push("No robots.txt file (SEO)");
        score -= 2;
        sitemapIssuesList.push("Missing robots.txt");
      }
    } catch {
      sitemapIssuesList.push("Could not fetch robots.txt");
    }

    try {
      const sitemapController = new AbortController();
      const sitemapTimeout = setTimeout(() => sitemapController.abort(), 5000);
      const sitemapResponse = await fetch(`${baseUrl}/sitemap.xml`, {
        signal: sitemapController.signal,
        headers: { "User-Agent": getRandomUA() },
      });
      clearTimeout(sitemapTimeout);

      if (sitemapResponse.ok) {
        const sitemapText = await sitemapResponse.text();
        const contentType = sitemapResponse.headers.get("content-type") || "";
        if (sitemapText.includes("<urlset") || sitemapText.includes("<sitemapindex") || contentType.includes("xml")) {
          hasSitemapFile = true;
          const urlCount = (sitemapText.match(/<loc>/gi) || []).length;
          if (urlCount > 0 && urlCount < 5) {
            issues.push("Sitemap has very few URLs (SEO)");
            score -= 2;
            sitemapIssuesList.push(`Sitemap contains only ${urlCount} URLs`);
          }
          if (!sitemapText.includes("<urlset") && !sitemapText.includes("<sitemapindex")) {
            issues.push("Sitemap.xml is malformed (SEO)");
            score -= 3;
            sitemapIssuesList.push("Sitemap missing urlset or sitemapindex tags");
          }
        } else {
          issues.push("Sitemap.xml is malformed (SEO)");
          score -= 3;
          sitemapIssuesList.push("Sitemap does not contain valid XML");
        }
      } else {
        issues.push("No sitemap.xml found (SEO)");
        score -= 5;
        sitemapIssuesList.push("Missing sitemap.xml");
      }
    } catch {
      sitemapIssuesList.push("Could not fetch sitemap.xml");
    }

    let googleRating: number | undefined;
    let googleReviewCount: number | undefined;

    const resolvedBizName = businessName || pageTitle?.replace(/\s*[-|–—].*$/, "").trim() || "";
    const resolvedLocation = location || "";
    if (resolvedBizName && resolvedBizName.length >= 3) {
      try {
        const gRating = await scrapeGoogleBusinessRating(resolvedBizName, resolvedLocation);
        if (gRating.rating !== null) googleRating = gRating.rating;
        if (gRating.reviewCount !== null) googleReviewCount = gRating.reviewCount;
      } catch {}
    }

    const socialMedia = extractSocialLinksFromHtml(html, $);

    const contactInfo = extractContactInfo(html, $, fullUrl);

    const pagesToScrape = [...contactInfo.discoveredPages];
    if (contactInfo.contactPageUrl && !pagesToScrape.includes(contactInfo.contactPageUrl)) {
      pagesToScrape.unshift(contactInfo.contactPageUrl);
    }
    if (pagesToScrape.length > 0 && (contactInfo.emails.length === 0 || contactInfo.phones.length === 0)) {
      const scrapePromises = pagesToScrape.slice(0, 4).map(pageUrl => scrapeContactPage(pageUrl));
      const pageResults = await Promise.allSettled(scrapePromises);
      for (const result of pageResults) {
        if (result.status === "fulfilled") {
          for (const email of result.value.emails) {
            if (!contactInfo.emails.includes(email) && contactInfo.emails.length < 5) {
              contactInfo.emails.push(email);
            }
          }
          for (const phone of result.value.phones) {
            const digits = phone.replace(/[^0-9]/g, "");
            const existingDigits = contactInfo.phones.map(p => p.replace(/[^0-9]/g, ""));
            if (!existingDigits.includes(digits) && contactInfo.phones.length < 3) {
              contactInfo.phones.push(phone);
            }
          }
        }
      }
    }
    const cleanedContactInfo: ExtractedContact = {
      emails: contactInfo.emails,
      phones: contactInfo.phones,
      contactPageUrl: contactInfo.contactPageUrl,
      hasContactForm: contactInfo.hasContactForm,
    };

    const hasContact = contactInfo.emails.length > 0 || contactInfo.phones.length > 0;
    const techList = formatTechnologies(technologies);
    const screenshotUrl = generateScreenshotUrl(fullUrl);

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      hasWebsite: true,
      socialMedia: socialMedia.length ? socialMedia : undefined,
      contactInfo: hasContact ? cleanedContactInfo : undefined,
      technologies: techList.length ? techList : undefined,
      screenshotUrl,
      googleRating,
      googleReviewCount,
      hasSitemap: hasSitemapFile,
      hasRobotsTxt: hasRobotsTxtFile,
      sitemapIssues: sitemapIssuesList.length ? sitemapIssuesList : undefined,
    };

  } catch (err: any) {
    if (err.name === "AbortError") {
      issues.push("Website timed out (>10s)");
      score -= 30;
    } else {
      issues.push("Website unreachable or broken");
      score -= 40;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), issues, hasWebsite: true };
}

function extractDomain(url: string): string | null {
  try {
    let fullUrl = url;
    if (!fullUrl.startsWith("http")) fullUrl = `https://${fullUrl}`;
    return new URL(fullUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeUrl(url: string): string {
  try {
    let fullUrl = url;
    if (!fullUrl.startsWith("http")) fullUrl = `https://${fullUrl}`;
    const parsed = new URL(fullUrl);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

function cleanBusinessName(title: string): string {
  let name = title
    .replace(/\s*[-|–—]\s*(Home|About|Contact|Services|Official|Website|Site|Page|Welcome|Reviews?|Get\s|Your\s|We\s|The\s+Best|A\s+).*$/i, "")
    .replace(/\s*\|.*$/, "")
    .replace(/\s*[-–—]\s*[A-Z][a-z]+,?\s+[A-Z]{2}\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (name.length > 50) {
    const dash = name.indexOf(" - ");
    if (dash > 0 && dash < 50) {
      name = name.slice(0, dash);
    }
    const pipe = name.indexOf(" | ");
    if (pipe > 0 && pipe < 50) {
      name = name.slice(0, pipe);
    }
  }

  name = name
    .replace(/,\s+(Inc|LLC|Ltd|Corp|Co)\b\.?$/i, "")
    .trim();

  return name.slice(0, 80);
}

export async function scrapeUrlForBusinessInfo(inputUrl: string): Promise<{
  companyName?: string;
  websiteUrl?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialMedia?: string[];
  description?: string;
}> {
  console.log(`[scrapeUrlForBusinessInfo] Processing URL: ${inputUrl}`);
  
  let fullUrl = inputUrl.trim();
  if (!fullUrl.startsWith("http")) {
    fullUrl = `https://${fullUrl}`;
  }

  const result: {
    companyName?: string;
    websiteUrl?: string;
    location?: string;
    contactEmail?: string;
    contactPhone?: string;
    socialMedia?: string[];
    description?: string;
  } = {};

  const socialDetected = detectSocialMediaUrl(fullUrl);
  if (socialDetected) {
    result.socialMedia = [socialDetected];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": getRandomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) return result;
    const html = await response.text();
    const $ = cheerio.load(html);

    // Check if page requires login or is blocked
    const bodyText = $("body").text().toLowerCase();
    const titleText = $("title").text().toLowerCase();
    
    // Indicators of login-required or blocked pages
    const loginIndicators = [
      "log in", "sign in", "login", "sign up", "create account",
      "you must be logged in", "please log in", "authentication required",
      "this content is only available to", "private account", "follow to see",
      "access denied", "unauthorized", "login required"
    ];
    
    const isLoginRequired = loginIndicators.some(indicator => 
      bodyText.includes(indicator) || titleText.includes(indicator)
    );
    
    // Check for meta tags that indicate private/login required content
    const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase() || "";
    const isNoIndex = robotsMeta.includes("noindex") || robotsMeta.includes("none");
    
    if (isLoginRequired) {
      console.log(`[scrapeUrlForBusinessInfo] Login required for ${inputUrl}, attempting public data extraction`);
      // Still try to extract public meta data even if login is required
    }

    const parsedUrl = new URL(fullUrl);
    const host = parsedUrl.hostname.replace(/^www\./, "").replace(/^m\./, "");
    const isSocialMedia = Object.keys(SOCIAL_MEDIA_DOMAINS).some(
      (d) => host === d || host.endsWith(`.${d}`)
    );

    if (isSocialMedia) {
      // Prioritize public meta data which is usually available even on login-required pages
      const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
      const twitterTitle = $('meta[name="twitter:title"]').attr("content")?.trim();
      const pageTitle = $("title").text().trim();
      let name = ogTitle || twitterTitle || pageTitle || "";
      
      // More aggressive cleaning for social media titles
      name = name
        .replace(/\s*[-|]\s*(Facebook|Instagram|Twitter|X|LinkedIn|TikTok|YouTube|Pinterest|Meta).*$/i, "")
        .replace(/\s*on\s+(Facebook|Instagram|Twitter|X|LinkedIn)$/i, "")
        .replace(/\s*\|\s*.*$/i, "")
        .replace(/\s*\(\s*@.*\)\s*$/i, "") // Remove @username in parentheses
        .replace(/@\s*[a-zA-Z0-9_.]+$/, "") // Remove @username at end
        .trim();
      
      // Additional validation for extracted names
      const genericNames = ["business", "page", "profile", "account", "home", "login", "sign up", "create page", "meta"];
      const isGeneric = genericNames.some(generic => name.toLowerCase().includes(generic));
      
      if (name && name.length > 1 && name.length < 80 && !isGeneric) {
        result.companyName = name;
      }

      // Meta descriptions are usually public even on private accounts
      const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
      if (ogDesc && !ogDesc.toLowerCase().includes("log in") && !ogDesc.toLowerCase().includes("sign up")) {
        result.description = ogDesc.slice(0, 300);
      }

      // Only attempt body text extraction if page doesn't require login
      if (!isLoginRequired) {
        const bodyText = $("body").text();
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
        const emailMatches = bodyText.match(emailRegex) || [];
        
        // Filter out likely platform/generic emails
        const filteredEmails = emailMatches.filter(email => {
          const lo = email.toLowerCase();
          // Exclude image files and examples
          if (lo.endsWith(".png") || lo.endsWith(".jpg") || lo.includes("example.com")) return false;
          // Exclude platform domains
          if (lo.includes("@facebook.com") || lo.includes("@instagram.com") || lo.includes("@meta.com") || 
              lo.includes("@support.") || lo.includes("@help.") || lo.includes("@noreply.")) return false;
          // Exclude obviously fake emails
          if (lo.startsWith("test@") || lo.startsWith("fake@") || lo.startsWith("demo@")) return false;
          return true;
        });
        
        for (const email of filteredEmails) {
          result.contactEmail = email;
          break;
        }

        const phoneRegex = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const phoneMatches = bodyText.match(phoneRegex) || [];
        
        // Filter and prioritize phone numbers by context relevance
        const filteredPhones = phoneMatches.filter(phone => {
          const cleanPhone = phone.replace(/[^0-9]/g, "");
          // Exclude obviously fake/generic numbers
          if (cleanPhone === "0000000000" || cleanPhone === "1111111111" || cleanPhone === "1234567890") return false;
          // Exclude very short numbers after cleaning
          if (cleanPhone.length < 10) return false;
          // Exclude Meta's known customer service numbers
          const metaNumbers = ["6505434800", "6503087300", "6505434800"]; // Meta/Facebook corporate numbers
          if (metaNumbers.includes(cleanPhone)) return false;
          return true;
        });
        
        // If we have multiple phones, try to find the most business-relevant one
        if (filteredPhones.length > 0) {
          let bestPhone = filteredPhones[0];
          
          // Look for phones in business context sections
          const businessContextSelectors = [
            '.contact', '.about', '.info', '.description', '[data-testid*="contact"]',
            '[aria-label*="contact"]', '[aria-label*="phone"]', '.business', '.page'
          ];
          
          for (const selector of businessContextSelectors) {
            const contextElement = $(selector).first();
            if (contextElement.length > 0) {
              const contextText = contextElement.text();
              const contextPhones = contextText.match(phoneRegex) || [];
              for (const contextPhone of contextPhones) {
                if (filteredPhones.includes(contextPhone)) {
                  bestPhone = contextPhone;
                  break;
                }
              }
            }
          }
          
          result.contactPhone = bestPhone;
        }
      }

      // Extract website links - this often works even on login-required pages
      const websiteLink = $('a[href]').filter((_i, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().toLowerCase();
        return (text.includes("website") || text.includes("visit") || text.includes("site") || text.includes("link")) &&
          href.startsWith("http") && !detectSocialMediaUrl(href);
      }).first().attr("href");
      if (websiteLink) result.websiteUrl = websiteLink;

      // Location extraction - only if not login required
      if (!isLoginRequired) {
        const locationPatterns = [
          /(?:located|based)\s+(?:in|at)\s+([^.!?<]+)/i,
          /(\d+\s+[A-Z][a-z]+\s+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Ct|Pl)\b[^,]*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,?\s*[A-Z]{2}\s*\d{5})/,
        ];
        
        // Use the already defined bodyText or get it again if needed
        const locationBodyText = bodyText || $("body").text();
        for (const pattern of locationPatterns) {
          const match = locationBodyText.match(pattern);
          if (match && match[1]) {
            result.location = match[1].trim().slice(0, 100);
            break;
          }
        }
      }

      const moreSocials = extractSocialLinksFromHtml(html, $);
      if (moreSocials.length > 0) {
        const existing = new Set(result.socialMedia || []);
        for (const s of moreSocials) {
          if (!existing.has(s)) {
            if (!result.socialMedia) result.socialMedia = [];
            result.socialMedia.push(s);
            existing.add(s);
          }
        }
      }

      if (result.websiteUrl && result.websiteUrl !== fullUrl) {
        try {
          console.log(`[scrapeUrlForBusinessInfo] Following website link: ${result.websiteUrl}`);
          const ctrl2 = new AbortController();
          const t2 = setTimeout(() => ctrl2.abort(), 10000);
          const resp2 = await fetch(result.websiteUrl, {
            signal: ctrl2.signal,
            headers: { "User-Agent": getRandomUA(), Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
            redirect: "follow",
          });
          clearTimeout(t2);
          if (resp2.ok) {
            const html2 = await resp2.text();
            const $2 = cheerio.load(html2);
            
            // Check if the external website also requires login or is blocked
            const bodyText2 = $2("body").text().toLowerCase();
            const titleText2 = $2("title").text().toLowerCase();
            const isLoginRequired2 = loginIndicators.some(indicator => 
              bodyText2.includes(indicator) || titleText2.includes(indicator)
            );
            
            if (!isLoginRequired2) {
              if (!result.companyName) {
                const t = $2('meta[property="og:title"]').attr("content")?.trim() || $2("title").text().trim();
                const clean = t?.replace(/\s*[-|].{0,50}$/, "").trim();
                if (clean && clean.length > 1 && clean.length < 80) result.companyName = clean;
              }
              const ci = extractContactInfo(html2, $2, result.websiteUrl);
              if (!result.contactEmail && ci.emails?.length) result.contactEmail = ci.emails[0];
              if (!result.contactPhone && ci.phones?.length) result.contactPhone = ci.phones[0];
              if (!result.description) {
                const d = $2('meta[property="og:description"]').attr("content")?.trim() || $2('meta[name="description"]').attr("content")?.trim();
                if (d) result.description = d.slice(0, 300);
              }
              if (!result.location) {
                const schemas = $2('script[type="application/ld+json"]').toArray();
                for (const s of schemas) {
                  try {
                    const j = JSON.parse($2(s).text());
                    const addr = j.address || j?.["@graph"]?.[0]?.address;
                    if (addr) {
                      const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean);
                      if (parts.length > 0) { result.location = parts.join(", ").slice(0, 100); break; }
                    }
                  } catch {}
                }
              }
              const ws = extractSocialLinksFromHtml(html2, $2);
              const ex = new Set(result.socialMedia || []);
              for (const s of ws) { if (!ex.has(s)) { if (!result.socialMedia) result.socialMedia = []; result.socialMedia.push(s); ex.add(s); } }
            } else {
              console.log(`[scrapeUrlForBusinessInfo] External website ${result.websiteUrl} also requires login`);
            }
          } else {
            console.log(`[scrapeUrlForBusinessInfo] Failed to fetch external website: ${resp2.status}`);
          }
        } catch (err) {
          console.log(`[scrapeUrlForBusinessInfo] Error fetching external website:`, err);
        }
      }
    } else {
      const title = $("title").text().trim();
      const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
      let name = ogTitle || title || "";
      name = name.replace(/\s*[-|].{0,50}$/, "").trim();
      if (name && name.length > 1 && name.length < 80) {
        result.companyName = name;
      }
      result.websiteUrl = parsedUrl.origin;

      const contactInfo = extractContactInfo(html, $, fullUrl);
      if (contactInfo.emails?.length) result.contactEmail = contactInfo.emails[0];
      if (contactInfo.phones?.length) result.contactPhone = contactInfo.phones[0];

      const socials = extractSocialLinksFromHtml(html, $);
      if (socials.length > 0) {
        result.socialMedia = [...(result.socialMedia || []), ...socials];
      }

      const ogDesc = $('meta[property="og:description"]').attr("content")?.trim();
      const metaDesc = $('meta[name="description"]').attr("content")?.trim();
      if (ogDesc) result.description = ogDesc.slice(0, 300);
      else if (metaDesc) result.description = metaDesc.slice(0, 300);

      const addrSchema = $('script[type="application/ld+json"]').toArray();
      for (const script of addrSchema) {
        try {
          const json = JSON.parse($(script).text());
          const addr = json.address || json?.["@graph"]?.[0]?.address;
          if (addr) {
            const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean);
            if (parts.length > 0) {
              result.location = parts.join(", ").slice(0, 100);
              break;
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error("[scrapeUrlForBusinessInfo] Error:", err);
  }

  console.log(`[scrapeUrlForBusinessInfo] Extracted from ${inputUrl}:`, {
    companyName: result.companyName,
    contactEmail: result.contactEmail,
    contactPhone: result.contactPhone,
    websiteUrl: result.websiteUrl,
    socialMedia: result.socialMedia,
    description: result.description?.substring(0, 100) + "..."
  });

  // Add URL fingerprint to help identify if results are actually different
  const urlFingerprint = new URL(fullUrl).hostname + new URL(fullUrl).pathname;
  console.log(`[scrapeUrlForBusinessInfo] URL fingerprint: ${urlFingerprint}`);

  return result;
}

export async function searchBusinessesByName(
  name: string,
  location?: string
): Promise<Array<{
  name: string;
  url?: string;
  phone?: string;
  address?: string;
  source: string;
}>> {
  console.log(`[searchBusinessesByName] Searching for: "${name}"${location ? ` in "${location}"` : ''}`);
  
  const results: Array<{
    name: string;
    url?: string;
    phone?: string;
    address?: string;
    source: string;
  }> = [];
  const seen = new Set<string>();

  const addResult = (r: typeof results[0]) => {
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    results.push(r);
  };

  // Generate multiple search queries for better results
  const baseQuery = location ? `${name} ${location}` : name;
  const searchQueries = [
    `${baseQuery} business`,
    `${baseQuery} official website`,
    `${baseQuery} facebook`,
    `${baseQuery} instagram`, 
    `${baseQuery} yelp`,
    `${name} ${location ? location : ''}`
  ];

  // Search multiple sources
  const searchPromises = searchQueries.map(async (query, index) => {
    try {
      const encodedQuery = encodeURIComponent(query);
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(ddgUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": getRandomUA(),
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);

      if (response.ok) {
        const html = await response.text();
        const $ = cheerio.load(html);
        const queryResults: typeof results = [];
        
        $(".result").each((_i, el) => {
          if (queryResults.length >= 5) return; // Limit per query
          const title = $(el).find(".result__title").text().trim();
          let href = $(el).find(".result__url").text().trim();
          const snippet = $(el).find(".result__snippet").text().trim();
          
          if (!title) return;

          // Extract and normalize URL from DuckDuckGo results
          if (href) {
            // Handle DuckDuckGo redirect URLs
            if (href.includes("uddg=")) {
              try {
                const urlParam = new URL(href, "https://duckduckgo.com").searchParams.get("uddg");
                if (urlParam) href = urlParam;
              } catch {}
            }
            
            // Normalize URL format
            if (!href.startsWith("http")) {
              href = "https://" + href;
            }
            
            // Remove tracking parameters for social media
            if (href.includes("instagram.com") || href.includes("facebook.com")) {
              href = href.split('?')[0].split('#')[0];
            }
          }

          // Enhanced phone extraction with multiple patterns
          const phonePatterns = [
            /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
            /(?:\+?1[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g
          ];
          let phoneMatch = null;
          for (const pattern of phonePatterns) {
            const match = snippet.match(pattern);
            if (match && match[0]) {
              phoneMatch = match[0];
              break;
            }
          }

          // Enhanced address extraction
          const addressPatterns = [
            /(\d+\s+[A-Z][a-z]+[\w\s]+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Ct|Pl)\b[^,]*(?:,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?))/,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\s*\d{5})/,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/
          ];
          let addressMatch = null;
          for (const pattern of addressPatterns) {
            const match = snippet.match(pattern);
            if (match && match[1]) {
              addressMatch = match[1].trim();
              break;
            }
          }

          let cleanName = title.replace(/\s*[-|–—].{0,60}$/, "").trim();
          if (cleanName.length > 60) cleanName = cleanName.slice(0, 60);

          // Determine source based on query and URL
          let source = "web";
          if (query.includes("facebook") || href?.includes("facebook.com")) source = "facebook";
          else if (query.includes("instagram") || href?.includes("instagram.com")) source = "instagram";
          else if (query.includes("yelp") || href?.includes("yelp.com")) source = "yelp";
          else if (query.includes("official")) source = "official";

          queryResults.push({
            name: cleanName,
            url: href || undefined,
            phone: phoneMatch || undefined,
            address: addressMatch || undefined,
            source: source,
          });
          
          // Debug logging for URL extraction
          if (href) {
            console.log(`[searchBusinessesByName] Extracted URL: ${href} for "${cleanName}" (source: ${source})`);
          }
        });
        
        return queryResults;
      }
      return [];
    } catch (err) {
      console.error(`[searchBusinessesByName] Query ${index} error:`, err);
      return [];
    }
  });

  // Execute searches in parallel with delays to avoid rate limiting
  const allResults = [];
  for (let i = 0; i < searchPromises.length; i++) {
    const queryResults = await searchPromises[i];
    allResults.push(...queryResults);
    
    // Add delay between queries to avoid rate limiting
    if (i < searchPromises.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Sort results by relevance (official/social media first, then by name match)
  allResults.sort((a, b) => {
    const aScore = (a.source === 'official' ? 3 : a.source !== 'web' ? 2 : 0) + 
                   (a.name.toLowerCase().includes(name.toLowerCase()) ? 1 : 0);
    const bScore = (b.source === 'official' ? 3 : b.source !== 'web' ? 2 : 0) + 
                   (b.name.toLowerCase().includes(name.toLowerCase()) ? 1 : 0);
    return bScore - aScore;
  });

  // Add results with deduplication
  allResults.forEach(result => addResult(result));

  console.log(`[searchBusinessesByName] Found ${results.length} results for "${name}"`);
  return results.slice(0, 8); // Limit to 8 results
}

// Job Scraping Functions
export async function scrapeJobsFromMultipleSources(keywords: string[]): Promise<ScrapedJob[]> {
  const allJobs: ScrapedJob[] = [];
  
  try {
    // Scrape from different job sources with advanced platforms
    const [indeedJobs, remoteOkJobs, linkedInJobs, glassdoorJobs, angelListJobs, stackOverflowJobs, githubJobs] = await Promise.allSettled([
      scrapeIndeedJobs(keywords),
      scrapeRemoteOkJobs(keywords),
      scrapeLinkedInJobs(keywords),
      scrapeGlassdoorJobs(keywords),
      scrapeAngelListJobs(keywords),
      scrapeStackOverflowJobs(keywords),
      scrapeGitHubJobs(keywords)
    ]);
    
    // Collect successful results
    if (indeedJobs.status === 'fulfilled') {
      allJobs.push(...indeedJobs.value);
    }
    if (remoteOkJobs.status === 'fulfilled') {
      allJobs.push(...remoteOkJobs.value);
    }
    if (linkedInJobs.status === 'fulfilled') {
      allJobs.push(...linkedInJobs.value);
    }
    if (glassdoorJobs.status === 'fulfilled') {
      allJobs.push(...glassdoorJobs.value);
    }
    if (angelListJobs.status === 'fulfilled') {
      allJobs.push(...angelListJobs.value);
    }
    if (stackOverflowJobs.status === 'fulfilled') {
      allJobs.push(...stackOverflowJobs.value);
    }
    if (githubJobs.status === 'fulfilled') {
      allJobs.push(...githubJobs.value);
    }
    
    console.log(`[scrapeJobsFromMultipleSources] Total jobs scraped: ${allJobs.length}`);
    return allJobs;
  } catch (error) {
    console.error('[scrapeJobsFromMultipleSources] Error:', error);
    return [];
  }
}

// Advanced Deduplication and Job Scoring System
interface JobScore {
  relevanceScore: number;
  qualityScore: number;
  freshnessScore: number;
  platformScore: number;
  totalScore: number;
}

function calculateJobScore(job: ScrapedJob | ScrapedFreelanceProject, keywords: string[]): JobScore {
  let relevanceScore = 0;
  let qualityScore = 0;
  let freshnessScore = 0;
  let platformScore = 0;
  
  // Relevance scoring based on keyword matching
  const titleAndDesc = `${job.title} ${job.description}`.toLowerCase();
  keywords.forEach(keyword => {
    if (titleAndDesc.includes(keyword.toLowerCase())) {
      relevanceScore += 10;
    }
  });
  
  // Quality scoring based on description length and details
  if (job.description && job.description.length > 100) {
    qualityScore += 5;
  }
  const salary = 'salary' in job ? job.salary : ('budget' in job ? job.budget : undefined);
  if (salary && salary !== 'Competitive' && salary !== 'Negotiable') {
    qualityScore += 3;
  }
  const requirements = 'requirements' in job ? job.requirements : ('skills' in job ? job.skills : []);
  if (requirements && requirements.length > 0) {
    qualityScore += 2;
  }
  
  // Freshness scoring
  if (job.postedDate.includes('hour') || job.postedDate.includes('minute')) {
    freshnessScore = 10;
  } else if (job.postedDate.includes('day')) {
    freshnessScore = 7;
  } else if (job.postedDate.includes('week')) {
    freshnessScore = 4;
  } else {
    freshnessScore = 1;
  }
  
  // Platform scoring (premium platforms get higher scores)
  const platformScores: Record<string, number> = {
    'LinkedIn': 10,
    'Glassdoor': 9,
    'AngelList': 8,
    'Indeed': 8,
    'Stack Overflow': 7,
    'GitHub': 7,
    'Upwork': 6,
    'Freelancer.com': 6,
    'PeoplePerHour': 5,
    'Guru': 5,
    'Fiverr': 4,
    'RemoteOK': 6,
    'Facebook Groups': 3,
    'Reddit': 3
  };
  
  platformScore = platformScores[job.source] || 1;
  
  const totalScore = relevanceScore + qualityScore + freshnessScore + platformScore;
  
  return {
    relevanceScore,
    qualityScore,
    freshnessScore,
    platformScore,
    totalScore
  };
}

function advancedDeduplication(jobs: (ScrapedJob | ScrapedFreelanceProject)[]): (ScrapedJob | ScrapedFreelanceProject)[] {
  const seen = new Set<string>();
  const deduplicated: (ScrapedJob | ScrapedFreelanceProject)[] = [];
  
  // Sort by score first to keep highest quality jobs
  const jobsWithScores = jobs.map(job => ({
    job,
    score: calculateJobScore(job, ['web developer', 'react', 'node.js', 'javascript'])
  }));
  
  jobsWithScores.sort((a, b) => b.score.totalScore - a.score.totalScore);
  
  for (const { job } of jobsWithScores) {
    // Create multiple deduplication keys
    const company = 'company' in job ? job.company : ('postedBy' in job ? job.postedBy : '');
    const salary = 'salary' in job ? job.salary : ('budget' in job ? job.budget : '');
    
    const keys = [
      // Title similarity
      job.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim(),
      // Company + title combination
      `${company?.toLowerCase() || ''}-${job.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()}`,
      // URL domain
      job.url ? new URL(job.url).hostname : '',
      // Salary + title for similar positions
      `${salary || ''}-${job.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()}`
    ];
    
    let isDuplicate = false;
    for (const key of keys) {
      if (seen.has(key)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(job);
      keys.forEach(key => seen.add(key));
    }
  }
  
  return deduplicated;
}

// Enhanced job scraping with advanced features
export async function scrapeJobsWithIntelligence(keywords: string[]): Promise<{
  jobs: ScrapedJob[];
  projects: ScrapedFreelanceProject[];
  stats: {
    totalJobs: number;
    totalProjects: number;
    platformsScraped: string[];
    averageScore: number;
    topPlatforms: string[];
  };
}> {
  console.log('[scrapeJobsWithIntelligence] Starting advanced job scraping...');
  
  // Scrape from all sources
  const [jobs, projects] = await Promise.allSettled([
    scrapeJobsFromMultipleSources(keywords),
    scrapeFreelanceProjects(keywords)
  ]);
  
  const allJobs = jobs.status === 'fulfilled' ? jobs.value : [];
  const allProjects = projects.status === 'fulfilled' ? projects.value : [];
  
  // Combine all job listings
  const allListings = [...allJobs, ...allProjects];
  
  // Advanced deduplication
  const deduplicatedListings = advancedDeduplication(allListings);
  
  // Separate back into jobs and projects
  const finalJobs = deduplicatedListings.filter(listing => 'type' in listing) as ScrapedJob[];
  const finalProjects = deduplicatedListings.filter(listing => 'budgetType' in listing) as ScrapedFreelanceProject[];
  
  // Calculate statistics
  const platformsScraped = Array.from(new Set(allListings.map(job => job.source)));
  const allScores = allListings.map(job => calculateJobScore(job, keywords));
  const averageScore = allScores.reduce((sum, score) => sum + score.totalScore, 0) / allScores.length;
  
  const platformCounts = platformsScraped.map(platform => ({
    platform,
    count: allListings.filter(job => job.source === platform).length
  }));
  
  const topPlatforms = platformCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(p => p.platform);
  
  console.log(`[scrapeJobsWithIntelligence] Completed: ${finalJobs.length} jobs, ${finalProjects.length} projects from ${platformsScraped.length} platforms`);
  
  return {
    jobs: finalJobs,
    projects: finalProjects,
    stats: {
      totalJobs: finalJobs.length,
      totalProjects: finalProjects.length,
      platformsScraped,
      averageScore: Math.round(averageScore),
      topPlatforms
    }
  };
}

async function scrapeIndeedJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web developer`);
      const url = `https://www.indeed.com/jobs?q=${searchQuery}&l=Remote&fromage=7`;
      
      console.log(`[scrapeIndeedJobs] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeIndeedJobs] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.job_seen_beacon').each((index, element) => {
        if (jobs.length >= 10) return false;
        
        const titleElement = $(element).find('.jobTitle a');
        const title = titleElement.text().trim();
        const jobUrl = titleElement.attr('href') || '';
        
        const companyElement = $(element).find('.companyName a');
        const company = companyElement.text().trim();
        
        const locationElement = $(element).find('.companyLocation');
        const location = locationElement.text().trim() || 'Remote';
        
        const descriptionElement = $(element).find('.job-snippet');
        const description = descriptionElement.text().trim();
        
        const postedElement = $(element).find('.date');
        const postedDate = postedElement.text().trim() || 'Recently posted';
        
        const salaryElement = $(element).find('.salary-snippet');
        const salary = salaryElement.text().trim() || 'Competitive';
        
        // Extract skills from description
        const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'WordPress', 'MongoDB', 'PostgreSQL'];
        const technologies = techKeywords.filter(tech => 
          description.toLowerCase().includes(tech.toLowerCase())
        );
        
        if (title && title.length > 10) {
          jobs.push({
            id: `indeed-${Date.now()}-${index}`,
            title,
            company,
            location,
            salary,
            type: 'Full-time',
            experience: 'intermediate',
            description: description || `Looking for a ${title}`,
            requirements: technologies,
            postedDate,
            source: 'Indeed',
            url: jobUrl.startsWith('http') ? jobUrl : `https://www.indeed.com${jobUrl}`,
            technologies,
            remote: location.toLowerCase().includes('remote'),
          });
        }
      });
      
      await delay(1500 + Math.random() * 2000);
    }
  } catch (error) {
    console.error('[scrapeIndeedJobs] Error:', error);
  }
  
  return jobs;
}

// Advanced Platform Scraping Functions
async function scrapeRemoteOkJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    const url = 'https://remoteok.io/remote-dev-jobs';
    
    console.log(`[scrapeRemoteOkJobs] Scraping: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    
    if (!response.ok) {
      console.log(`[scrapeRemoteOkJobs] Failed to fetch: ${response.status}`);
      return jobs;
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('.job').each((index, element) => {
      if (jobs.length >= 12) return false;
      
      const $job = $(element);
      const title = $job.find('h2 a, .title').text().trim();
      const company = $job.find('.company a, .company').text().trim();
      const location = $job.find('.location').text().trim() || 'Remote';
      const salary = $job.find('.salary').text().trim() || 'Competitive';
      const tags = $job.find('.tag').map((_, el) => $(el).text().trim()).get();
      const postedDate = $job.find('.time').text().trim() || 'Recently';
      const jobUrl = $job.find('h2 a, a').attr('href') || '';
      
      if (!title) return;
      
      const devKeywords = ['developer', 'engineer', 'programmer', 'frontend', 'backend'];
      const isDevJob = devKeywords.some(keyword => 
        title.toLowerCase().includes(keyword) || 
        tags.some(tag => tag.toLowerCase().includes(keyword))
      );
      
      if (!isDevJob) return;
      
      const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript'];
      const technologies = tags.filter(tag => 
        techKeywords.some(tech => tag.toLowerCase().includes(tech.toLowerCase()))
      );
      
      jobs.push({
        id: `remoteok-${Date.now()}-${index}`,
        title,
        company: company || 'Remote Company',
        location: 'Remote',
        salary,
        type: 'full-time',
        experience: 'mid',
        description: `Remote opportunity for a ${title}`,
        requirements: ['Remote work experience', 'Self-motivated'],
        postedDate,
        source: 'RemoteOK',
        url: jobUrl.startsWith('http') ? jobUrl : `https://remoteok.io${jobUrl}`,
        technologies,
        remote: true
      });
    });
    
  } catch (error) {
    console.error('[scrapeRemoteOkJobs] Error:', error);
  }
  
  return jobs;
}

function extractRequirements(text: string): string[] {
  const requirements: string[] = [];
  
  const patterns = [
    /\d+\+? years? (?:of )?(?:experience|exp)/gi,
    /bachelor'?s? degree/i,
    /react|vue|angular|node\.?js|python|javascript|typescript/gi,
    /communication skills?/gi,
    /problem solving/gi,
    /remote work/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      requirements.push(...matches.map(m => m.charAt(0).toUpperCase() + m.slice(1)));
    }
  });
  
  return Array.from(new Set(requirements)).slice(0, 5);
}

// Freelance Platform Scraping Functions
export async function scrapeFreelanceProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const allProjects: ScrapedFreelanceProject[] = [];
  
  try {
    // Scrape from different freelance platforms
    const [upworkProjects, fiverrProjects, freelancerProjects, pphProjects, guruProjects, facebookProjects, redditProjects] = await Promise.allSettled([
      scrapeUpworkProjects(keywords),
      scrapeFiverrProjects(keywords),
      scrapeFreelancerComProjects(keywords),
      scrapePeoplePerHourProjects(keywords),
      scrapeGuruProjects(keywords),
      scrapeFacebookGroups(keywords),
      scrapeRedditProjects(keywords)
    ]);
    
    // Collect successful results
    if (upworkProjects.status === 'fulfilled') {
      allProjects.push(...upworkProjects.value);
    }
    if (fiverrProjects.status === 'fulfilled') {
      allProjects.push(...fiverrProjects.value);
    }
    if (freelancerProjects.status === 'fulfilled') {
      allProjects.push(...freelancerProjects.value);
    }
    if (pphProjects.status === 'fulfilled') {
      allProjects.push(...pphProjects.value);
    }
    if (guruProjects.status === 'fulfilled') {
      allProjects.push(...guruProjects.value);
    }
    if (facebookProjects.status === 'fulfilled') {
      allProjects.push(...facebookProjects.value);
    }
    if (redditProjects.status === 'fulfilled') {
      allProjects.push(...redditProjects.value);
    }
    
    console.log(`[scrapeFreelanceProjects] Total projects scraped: ${allProjects.length}`);
    return allProjects;
  } catch (error) {
    console.error('[scrapeFreelanceProjects] Error:', error);
    return [];
  }
}

async function scrapeUpworkProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web development`);
      const url = `https://www.upwork.com/nx/search/jobs/?q=${searchQuery}&sort=recency`;
      
      console.log(`[scrapeUpworkProjects] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeUpworkProjects] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.job-tile').each((index, element) => {
        if (projects.length >= 8) return false;
        
        const $project = $(element);
        const title = $project.find('.job-tile-title').text().trim();
        const description = $project.find('.job-description').text().trim();
        const budget = $project.find('.budget').text().trim();
        const duration = $project.find('.duration').text().trim();
        const skills = $project.find('.skill-name').map((_, el) => $(el).text().trim()).get();
        const postedBy = $project.find('.client-info').text().trim();
        const postedDate = $project.find('.posted-on').text().trim() || 'Recently';
        const projectUrl = $project.find('.job-tile-title').attr('href') || '';
        const applicantsText = $project.find('.talent-number').text().trim();
        const applicants = parseInt(applicantsText.match(/\d+/)?.[0] || '0');
        
        if (!title) return;
        
        // Determine budget type
        let budgetType: 'fixed' | 'hourly' | 'negotiable' = 'fixed';
        if (budget.toLowerCase().includes('hourly') || budget.toLowerCase().includes('/hr')) {
          budgetType = 'hourly';
        } else if (budget.toLowerCase().includes('negotiable')) {
          budgetType = 'negotiable';
        }
        
        // Determine experience level
        let experience = 'mid';
        if (title.toLowerCase().includes('senior') || title.toLowerCase().includes('expert')) {
          experience = 'senior';
        } else if (title.toLowerCase().includes('junior') || title.toLowerCase().includes('beginner')) {
          experience = 'entry';
        }
        
        projects.push({
          id: `upwork-${Date.now()}-${index}`,
          title,
          description: description || `Looking for a ${title}`,
          budget: budget || 'Negotiable',
          budgetType,
          skills: skills.slice(0, 5),
          experience,
          duration: duration || 'Flexible',
          postedBy: postedBy || 'Client',
          postedDate,
          source: 'Upwork',
          url: projectUrl.startsWith('http') ? projectUrl : `https://www.upwork.com${projectUrl}`,
          tags: skills.slice(0, 3),
          location: 'Remote',
          remote: true,
          applicants
        });
      });
      
      await delay(1500 + Math.random() * 2000);
    }
  } catch (error) {
    console.error('[scrapeUpworkProjects] Error:', error);
  }
  
  return projects;
}

async function scrapeFiverrProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web development`);
      const url = `https://www.fiverr.com/search/gigs?query=${searchQuery}&source=auto&refine_by=delivery_time%3A2`;
      
      console.log(`[scrapeFiverrProjects] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeFiverrProjects] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.gig-card').each((index, element) => {
        if (projects.length >= 8) return false;
        
        const $project = $(element);
        const title = $project.find('.gig-title').text().trim();
        const description = $project.find('.gig-description').text().trim();
        const price = $project.find('.gig-price').text().trim();
        const seller = $project.find('.seller-name').text().trim();
        const rating = $project.find('.gig-rating').text().trim();
        const reviews = $project.find('.gig-reviews').text().trim();
        const projectUrl = $project.find('.gig-title').attr('href') || '';
        
        if (!title) return;
        
        // Extract skills from title
        const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'WordPress'];
        const skills = techKeywords.filter(tech => 
          title.toLowerCase().includes(tech.toLowerCase())
        );
        
        projects.push({
          id: `fiverr-${Date.now()}-${index}`,
          title,
          description: description || `Professional ${title} service`,
          budget: price || 'Starting at $5',
          budgetType: 'fixed',
          skills,
          experience: 'mid',
          duration: 'Express delivery',
          postedBy: seller || 'Freelancer',
          postedDate: 'Available now',
          source: 'Fiverr',
          url: projectUrl.startsWith('http') ? projectUrl : `https://www.fiverr.com${projectUrl}`,
          tags: skills.slice(0, 2),
          location: 'Remote',
          remote: true,
          applicants: 0
        });
      });
      
      await delay(1200 + Math.random() * 1800);
    }
  } catch (error) {
    console.error('[scrapeFiverrProjects] Error:', error);
  }
  
  return projects;
}

async function scrapeFacebookGroups(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    // Note: Facebook scraping is more complex due to authentication requirements
    // This is a simplified version that would need Facebook API access in production
    const facebookGroups = [
      'Web Developers & Designers',
      'React Developers Community',
      'Node.js Developers',
      'Freelance Web Development Jobs'
    ];
    
    for (const groupName of facebookGroups.slice(0, 2)) {
      // Simulate Facebook group scraping
      console.log(`[scrapeFacebookGroups] Simulating scraping: ${groupName}`);
      
      // Simulate projects found in Facebook groups
      const mockProjects = [
        {
          title: `Looking for React Developer - ${groupName}`,
          description: 'Need an experienced React developer for a new e-commerce project',
          budget: '$50-$75/hour',
          budgetType: 'hourly' as const,
          skills: ['React', 'JavaScript', 'CSS'],
          experience: 'mid',
          duration: '2-3 months',
          postedBy: 'Project Manager',
          postedDate: '2 hours ago',
          source: 'Facebook Groups',
          url: '#',
          tags: ['react', 'ecommerce'],
          location: 'Remote',
          remote: true,
          applicants: Math.floor(Math.random() * 20)
        },
        {
          title: `WordPress Website Needed - ${groupName}`,
          description: 'Small business needs a professional WordPress website built',
          budget: '$500-800',
          budgetType: 'fixed' as const,
          skills: ['WordPress', 'PHP', 'HTML/CSS'],
          experience: 'mid',
          duration: '2-3 weeks',
          postedBy: 'Business Owner',
          postedDate: '5 hours ago',
          source: 'Facebook Groups',
          url: '#',
          tags: ['wordpress', 'php'],
          location: 'Remote',
          remote: true,
          applicants: Math.floor(Math.random() * 15)
        }
      ];
      
      mockProjects.forEach((project, index) => {
        projects.push({
          id: `facebook-${Date.now()}-${index}`,
          ...project
        });
      });
      
      await delay(800 + Math.random() * 1200);
    }
  } catch (error) {
    console.error('[scrapeFacebookGroups] Error:', error);
  }
  
  return projects;
}

async function scrapeRedditProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    const subreddits = [
      'freelance',
      'webdev',
      'forhire',
      'reactjs',
      'node'
    ];
    
    for (const subreddit of subreddits.slice(0, 2)) {
      const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`;
      
      console.log(`[scrapeRedditProjects] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeRedditProjects] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      data.data.children.forEach((post: any, index: number) => {
        if (projects.length >= 6) return false;
        
        const title = post.data.title;
        const description = post.data.selftext || post.data.title;
        const postedBy = post.data.author;
        const postedDate = new Date(post.data.created_utc * 1000).toLocaleString();
        const comments = post.data.num_comments;
        const postUrl = `https://reddit.com${post.data.permalink}`;
        
        // Check if it's a hiring post
        const hiringKeywords = ['hiring', 'for hire', 'looking for', 'need', 'seeking', 'available'];
        const isHiringPost = hiringKeywords.some(keyword => 
          title.toLowerCase().includes(keyword) || 
          description.toLowerCase().includes(keyword)
        );
        
        if (!isHiringPost) return;
        
        // Extract skills from title
        const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'WordPress'];
        const skills = techKeywords.filter(tech => 
          title.toLowerCase().includes(tech.toLowerCase()) || 
          description.toLowerCase().includes(tech.toLowerCase())
        );
        
        // Extract budget information
        let budget = 'Negotiable';
        let budgetType: 'fixed' | 'hourly' | 'negotiable' = 'negotiable';
        
        const budgetMatch = description.match(/\$\d+(?:\.\d+)?(?:\s*[-–]\s*\$?\d+(?:\.\d+)?)?\s*(?:\/\s*hr|hour|per hour)/i);
        if (budgetMatch) {
          budget = budgetMatch[0];
          budgetType = 'hourly';
        } else if (description.match(/\$\d+/)) {
          budgetType = 'fixed';
        }
        
        projects.push({
          id: `reddit-${Date.now()}-${index}`,
          title,
          description: description.substring(0, 500),
          budget,
          budgetType,
          skills: skills.slice(0, 4),
          experience: 'mid',
          duration: 'Flexible',
          postedBy,
          postedDate,
          source: 'Reddit',
          url: postUrl,
          tags: skills.slice(0, 2),
          location: 'Remote',
          remote: true,
          applicants: comments
        });
      });
      
      await delay(1000 + Math.random() * 1500);
    }
  } catch (error) {
    console.error('[scrapeRedditProjects] Error:', error);
  }
  
  return projects;
}

// Additional Platform Scraping Functions
async function scrapeFreelancerComProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web development`);
      const url = `https://www.freelancer.com/search/projects/?keyword=${searchQuery}`;
      
      console.log(`[scrapeFreelancerComProjects] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeFreelancerComProjects] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.JobSearchCard').each((index, element) => {
        if (projects.length >= 8) return false;
        
        const titleElement = $(element).find('.JobSearchCard-primary-link');
        const title = titleElement.text().trim();
        const projectUrl = titleElement.attr('href') || '';
        
        const description = $(element).find('.JobSearchCard-description').text().trim();
        const budgetElement = $(element).find('.JobSearchCard-average-bid');
        const budget = budgetElement.text().trim() || 'Negotiable';
        
        const skillsElement = $(element).find('.JobSearchCard-skills');
        const skills = skillsElement.text().split(',').map(s => s.trim()).filter(s => s);
        
        const bidsElement = $(element).find('.JobSearchCard-bids');
        const bids = bidsElement.text().match(/\d+/)?.[0] || '0';
        
        const timeElement = $(element).find('.JobSearchCard-duration');
        const duration = timeElement.text().trim() || 'Flexible';
        
        if (title && title.length > 10) {
          projects.push({
            id: `freelancer-${Date.now()}-${index}`,
            title,
            description: description || `Looking for a ${title}`,
            budget,
            budgetType: budget.includes('$') ? 'fixed' : 'hourly',
            skills: skills.length > 0 ? skills : ['web development'],
            experience: 'intermediate',
            duration,
            postedBy: 'Client',
            postedDate: 'Recently posted',
            source: 'Freelancer.com',
            url: projectUrl.startsWith('http') ? projectUrl : `https://www.freelancer.com${projectUrl}`,
            tags: skills.slice(0, 3),
            location: 'Remote',
            remote: true,
            applicants: parseInt(bids) || 0,
          });
        }
      });
      
      await delay(1500 + Math.random() * 2000);
    }
  } catch (error) {
    console.error('[scrapeFreelancerComProjects] Error:', error);
  }
  
  return projects;
}

async function scrapePeoplePerHourProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web development`);
      const url = `https://www.peopleperhour.com/search/projects?q=${searchQuery}`;
      
      console.log(`[scrapePeoplePerHourProjects] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapePeoplePerHourProjects] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.project-card').each((index, element) => {
        if (projects.length >= 8) return false;
        
        const titleElement = $(element).find('.project-title a');
        const title = titleElement.text().trim();
        const projectUrl = titleElement.attr('href') || '';
        
        const description = $(element).find('.project-description').text().trim();
        const budgetElement = $(element).find('.project-budget');
        const budget = budgetElement.text().trim() || 'Negotiable';
        
        const skillsElement = $(element).find('.skill-tag');
        const skills: string[] = [];
        skillsElement.each((_, skillEl) => {
          skills.push($(skillEl).text().trim());
        });
        
        const timeElement = $(element).find('.project-duration');
        const duration = timeElement.text().trim() || 'Flexible';
        
        const proposalsElement = $(element).find('.proposals-count');
        const proposals = proposalsElement.text().match(/\d+/)?.[0] || '0';
        
        if (title && title.length > 10) {
          projects.push({
            id: `pph-${Date.now()}-${index}`,
            title,
            description: description || `Looking for a ${title}`,
            budget,
            budgetType: budget.includes('/hr') ? 'hourly' : 'fixed',
            skills: skills.length > 0 ? skills : ['web development'],
            experience: 'intermediate',
            duration,
            postedBy: 'Client',
            postedDate: 'Recently posted',
            source: 'PeoplePerHour',
            url: projectUrl.startsWith('http') ? projectUrl : `https://www.peopleperhour.com${projectUrl}`,
            tags: skills.slice(0, 3),
            location: 'Remote',
            remote: true,
            applicants: parseInt(proposals) || 0,
          });
        }
      });
      
      await delay(1200 + Math.random() * 1800);
    }
  } catch (error) {
    console.error('[scrapePeoplePerHourProjects] Error:', error);
  }
  
  return projects;
}

async function scrapeGuruProjects(keywords: string[]): Promise<ScrapedFreelanceProject[]> {
  const projects: ScrapedFreelanceProject[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web development`);
      const url = `https://www.guru.com/d/jobs/?q=${searchQuery}`;
      
      console.log(`[scrapeGuruProjects] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeGuruProjects] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.jobCard').each((index, element) => {
        if (projects.length >= 8) return false;
        
        const titleElement = $(element).find('.jobTitle a');
        const title = titleElement.text().trim();
        const projectUrl = titleElement.attr('href') || '';
        
        const description = $(element).find('.jobDescription').text().trim();
        const budgetElement = $(element).find('.payRate');
        const budget = budgetElement.text().trim() || 'Negotiable';
        
        const skillsElement = $(element).find('.skill');
        const skills: string[] = [];
        skillsElement.each((_, skillEl) => {
          skills.push($(skillEl).text().trim());
        });
        
        const timeElement = $(element).find('.duration');
        const duration = timeElement.text().trim() || 'Flexible';
        
        const proposalsElement = $(element).find('.proposals');
        const proposals = proposalsElement.text().match(/\d+/)?.[0] || '0';
        
        if (title && title.length > 10) {
          projects.push({
            id: `guru-${Date.now()}-${index}`,
            title,
            description: description || `Looking for a ${title}`,
            budget,
            budgetType: budget.includes('/hr') ? 'hourly' : 'fixed',
            skills: skills.length > 0 ? skills : ['web development'],
            experience: 'intermediate',
            duration,
            postedBy: 'Client',
            postedDate: 'Recently posted',
            source: 'Guru',
            url: projectUrl.startsWith('http') ? projectUrl : `https://www.guru.com${projectUrl}`,
            tags: skills.slice(0, 3),
            location: 'Remote',
            remote: true,
            applicants: parseInt(proposals) || 0,
          });
        }
      });
      
      await delay(1300 + Math.random() * 1900);
    }
  } catch (error) {
    console.error('[scrapeGuruProjects] Error:', error);
  }
  
  return projects;
}

async function scrapeLinkedInJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web developer`);
      const url = `https://www.linkedin.com/jobs/search/?keywords=${searchQuery}&location=Remote&f_TPR=r86400`;
      
      console.log(`[scrapeLinkedInJobs] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeLinkedInJobs] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.jobs-search__results-list li').each((index, element) => {
        if (jobs.length >= 10) return false;
        
        const titleElement = $(element).find('.base-card__full-link');
        const title = titleElement.text().trim();
        const jobUrl = titleElement.attr('href') || '';
        
        const companyElement = $(element).find('.hidden-nested-link');
        const company = companyElement.text().trim();
        
        const locationElement = $(element).find('.job-search-card__location');
        const location = locationElement.text().trim() || 'Remote';
        
        const descriptionElement = $(element).find('.base-search-card__subtitle');
        const description = descriptionElement.text().trim();
        
        const postedElement = $(element).find('.job-search-card__listitem');
        const postedDate = postedElement.text().trim() || 'Recently posted';
        
        const salaryElement = $(element).find('.job-search-card__salary-info');
        const salary = salaryElement.text().trim() || 'Competitive';
        
        // Extract skills from description
        const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'WordPress', 'MongoDB', 'PostgreSQL'];
        const technologies = techKeywords.filter(tech => 
          description.toLowerCase().includes(tech.toLowerCase())
        );
        
        if (title && title.length > 10) {
          jobs.push({
            id: `linkedin-${Date.now()}-${index}`,
            title,
            company,
            location,
            salary,
            type: 'Full-time',
            experience: 'intermediate',
            description: description || `Looking for a ${title}`,
            requirements: technologies,
            postedDate,
            source: 'LinkedIn',
            url: jobUrl.startsWith('http') ? jobUrl : `https://www.linkedin.com${jobUrl}`,
            technologies,
            remote: location.toLowerCase().includes('remote'),
          });
        }
      });
      
      await delay(2000 + Math.random() * 2000);
    }
  } catch (error) {
    console.error('[scrapeLinkedInJobs] Error:', error);
  }
  
  return jobs;
}

// Advanced Platform Scraping Functions
async function scrapeGlassdoorJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web developer`);
      const url = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${searchQuery}&locT=C&locId=1147401&locType=2&jobType=all&fromAge=1`;
      
      console.log(`[scrapeGlassdoorJobs] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeGlassdoorJobs] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.jobContainer').each((index, element) => {
        if (jobs.length >= 8) return false;
        
        const titleElement = $(element).find('.jobTitle a');
        const title = titleElement.text().trim();
        const jobUrl = titleElement.attr('href') || '';
        
        const companyElement = $(element).find('.jobInfoItem .empName');
        const company = companyElement.text().trim();
        
        const locationElement = $(element).find('.jobInfoItem .loc');
        const location = locationElement.text().trim() || 'Remote';
        
        const salaryElement = $(element).find('.salaryEstimate');
        const salary = salaryElement.text().trim() || 'Competitive';
        
        const descriptionElement = $(element).find('.jobDescription');
        const description = descriptionElement.text().trim();
        
        const postedElement = $(element).find('.jobInfoItem .minor');
        const postedDate = postedElement.text().trim() || 'Recently posted';
        
        const ratingElement = $(element).find('.ratingNumber');
        const rating = ratingElement.text().trim() || 'N/A';
        
        // Extract skills from description
        const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'WordPress', 'MongoDB', 'PostgreSQL'];
        const technologies = techKeywords.filter(tech => 
          description.toLowerCase().includes(tech.toLowerCase())
        );
        
        if (title && title.length > 10) {
          jobs.push({
            id: `glassdoor-${Date.now()}-${index}`,
            title,
            company,
            location,
            salary,
            type: 'Full-time',
            experience: 'intermediate',
            description: description || `Looking for a ${title}`,
            requirements: technologies,
            postedDate,
            source: 'Glassdoor',
            url: jobUrl.startsWith('http') ? jobUrl : `https://www.glassdoor.com${jobUrl}`,
            technologies,
            remote: location.toLowerCase().includes('remote'),
          });
        }
      });
      
      await delay(1800 + Math.random() * 2200);
    }
  } catch (error) {
    console.error('[scrapeGlassdoorJobs] Error:', error);
  }
  
  return jobs;
}

async function scrapeAngelListJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web developer`);
      const url = `https://www.wellfound.com/jobs?keyword=${searchQuery}&location_ids[]=US&remote=true`;
      
      console.log(`[scrapeAngelListJobs] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeAngelListJobs] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.job-item').each((index, element) => {
        if (jobs.length >= 8) return false;
        
        const titleElement = $(element).find('.job-title a');
        const title = titleElement.text().trim();
        const jobUrl = titleElement.attr('href') || '';
        
        const companyElement = $(element).find('.company-name');
        const company = companyElement.text().trim();
        
        const locationElement = $(element).find('.location');
        const location = locationElement.text().trim() || 'Remote';
        
        const salaryElement = $(element).find('.salary');
        const salary = salaryElement.text().trim() || 'Competitive';
        
        const descriptionElement = $(element).find('.job-description');
        const description = descriptionElement.text().trim();
        
        const postedElement = $(element).find('.posted-date');
        const postedDate = postedElement.text().trim() || 'Recently posted';
        
        const sizeElement = $(element).find('.company-size');
        const companySize = sizeElement.text().trim() || 'Startup';
        
        // Extract skills from description
        const techKeywords = ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'WordPress', 'MongoDB', 'PostgreSQL'];
        const technologies = techKeywords.filter(tech => 
          description.toLowerCase().includes(tech.toLowerCase())
        );
        
        if (title && title.length > 10) {
          jobs.push({
            id: `angellist-${Date.now()}-${index}`,
            title,
            company,
            location,
            salary,
            type: 'Full-time',
            experience: 'intermediate',
            description: description || `Looking for a ${title}`,
            requirements: technologies,
            postedDate,
            source: 'AngelList',
            url: jobUrl.startsWith('http') ? jobUrl : `https://www.wellfound.com${jobUrl}`,
            technologies,
            remote: location.toLowerCase().includes('remote'),
          });
        }
      });
      
      await delay(1600 + Math.random() * 2000);
    }
  } catch (error) {
    console.error('[scrapeAngelListJobs] Error:', error);
  }
  
  return jobs;
}

async function scrapeStackOverflowJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web developer`);
      const url = `https://stackoverflow.com/jobs?q=${searchQuery}&l=Remote&d=20`;
      
      console.log(`[scrapeStackOverflowJobs] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeStackOverflowJobs] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.-job').each((index, element) => {
        if (jobs.length >= 8) return false;
        
        const titleElement = $(element).find('.-title a');
        const title = titleElement.text().trim();
        const jobUrl = titleElement.attr('href') || '';
        
        const companyElement = $(element).find('.-company');
        const company = companyElement.text().trim();
        
        const locationElement = $(element).find('.-location');
        const location = locationElement.text().trim() || 'Remote';
        
        const salaryElement = $(element).find('.-salary');
        const salary = salaryElement.text().trim() || 'Competitive';
        
        const descriptionElement = $(element).find('.-summary');
        const description = descriptionElement.text().trim();
        
        const postedElement = $(element).find('.-posted');
        const postedDate = postedElement.text().trim() || 'Recently posted';
        
        const tagsElement = $(element).find('.-tags .-tag');
        const technologies: string[] = [];
        tagsElement.each((_, tagEl) => {
          technologies.push($(tagEl).text().trim());
        });
        
        if (title && title.length > 10) {
          jobs.push({
            id: `stackoverflow-${Date.now()}-${index}`,
            title,
            company,
            location,
            salary,
            type: 'Full-time',
            experience: 'intermediate',
            description: description || `Looking for a ${title}`,
            requirements: technologies,
            postedDate,
            source: 'Stack Overflow',
            url: jobUrl.startsWith('http') ? jobUrl : `https://stackoverflow.com${jobUrl}`,
            technologies,
            remote: location.toLowerCase().includes('remote'),
          });
        }
      });
      
      await delay(1400 + Math.random() * 1800);
    }
  } catch (error) {
    console.error('[scrapeStackOverflowJobs] Error:', error);
  }
  
  return jobs;
}

async function scrapeGitHubJobs(keywords: string[]): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  
  try {
    for (const keyword of keywords.slice(0, 2)) {
      const searchQuery = encodeURIComponent(`${keyword} web developer`);
      const url = `https://github.com/jobs?q=${searchQuery}&remote=true`;
      
      console.log(`[scrapeGitHubJobs] Scraping: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (!response.ok) {
        console.log(`[scrapeGitHubJobs] Failed to fetch: ${response.status}`);
        continue;
      }
      
      const html = await response.text();
      const $ = cheerio.load(html);
      
      $('.job-item').each((index, element) => {
        if (jobs.length >= 8) return false;
        
        const titleElement = $(element).find('.job-title a');
        const title = titleElement.text().trim();
        const jobUrl = titleElement.attr('href') || '';
        
        const companyElement = $(element).find('.company-name');
        const company = companyElement.text().trim();
        
        const locationElement = $(element).find('.location');
        const location = locationElement.text().trim() || 'Remote';
        
        const salaryElement = $(element).find('.salary');
        const salary = salaryElement.text().trim() || 'Competitive';
        
        const descriptionElement = $(element).find('.job-description');
        const description = descriptionElement.text().trim();
        
        const postedElement = $(element).find('.posted-date');
        const postedDate = postedElement.text().trim() || 'Recently posted';
        
        const tagsElement = $(element).find('.tech-tag');
        const technologies: string[] = [];
        tagsElement.each((_, tagEl) => {
          technologies.push($(tagEl).text().trim());
        });
        
        if (title && title.length > 10) {
          jobs.push({
            id: `github-${Date.now()}-${index}`,
            title,
            company,
            location,
            salary,
            type: 'Full-time',
            experience: 'intermediate',
            description: description || `Looking for a ${title}`,
            requirements: technologies,
            postedDate,
            source: 'GitHub',
            url: jobUrl.startsWith('http') ? jobUrl : `https://github.com${jobUrl}`,
            technologies,
            remote: location.toLowerCase().includes('remote'),
          });
        }
      });
      
      await delay(1500 + Math.random() * 1900);
    }
  } catch (error) {
    console.error('[scrapeGitHubJobs] Error:', error);
  }
  
  return jobs;
}
