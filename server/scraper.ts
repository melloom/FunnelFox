import * as cheerio from "cheerio";

interface ScrapedBusiness {
  name: string;
  url: string;
  description?: string;
  hasWebsite: boolean;
  source?: string;
  phone?: string;
  address?: string;
}

interface WebsiteAnalysis {
  score: number;
  issues: string[];
  hasWebsite: boolean;
}

const SAFARI_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

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

  const searches: Promise<ScrapedBusiness[]>[] = [];

  for (const query of bingQueries) {
    searches.push(searchBing(query, maxResults, category));
  }
  for (const query of ddgQueries) {
    searches.push(searchDuckDuckGo(query, maxResults, category));
  }
  searches.push(searchOpenStreetMap(category, location, maxResults));

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleApiKey) {
    searches.push(searchGooglePlaces(category, location, maxResults, googleApiKey));
  }

  const results = await Promise.allSettled(searches);
  for (const result of results) {
    if (result.status === "fulfilled") {
      businesses.push(...result.value);
    }
  }

  const seen = new Map<string, ScrapedBusiness>();
  for (const biz of businesses) {
    const nameKey = biz.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (!nameKey || nameKey.length < 3) continue;
    const domain = biz.url ? extractDomain(biz.url) : null;
    const dedupeKey = domain || nameKey;

    const existing = seen.get(dedupeKey);
    if (existing) {
      if (!existing.phone && biz.phone) existing.phone = biz.phone;
      if (!existing.address && biz.address) existing.address = biz.address;
      if (!existing.url && biz.url) {
        existing.url = biz.url;
        existing.hasWebsite = true;
      }
      continue;
    }
    seen.set(dedupeKey, biz);
  }

  return Array.from(seen.values()).slice(0, maxResults);
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
        "User-Agent": SAFARI_UA,
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
        "User-Agent": SAFARI_UA,
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

export async function analyzeWebsite(targetUrl: string): Promise<WebsiteAnalysis> {
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
        "User-Agent": SAFARI_UA,
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
