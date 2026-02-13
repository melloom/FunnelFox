export function isAggregatorName(name: string): boolean {
  const lowName = name.toLowerCase();
  const directoryKeywords = [
    "yellow pages", "yellowpages", "yelp", "tripadvisor", 
    "mapquest", "direct", "top 10", "best barbers in", 
    "barbers in", "near me", "results for", "directory",
    "the real yellow pages", "business profile",
    "yellow book", "dexknows", "superpages"
  ];
  return directoryKeywords.some(kw => lowName.includes(kw));
}

export function isAggregatorSite(domain: string): boolean {
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
    "expertise.com", "therealyellowpages.com", "yellowpage.com",
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
    "google.com/maps", "maps.google.com", "google.com/search",
    "bing.com/maps", "bing.com/search", "duckduckgo.com/maps",
    "waze.com", "apple.com/maps", "transitapp.com", "moovit.com",
    "mapquest.com/directions", "directions.com",
  ];
  return aggregators.some((ex) => domain.includes(ex));
}

export function isExcludedDomain(domain: string): boolean {
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
    "googleads.g.doubleclick.net", "ad.doubleclick.net",
    "maps.google.com", "google.com/maps", "news.google.com",
  ];
  if (domain.endsWith(".gov")) return true;
  return excluded.some((ex) => domain.includes(ex));
}
