import * as cheerio from "cheerio";

interface ScrapedBusiness {
  name: string;
  url: string;
  description?: string;
}

interface WebsiteAnalysis {
  score: number;
  issues: string[];
}

export async function searchBusinesses(
  category: string,
  location: string,
  maxResults: number = 20
): Promise<ScrapedBusiness[]> {
  const businesses: ScrapedBusiness[] = [];
  const query = `${category} ${location} website`;

  try {
    const searches = [
      searchDuckDuckGo(query, maxResults),
      searchBing(query, maxResults),
    ];

    const results = await Promise.allSettled(searches);

    for (const result of results) {
      if (result.status === "fulfilled") {
        businesses.push(...result.value);
      }
    }
  } catch (err) {
    console.error("Search error:", err);
  }

  const seen = new Set<string>();
  const unique: ScrapedBusiness[] = [];
  for (const biz of businesses) {
    const domain = extractDomain(biz.url);
    if (!domain || seen.has(domain)) continue;
    if (isExcludedDomain(domain)) continue;
    seen.add(domain);
    unique.push(biz);
  }

  return unique.slice(0, maxResults);
}

async function searchDuckDuckGo(
  query: string,
  maxResults: number
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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return results;

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

      if (actualUrl && title && isValidBusinessUrl(actualUrl)) {
        results.push({
          name: cleanBusinessName(title),
          url: normalizeUrl(actualUrl),
          description: snippet || undefined,
        });
      }
    });
  } catch (err) {
    console.error("DuckDuckGo search error:", err);
  }

  return results;
}

async function searchBing(
  query: string,
  maxResults: number
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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return results;

    const html = await response.text();
    const $ = cheerio.load(html);

    $("li.b_algo").each((_i, el) => {
      if (results.length >= maxResults) return false;

      const linkEl = $(el).find("h2 a");
      const href = linkEl.attr("href") || "";
      const title = linkEl.text().trim();
      const snippet = $(el).find(".b_caption p").text().trim();

      if (href && title && isValidBusinessUrl(href)) {
        results.push({
          name: cleanBusinessName(title),
          url: normalizeUrl(href),
          description: snippet || undefined,
        });
      }
    });
  } catch (err) {
    console.error("Bing search error:", err);
  }

  return results;
}

export async function analyzeWebsite(targetUrl: string): Promise<WebsiteAnalysis> {
  const issues: string[] = [];
  let score = 100;

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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const loadTime = Date.now() - startTime;

    if (!response.ok) {
      issues.push("Website returns error status");
      score -= 30;
      return { score: Math.max(0, score), issues };
    }

    const finalUrl = response.url;
    if (!finalUrl.startsWith("https://")) {
      issues.push("No HTTPS");
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

    const title = $("title").text().trim();
    if (!title || title.length < 3) {
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

    const hasSsl = $('link[rel="stylesheet"][href^="https"]').length > 0 ||
      $('script[src^="https"]').length > 0;

    const hasContactForm = html.includes("contact") || html.includes("form");
    const hasCTA = $('a[href*="contact"], a[href*="quote"], a[href*="book"], button').length > 0;

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

  } catch (err: any) {
    if (err.name === "AbortError") {
      issues.push("Website timed out (>10s)");
      score -= 30;
    } else {
      issues.push("Website unreachable");
      score -= 40;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
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

function isExcludedDomain(domain: string): boolean {
  const excluded = [
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com",
    "reddit.com", "wikipedia.org", "yelp.com", "yellowpages.com",
    "bbb.org", "google.com", "bing.com", "duckduckgo.com",
    "amazon.com", "ebay.com", "craigslist.org", "indeed.com",
    "glassdoor.com", "tripadvisor.com", "angieslist.com",
    "thumbtack.com", "homeadvisor.com", "nextdoor.com",
    "mapquest.com", "apple.com", "microsoft.com",
  ];
  return excluded.some((ex) => domain.includes(ex));
}

function isValidBusinessUrl(url: string): boolean {
  try {
    let fullUrl = url;
    if (!fullUrl.startsWith("http")) fullUrl = `https://${fullUrl}`;
    const parsed = new URL(fullUrl);
    const domain = parsed.hostname.replace(/^www\./, "");
    return !isExcludedDomain(domain) && domain.includes(".");
  } catch {
    return false;
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
  return title
    .replace(/\s*[-|–—]\s*.+$/, "")
    .replace(/\s*\|.*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
