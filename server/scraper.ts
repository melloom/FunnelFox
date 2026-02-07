import * as cheerio from "cheerio";

interface ScrapedBusiness {
  name: string;
  url: string;
  description?: string;
  hasWebsite: boolean;
  source?: string;
  phone?: string;
  address?: string;
  socialMedia?: string[];
  bbbRating?: string;
  bbbAccredited?: boolean;
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
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;

function getCacheKey(category: string, location: string, maxResults: number): string {
  return `${category.toLowerCase().trim()}|${location.toLowerCase().trim()}|${maxResults}`;
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

export async function searchBusinesses(
  category: string,
  location: string,
  maxResults: number = 20
): Promise<ScrapedBusiness[]> {
  const cacheKey = getCacheKey(category, location, maxResults);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Cache HIT] "${category}" in "${location}" — returning ${cached.results.length} cached results`);
    return cached.results;
  }

  const businesses: ScrapedBusiness[] = [];

  const bingQueries = [
    `${category} ${location}`,
    `${category} near ${location}`,
    `best ${category} ${location}`,
    `${category} business ${location}`,
  ];

  const ddgQueries = [
    `${category} ${location}`,
    `${category} near ${location}`,
  ];

  const searchFns: (() => Promise<ScrapedBusiness[]>)[] = [];

  for (const query of bingQueries) {
    searchFns.push(() => searchBing(query, maxResults, category));
  }
  for (const query of ddgQueries) {
    searchFns.push(() => searchDuckDuckGo(query, maxResults, category));
  }
  searchFns.push(() => searchSocialMediaOnly(category, location, maxResults));
  searchFns.push(() => searchGoogleMaps(category, location, maxResults));
  searchFns.push(() => searchYellowPages(category, location, maxResults));
  searchFns.push(() => searchYelp(category, location, maxResults));
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
  console.log(`[Cache STORE] "${category}" in "${location}" — cached ${finalResults.length} results`);

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

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const encodedLoc = encodeURIComponent(location);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedLoc}&format=json&limit=1`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FunnelFox/1.0 (lead-discovery-app)",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json() as any[];
    if (data.length === 0) return null;

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

async function searchOpenStreetMap(
  category: string,
  location: string,
  maxResults: number
): Promise<ScrapedBusiness[]> {
  const results: ScrapedBusiness[] = [];

  try {
    const coords = await geocodeLocation(location);
    if (!coords) return results;

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
    const radius = 25000;
    let tagFilters: string;

    if (!osmTags) {
      tagFilters = `node["name"~"${category}",i](around:${radius},${coords.lat},${coords.lon});\nway["name"~"${category}",i](around:${radius},${coords.lat},${coords.lon});`;
    } else {
      tagFilters = osmTags.map((tag) => {
        const eqIdx = tag.indexOf("=");
        if (eqIdx < 0) return "";
        const key = tag.slice(0, eqIdx);
        const val = tag.slice(eqIdx + 1);
        return `node["${key}"="${val}"](around:${radius},${coords.lat},${coords.lon});\nway["${key}"="${val}"](around:${radius},${coords.lat},${coords.lon});`;
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
      const street = tags["addr:street"] || "";
      const houseNum = tags["addr:housenumber"] || "";
      const city = tags["addr:city"] || "";
      const state = tags["addr:state"] || "";

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
    const textQuery = `${category} in ${location}`;
    const url = `https://places.googleapis.com/v1/places:searchText`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.primaryType",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: Math.min(maxResults, 20),
        languageCode: "en",
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Google Places API error:", response.status, await response.text());
      return results;
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

      if (website) {
        const domain = extractDomain(website);
        if (domain && (isExcludedDomain(domain) || isAggregatorSite(domain))) continue;
      }

      results.push({
        name,
        url: website ? normalizeUrl(website) : "",
        description: address || undefined,
        hasWebsite: !!website,
        source: "google-places",
        phone: phone || undefined,
        address: address || undefined,
      });
    }
  } catch (err) {
    console.error("Google Places search error:", err);
  }

  return results;
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
  return `https://image.thum.io/get/width/1280/crop/800/noanimate/${encodeURIComponent(url)}`;
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
