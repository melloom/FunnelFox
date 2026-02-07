import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  MapPin,
  Building2,
  Globe,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  MapPinned,
  LocateFixed,
  Mail,
  Camera,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import type { Lead } from "@shared/schema";

const CATEGORIES = [
  { label: "Restaurant", value: "restaurant" },
  { label: "Pizza Shop", value: "pizza shop" },
  { label: "Coffee Shop / Cafe", value: "coffee shop" },
  { label: "Bakery", value: "bakery" },
  { label: "Bar / Pub", value: "bar" },
  { label: "Food Truck", value: "food truck" },
  { label: "Barber Shop", value: "barber shop" },
  { label: "Hair Salon", value: "hair salon" },
  { label: "Nail Salon", value: "nail salon" },
  { label: "Spa / Massage", value: "spa" },
  { label: "Tattoo Shop", value: "tattoo shop" },
  { label: "Dentist", value: "dentist" },
  { label: "Chiropractor", value: "chiropractor" },
  { label: "Veterinarian", value: "veterinarian" },
  { label: "Auto Repair / Mechanic", value: "auto repair shop" },
  { label: "Auto Detailing", value: "auto detailing" },
  { label: "Towing Service", value: "towing service" },
  { label: "Plumber", value: "plumber" },
  { label: "Electrician", value: "electrician" },
  { label: "HVAC / AC Repair", value: "hvac company" },
  { label: "Roofing Company", value: "roofing company" },
  { label: "Landscaping / Lawn Care", value: "landscaping" },
  { label: "Cleaning Service", value: "cleaning service" },
  { label: "Pest Control", value: "pest control" },
  { label: "Moving Company", value: "moving company" },
  { label: "Gym / Fitness Studio", value: "gym" },
  { label: "Yoga Studio", value: "yoga studio" },
  { label: "Martial Arts Studio", value: "martial arts" },
  { label: "Dance Studio", value: "dance studio" },
  { label: "Daycare / Childcare", value: "daycare" },
  { label: "Dog Groomer", value: "dog groomer" },
  { label: "Pet Boarding / Kennel", value: "pet boarding" },
  { label: "Florist", value: "florist" },
  { label: "Photographer", value: "photographer" },
  { label: "Jeweler", value: "jewelry store" },
  { label: "Dry Cleaner / Laundromat", value: "dry cleaner" },
  { label: "Printing Shop", value: "print shop" },
  { label: "Accountant / CPA", value: "accountant" },
  { label: "Insurance Agent", value: "insurance agency" },
  { label: "Real Estate Agent", value: "real estate agent" },
];

interface DiscoverResult {
  found: number;
  new: number;
  skipped: number;
  leads: Lead[];
  cached?: boolean;
  page?: number;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  let color = "text-chart-5";
  let label = "Poor";
  if (score >= 70) {
    color = "text-chart-2";
    label = "Good";
  } else if (score >= 40) {
    color = "text-chart-4";
    label = "Fair";
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-bold ${color}`}>{score}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export default function DiscoverPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [location, setLocationValue] = useState("");
  const [maxResults, setMaxResults] = useState("5");
  const [results, setResults] = useState<DiscoverResult | null>(null);
  const [geolocating, setGeolocating] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [lastSearch, setLastSearch] = useState<{ category: string; location: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [maxResultsInitialized, setMaxResultsInitialized] = useState(false);

  const { data: subscription } = useQuery<{
    planStatus: string;
    monthlyDiscoveriesUsed: number;
    discoveryLimit: number;
    leadLimit: number | null;
  }>({
    queryKey: ["/api/subscription"],
  });

  if (subscription && !maxResultsInitialized) {
    setMaxResults(subscription.planStatus === "pro" ? "20" : "5");
    setMaxResultsInitialized(true);
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support location detection", variant: "destructive" });
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=10`,
            { headers: { "User-Agent": "FunnelFox/1.0" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || "";
          const state = addr.state || "";
          const locationStr = [city, state].filter(Boolean).join(", ");
          if (locationStr) {
            setLocationValue(locationStr);
            toast({ title: "Location found", description: locationStr });
          } else {
            toast({ title: "Couldn't determine city", description: "Try entering your location manually", variant: "destructive" });
          }
        } catch {
          toast({ title: "Location lookup failed", description: "Try entering your location manually", variant: "destructive" });
        }
        setGeolocating(false);
      },
      () => {
        toast({ title: "Location access denied", description: "Allow location access or enter it manually", variant: "destructive" });
        setGeolocating(false);
      },
      { timeout: 10000 }
    );
  };

  const startDiscover = (page: number = 1) => {
    const searchCategory = category === "custom" ? customCategory : category;
    if (!searchCategory || !location) return;

    const isSameSearch = lastSearch?.category === searchCategory && lastSearch?.location === location;
    const nextPage = page > 1 ? page : (isSameSearch ? searchPage : 1);

    setLastSearch({ category: searchCategory, location });
    setSearchPage(nextPage);
    discoverMutation.mutate(nextPage);
  };

  const discoverMutation = useMutation({
    mutationFn: async (page: number) => {
      const searchCategory = category === "custom" ? customCategory : category;
      if (!searchCategory || !location) {
        throw new Error("Please fill in both category and location");
      }
      const res = await apiRequest("POST", "/api/discover", {
        category: searchCategory,
        location,
        maxResults: parseInt(maxResults),
        page,
      });
      return res.json() as Promise<DiscoverResult>;
    },
    onSuccess: (data) => {
      setResults(data);
      const nextPage = (data.page || 1) + 1;
      setSearchPage(nextPage);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({
        title: `Found ${data.new} new leads`,
        description: data.cached
          ? `${data.found} businesses from cache, ${data.skipped} already in pipeline`
          : `${data.found} businesses searched, ${data.skipped} already in pipeline`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Discovery failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-discover-title">
          Discover Leads
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Search for businesses by category and location. We'll analyze their websites and add prospects to your pipeline.
        </p>
        {subscription && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={subscription.planStatus === "pro" ? "default" : "secondary"} data-testid="badge-plan-status">
              {subscription.planStatus === "pro" ? "Pro" : "Free"} Plan
            </Badge>
            <span className="text-xs text-muted-foreground" data-testid="text-discovery-usage">
              {subscription.monthlyDiscoveriesUsed} / {subscription.discoveryLimit} discoveries used this month
            </span>
            {subscription.planStatus !== "pro" && subscription.monthlyDiscoveriesUsed >= subscription.discoveryLimit && (
              <a href="/pricing" className="text-xs text-primary hover:underline" data-testid="link-upgrade">
                Upgrade for more
              </a>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Search Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Business Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-discover-category">
                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom category...</SelectItem>
                  </SelectContent>
                </Select>
                {category === "custom" && (
                  <Input
                    placeholder="Enter custom category..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    data-testid="input-custom-category"
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Austin, TX or Miami, FL"
                      value={location}
                      onChange={(e) => setLocationValue(e.target.value)}
                      className="pl-9"
                      data-testid="input-discover-location"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGeolocate}
                    disabled={geolocating}
                    data-testid="button-geolocate"
                  >
                    {geolocating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LocateFixed className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-end gap-3 flex-wrap sm:flex-nowrap">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Results</label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger className="w-[100px]" data-testid="select-max-results">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subscription?.planStatus === "pro" ? (
                      <>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => startDiscover()}
                disabled={
                  discoverMutation.isPending ||
                  (!category && !customCategory) ||
                  !location
                }
                data-testid="button-start-discovery"
              >
                {discoverMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Discover Leads
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {discoverMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Searching the web for businesses...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Finding websites, analyzing quality, and scoring each one. This may take a moment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results && !discoverMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{results.found}</strong> found
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-chart-2" />
                <span className="text-sm">
                  <strong>{results.new}</strong> new leads added
                </span>
              </div>
              {results.skipped > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-chart-4" />
                  <span className="text-sm">
                    <strong>{results.skipped}</strong> already in pipeline
                  </span>
                </div>
              )}
              {results.cached && (
                <Badge variant="secondary" data-testid="badge-cached">
                  <Zap className="w-3 h-3 mr-1" />
                  From cache
                </Badge>
              )}
            </div>
            {results.new > 0 && (
              <Link href="/leads">
                <Button variant="outline" size="sm" data-testid="button-view-all-leads">
                  View All Leads
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            )}
          </div>

          {results.leads.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No new leads found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {results.skipped > 0
                    ? "All discovered businesses are already in your pipeline."
                    : "Try a different category or location to find more prospects."}
                </p>
                {searchPage <= 3 && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => startDiscover(searchPage)}
                    disabled={discoverMutation.isPending}
                    data-testid="button-search-deeper-empty"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Deeper
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {results.leads.map((lead) => (
                <Card
                  key={lead.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedLead(lead)}
                  data-testid={`card-discovered-lead-${lead.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-sm font-semibold truncate">
                            {lead.companyName}
                          </h3>
                          <Badge variant="outline" className="bg-chart-1/15 text-chart-1 border-0 text-xs">
                            New
                          </Badge>
                        </div>
                        {lead.websiteUrl && lead.websiteUrl !== "none" ? (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Globe className="w-3 h-3 shrink-0" />
                            {lead.websiteUrl}
                          </p>
                        ) : (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            No website - high value lead
                          </p>
                        )}
                        {lead.contactPhone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            {lead.contactPhone}
                          </p>
                        )}
                        {lead.location && lead.location !== location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPinned className="w-3 h-3 shrink-0" />
                            {lead.location}
                          </p>
                        )}
                        {lead.websiteIssues && lead.websiteIssues.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {lead.websiteIssues.slice(0, 3).map((issue, i) => (
                              <span
                                key={i}
                                className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-md"
                              >
                                {issue}
                              </span>
                            ))}
                            {lead.websiteIssues.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{lead.websiteIssues.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <ScoreBadge score={lead.websiteScore} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {searchPage <= 3 && (
                <Card>
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Want to find more businesses in this area?
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => startDiscover(searchPage)}
                      disabled={discoverMutation.isPending}
                      data-testid="button-search-deeper"
                    >
                      {discoverMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching deeper...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search Deeper
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {!results && !discoverMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-base font-medium">Ready to find leads</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose a business category and location above, then hit "Discover Leads". We'll
                search the web, find businesses, analyze their websites, and add any with
                weak or outdated sites to your pipeline.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="sm:max-w-lg max-sm:text-sm max-sm:pb-[calc(1rem+env(safe-area-inset-bottom,16px))]">
          {selectedLead && (() => {
            const lead = selectedLead;
            const noWebsite = !lead.websiteUrl || lead.websiteUrl === "none";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <span className="break-words min-w-0">{lead.companyName}</span>
                  </DialogTitle>
                  <DialogDescription className="max-sm:text-xs">Newly discovered lead</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 sm:space-y-4 mt-1 sm:mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-chart-1/15 text-chart-1 border-0 text-xs">New Lead</Badge>
                    <ScoreBadge score={lead.websiteScore} />
                    {noWebsite && <Badge variant="secondary" className="text-xs">No website</Badge>}
                  </div>
                  <div className="space-y-2.5">
                    {!noWebsite && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 truncate" data-testid="link-discover-lead-website">{lead.websiteUrl}</a>
                      </div>
                    )}
                    {lead.contactEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a href={`mailto:${lead.contactEmail}`} className="text-primary underline underline-offset-2 truncate">{lead.contactEmail}</a>
                      </div>
                    )}
                    {lead.contactPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a href={`tel:${lead.contactPhone}`} className="text-primary underline underline-offset-2">{lead.contactPhone}</a>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{lead.location}</span>
                      </div>
                    )}
                  </div>
                  {lead.websiteIssues && lead.websiteIssues.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Website Issues</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lead.websiteIssues.map((issue, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{issue}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {!noWebsite && lead.screenshotUrl && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">Website Screenshot</p>
                      </div>
                      <div className="rounded-md border overflow-hidden">
                        <img src={lead.screenshotUrl} alt={`Screenshot of ${lead.companyName}`} className="w-full h-auto max-h-40 sm:max-h-60 object-cover object-top" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                    <Link href="/leads">
                      <Button size="sm" className="w-full sm:w-auto" data-testid="button-discover-view-in-pipeline">
                        <ArrowRight className="w-3.5 h-3.5 mr-1" />
                        View in Pipeline
                      </Button>
                    </Link>
                    {!noWebsite && (
                      <a href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto" data-testid="button-discover-visit-site">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Visit Website
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
