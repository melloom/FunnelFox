import * as cheerio from "cheerio";

interface ScrapedBusiness {
  name: string;
  url: string;
  description?: string;
  hasWebsite: boolean;
  source?: string;
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

  const queries = [
    `${category} ${location}`,
    `${category} shop ${location}`,
    `${category} ${location} local business`,
  ];

  const searches: Promise<ScrapedBusiness[]>[] = [];
  for (const query of queries) {
    searches.push(searchBing(query, maxResults, category));
  }
  searches.push(searchDuckDuckGo(`${category} ${location}`, maxResults, category));

  const results = await Promise.allSettled(searches);
  for (const result of results) {
    if (result.status === "fulfilled") {
      businesses.push(...result.value);
    }
  }

  const seen = new Set<string>();
  const unique: ScrapedBusiness[] = [];
  for (const biz of businesses) {
    const key = biz.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (!key || key.length < 3) continue;
    const domain = biz.url ? extractDomain(biz.url) : null;
    const dedupeKey = domain || key;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    unique.push(biz);
  }

  return unique.slice(0, maxResults);
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
      if (results.length >= maxResults) return false;

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
    const url = `https://www.bing.com/search?q=${encodedQuery}&count=${maxResults}`;

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
      if (results.length >= maxResults) return false;

      const title = $(el).find("h2 a").text().trim();
      const snippet = $(el).find(".b_caption p, .b_lineclamp2").text().trim();

      const cite = $(el).find("cite").text().trim();
      const actualUrl = extractUrlFromCite(cite);

      if (actualUrl && title) {
        const biz = processSearchResult(title, actualUrl, snippet, category);
        if (biz) results.push(biz);
      }
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
