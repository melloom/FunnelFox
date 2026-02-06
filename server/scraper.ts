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

export async function searchBusinesses(
  category: string,
  location: string,
  maxResults: number = 20
): Promise<ScrapedBusiness[]> {
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

  return dedupedList.slice(0, maxResults);
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
  for (const [existingKey, biz] of byName) {
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
        "User-Agent": "LeadHunter/1.0 (lead-discovery-app)",
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
        "User-Agent": "LeadHunter/1.0 (lead-discovery-app)",
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

function extractContactInfo(html: string, $: cheerio.CheerioAPI, baseUrl: string): ExtractedContact {
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

  $('a[href]').each((_i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().toLowerCase().trim();
    if (
      text.includes("contact") ||
      href.toLowerCase().includes("/contact") ||
      href.toLowerCase().includes("/get-in-touch") ||
      href.toLowerCase().includes("/reach-us")
    ) {
      try {
        const resolved = new URL(href, baseUrl).href;
        if (!contactPageUrl) contactPageUrl = resolved;
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
    emails: [...emails].slice(0, 5),
    phones: [...phones].slice(0, 3),
    contactPageUrl,
    hasContactForm: hasContactForm || undefined,
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

  return { emails: [...emails].slice(0, 5), phones: [...phones].slice(0, 3) };
}

export async function analyzeWebsite(targetUrl: string): Promise<WebsiteAnalysis & { socialMedia?: string[]; contactInfo?: ExtractedContact }> {
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

    const hasModernFramework =
      html.includes("__NEXT_DATA__") ||
      html.includes("__NUXT__") ||
      html.includes("reactroot") ||
      html.includes("react-root") ||
      html.includes("ng-app") ||
      html.includes("data-v-") ||
      html.includes("_app.js") ||
      html.includes("webpack") ||
      html.includes("vite");

    if (!hasModernFramework) {
      issues.push("No modern framework detected");
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

    const hasAnalytics =
      html.includes("google-analytics") ||
      html.includes("gtag") ||
      html.includes("analytics.js") ||
      html.includes("ga.js") ||
      html.includes("hotjar") ||
      html.includes("segment") ||
      html.includes("mixpanel") ||
      html.includes("plausible") ||
      html.includes("fathom");

    if (!hasAnalytics) {
      issues.push("No analytics found");
      score -= 5;
    }

    const images = $("img");
    const imagesWithAlt = $("img[alt]").filter((_i, el) => {
      const alt = $(el).attr("alt");
      return !!alt && alt.trim().length > 0;
    });
    if (images.length > 0 && imagesWithAlt.length < images.length * 0.5) {
      issues.push("Images missing alt text");
      score -= 5;
    }

    if (html.length > 500000) {
      issues.push("Excessive page size");
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

    const isTemplateSite =
      html.includes("wix.com") ||
      html.includes("squarespace.com") ||
      html.includes("weebly.com") ||
      html.includes("godaddy.com/website-builder") ||
      html.includes("wordpress.com") ||
      html.includes("site123.com") ||
      html.includes("jimdo.com");

    if (isTemplateSite) {
      issues.push("Uses basic website builder (not custom)");
      score -= 5;
    }

    const socialMedia = extractSocialLinksFromHtml(html, $);

    const contactInfo = extractContactInfo(html, $, fullUrl);

    if (contactInfo.contactPageUrl && (contactInfo.emails.length === 0 || contactInfo.phones.length === 0)) {
      try {
        const contactPage = await scrapeContactPage(contactInfo.contactPageUrl);
        for (const email of contactPage.emails) {
          if (!contactInfo.emails.includes(email)) contactInfo.emails.push(email);
        }
        for (const phone of contactPage.phones) {
          const digits = phone.replace(/[^0-9]/g, "");
          const existingDigits = contactInfo.phones.map(p => p.replace(/[^0-9]/g, ""));
          if (!existingDigits.includes(digits)) contactInfo.phones.push(phone);
        }
      } catch {}
    }

    const hasContact = contactInfo.emails.length > 0 || contactInfo.phones.length > 0;

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      hasWebsite: true,
      socialMedia: socialMedia.length ? socialMedia : undefined,
      contactInfo: hasContact ? contactInfo : undefined,
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
