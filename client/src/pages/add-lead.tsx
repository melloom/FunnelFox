import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  Link as LinkIcon,
  Search,
  Globe,
  Phone,
  MapPin,
  CheckCircle2,
  X,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Shield,
} from "lucide-react";
import { insertLeadSchema } from "@shared/schema";
import type { Lead } from "@shared/schema";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";

const formSchema = z.object({
  companyName: z.string().optional(),
  websiteUrl: z.string().optional().default("").refine((url) => {
    // Allow empty string (no website)
    if (!url || url.trim() === "") return true;
    // Allow "none"
    if (url.trim() === "none") return true;
    // Allow common URL formats
    const trimmedUrl = url.trim();
    const urlPatterns = [
      /^https?:\/\/.+/i,           // Full URLs
      /^www\..+/i,                 // www. domains
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}.*/i, // domain.tld format
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/i,  // simple domain.tld
    ];
    return urlPatterns.some(pattern => pattern.test(trimmedUrl));
  }, {
    message: "Enter a valid URL or leave empty (facebook.com/joes-pizza, www.joespizza.com, or https://joespizza.com)"
  }),
  contactName: z.string().optional(),
  contactEmail: z.string().email().or(z.literal("")).optional(),
  contactPhone: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().optional().default("new"),
});

type FormValues = z.infer<typeof formSchema>;

interface UrlLookupResult {
  companyName?: string;
  websiteUrl?: string;
  location?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialMedia?: string[];
  description?: string;
  sources?: string[];
  confidence?: 'high' | 'medium' | 'low';
}

interface BusinessSearchResult {
  name: string;
  url?: string;
  phone?: string;
  address?: string;
  source: string;
}

function normalizeForCompare(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeUrl(url: string): string {
  if (!url) return url;
  
  let normalized = url.trim();
  
  // Remove DuckDuckGo redirect parameters if present
  if (normalized.includes("uddg=")) {
    try {
      const urlParam = new URL(normalized, "https://duckduckgo.com").searchParams.get("uddg");
      if (urlParam) normalized = urlParam;
    } catch {}
  }
  
  // Ensure proper format for social media URLs
  if (normalized.includes("instagram.com") || normalized.includes("facebook.com")) {
    // Remove tracking parameters
    normalized = normalized.split('?')[0].split('#')[0];
    
    // Ensure it starts with https://
    if (!normalized.startsWith("http")) {
      normalized = "https://" + normalized;
    }
  }
  
  // For other URLs, ensure https:// if no protocol
  else if (!normalized.startsWith("http")) {
    normalized = "https://" + normalized;
  }
  
  return normalized;
}

function findDuplicates(name: string, website: string, leads: Lead[]): Lead[] {
  if (!name && !website) return [];
  const normalizedName = normalizeForCompare(name);
  const normalizedUrl = website
    ? website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase()
    : "";

  return leads.filter((lead) => {
    if (normalizedUrl && lead.websiteUrl && lead.websiteUrl !== "none") {
      const existingUrl = lead.websiteUrl
        .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").toLowerCase();
      if (existingUrl === normalizedUrl) return true;
    }
    if (normalizedName.length >= 3) {
      const existingName = normalizeForCompare(lead.companyName);
      if (existingName === normalizedName) return true;
      if (normalizedName.length >= 5 && (existingName.includes(normalizedName) || normalizedName.includes(existingName))) return true;
    }
    return false;
  });
}

function looksLikeUrl(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  return /^(https?:\/\/|www\.|[a-z0-9-]+\.(com|org|net|io|co|biz|info|me|us|uk|ca|facebook|instagram|yelp|bbb))/.test(trimmed.toLowerCase());
}

export default function AddLeadPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [urlLookupLoading, setUrlLookupLoading] = useState(false);
  const [urlLookupResult, setUrlLookupResult] = useState<UrlLookupResult | null>(null);
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState<BusinessSearchResult[]>([]);
  const [showNameResults, setShowNameResults] = useState(false);
  const nameSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: existingLeads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      websiteUrl: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      industry: "",
      location: "",
      notes: "",
      status: "new",
    },
  });

  // Add Escape key handler to close search results
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showNameResults) {
        setShowNameResults(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showNameResults]);

  const watchedName = form.watch("companyName");
  const watchedUrl = form.watch("websiteUrl");

  const duplicates = useMemo(
    () => findDuplicates(watchedName || "", watchedUrl || "", existingLeads),
    [watchedName, watchedUrl, existingLeads]
  );

  const handleUrlLookup = useCallback(async () => {
    const url = form.getValues("websiteUrl")?.trim();
    if (!url) return;
    setUrlLookupLoading(true);
    setUrlLookupResult(null);
    try {
      const res = await apiRequest("POST", "/api/lookup-url", { url });
      const data: UrlLookupResult = await res.json();
      setUrlLookupResult(data);

      if (data.companyName && !form.getValues("companyName")) {
        form.setValue("companyName", data.companyName);
      }
      if (data.websiteUrl && data.websiteUrl !== url) {
        form.setValue("websiteUrl", data.websiteUrl);
      }
      if (data.contactEmail && !form.getValues("contactEmail")) {
        form.setValue("contactEmail", data.contactEmail);
      }
      if (data.contactPhone && !form.getValues("contactPhone")) {
        form.setValue("contactPhone", data.contactPhone);
      }
      if (data.location && !form.getValues("location")) {
        form.setValue("location", data.location);
      }

      const fieldsFound = [
        data.companyName && "company name",
        data.contactEmail && "email",
        data.contactPhone && "phone",
        data.location && "location",
        data.websiteUrl && "website",
      ].filter(Boolean);

      const sourceCount = data.sources?.length || 0;
      if (fieldsFound.length > 0) {
        toast({ title: `Found ${fieldsFound.length} fields from ${sourceCount} source${sourceCount !== 1 ? 's' : ''}` });
      } else {
        toast({ title: "No info found from that URL", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to look up URL", variant: "destructive" });
    }
    setUrlLookupLoading(false);
  }, [form, toast]);

  const handleWrongLead = useCallback(() => {
    const currentUrl = form.getValues("websiteUrl");
    form.reset({
      companyName: "",
      websiteUrl: currentUrl || "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      industry: "",
      location: "",
      notes: "",
      status: "new",
    });
    setUrlLookupResult(null);
    toast({ title: "Cleared pre-filled info — enter details manually or try a different URL" });
  }, [form, toast]);

  const handleNameSearch = useCallback(async (searchName: string) => {
    if (!searchName || searchName.length < 3) {
      setNameSearchResults([]);
      setShowNameResults(false);
      return;
    }
    setNameSearchLoading(true);
    try {
      const loc = form.getValues("location") || "";
      const res = await apiRequest("POST", "/api/search-business", { name: searchName, location: loc });
      const data: BusinessSearchResult[] = await res.json();
      setNameSearchResults(data);
      setShowNameResults(data.length > 0);
    } catch {
      setNameSearchResults([]);
    }
    setNameSearchLoading(false);
  }, [form]);

  const selectSearchResult = useCallback(async (result: BusinessSearchResult) => {
    form.setValue("companyName", result.name);
    
    // Normalize and set the URL
    if (result.url) {
      const normalizedUrl = normalizeUrl(result.url);
      form.setValue("websiteUrl", normalizedUrl);
      console.log(`[selectSearchResult] Set normalized URL: ${normalizedUrl} (from: ${result.url})`);
    }
    
    if (result.phone && !form.getValues("contactPhone")) form.setValue("contactPhone", result.phone);
    if (result.address && !form.getValues("location")) form.setValue("location", result.address);
    setShowNameResults(false);
    setNameSearchResults([]);

    // Provide better feedback based on source
    const sourceMessages = {
      facebook: "Selected Facebook page — scraping for details...",
      instagram: "Selected Instagram page — scraping for details...", 
      yelp: "Selected Yelp listing — scraping for details...",
      official: "Selected official website — scraping for details...",
      web: "Selected business — searching for details..."
    };

    const message = sourceMessages[result.source as keyof typeof sourceMessages] || "Selected business — searching for details...";
    toast({ title: `${result.name} — ${message}` });

    if (result.url) {
      setUrlLookupLoading(true);
      setUrlLookupResult(null);
      try {
        const normalizedUrl = normalizeUrl(result.url);
        const res = await apiRequest("POST", "/api/lookup-url", { url: normalizedUrl });
        const data: UrlLookupResult = await res.json();
        setUrlLookupResult(data);

        if (data.companyName && data.companyName.length > result.name.length) {
          form.setValue("companyName", data.companyName);
        }
        if (data.websiteUrl) form.setValue("websiteUrl", data.websiteUrl);
        if (data.contactEmail && !form.getValues("contactEmail")) form.setValue("contactEmail", data.contactEmail);
        if (data.contactPhone && !form.getValues("contactPhone")) form.setValue("contactPhone", data.contactPhone);
        if (data.location && !form.getValues("location")) form.setValue("location", data.location);

        const sourceCount = data.sources?.length || 0;
        const fieldsFound = [
          data.contactEmail && "email",
          data.contactPhone && "phone",
          data.location && "location",
        ].filter(Boolean);

        if (fieldsFound.length > 0) {
          toast({ title: `Found ${fieldsFound.length} fields from ${sourceCount} source${sourceCount !== 1 ? 's' : ''}` });
        } else {
          toast({ title: `Selected: ${result.name}` });
        }
      } catch {
        toast({ title: `Selected: ${result.name}` });
      }
      setUrlLookupLoading(false);
    } else {
      toast({ title: `Selected: ${result.name} (no URL to scrape)` });
    }
  }, [form, toast]);

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...values,
        websiteUrl: values.websiteUrl?.trim() || "none",
        status: "new",
        source: "manual",
      });
      return res.json();
    },
    onSuccess: async (lead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead added — analyzing..." });
      setEnriching(true);
      try {
        await apiRequest("POST", `/api/leads/${lead.id}/enrich`);
        queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
        toast({ title: "Lead enriched with website data" });
      } catch {
        toast({ title: "Lead added (enrichment had issues)" });
      }
      setEnriching(false);
      setLocation("/leads");
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to add lead",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const isSubmitting = createMutation.isPending || enriching;

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-add-lead-title">Add Lead</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Paste a URL or enter a company name — we'll find the details
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      Paste a URL
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Optional: facebook.com/joes-pizza or www.joespizza.com"
                          autoComplete="url"
                          inputMode="url"
                          {...field}
                          data-testid="input-website-url"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleUrlLookup}
                        disabled={urlLookupLoading || !field.value?.trim()}
                        data-testid="button-lookup-url"
                      >
                        {urlLookupLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Paste any URL — we'll scrape it and search Yellow Pages, maps, and web for complete info
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {urlLookupLoading && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border" data-testid="url-lookup-loading">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium">Searching multiple sources...</p>
                    <p>Scraping URL, web searches, Yellow Pages, maps data</p>
                  </div>
                </div>
              )}

              {urlLookupResult && Object.keys(urlLookupResult).length > 0 && (
                <div className="rounded-md border overflow-hidden" data-testid="url-lookup-result">
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-chart-2/10 border-b border-chart-2/20">
                    <div className="flex items-center gap-2 min-w-0">
                      {urlLookupResult.confidence === 'high' ? (
                        <ShieldCheck className="w-4 h-4 text-chart-2 shrink-0" />
                      ) : urlLookupResult.confidence === 'medium' ? (
                        <Shield className="w-4 h-4 text-chart-4 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-xs font-medium text-chart-2">
                        {urlLookupResult.confidence === 'high' ? 'High confidence match' :
                         urlLookupResult.confidence === 'medium' ? 'Partial match' : 'Limited info found'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleWrongLead}
                      className="text-destructive shrink-0"
                      data-testid="button-wrong-lead"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Wrong lead
                    </Button>
                  </div>
                  <div className="p-2.5 space-y-1.5">
                    <div className="text-xs space-y-0.5">
                      {urlLookupResult.companyName && <p>Name: <strong>{urlLookupResult.companyName}</strong></p>}
                      {urlLookupResult.contactEmail && <p>Email: {urlLookupResult.contactEmail}</p>}
                      {urlLookupResult.contactPhone && <p>Phone: {urlLookupResult.contactPhone}</p>}
                      {urlLookupResult.location && <p>Location: {urlLookupResult.location}</p>}
                      {urlLookupResult.description && (
                        <p className="text-muted-foreground line-clamp-2">{urlLookupResult.description}</p>
                      )}
                    </div>
                    {urlLookupResult.sources && urlLookupResult.sources.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-muted-foreground">Sources:</span>
                        {urlLookupResult.sources.map((source, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {source.replace(/-/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="relative">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="e.g. Joe's Pizza"
                            autoComplete="organization"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              // Only trigger search if user explicitly clicks search button
                              // Don't automatically search on typing
                            }}
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleNameSearch(watchedName || "")}
                          disabled={nameSearchLoading || !watchedName?.trim()}
                          data-testid="button-search-name"
                          title="Search for this business online"
                        >
                          {nameSearchLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Type company name directly, or click search to find businesses online
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showNameResults && nameSearchResults.length > 0 && (
                  <div className="mt-1.5 border rounded-md bg-background shadow-md max-h-52 overflow-y-auto relative" data-testid="name-search-results">
                    <button
                      type="button"
                      onClick={() => setShowNameResults(false)}
                      className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background border hover:bg-muted transition-colors"
                      data-testid="button-close-search-results"
                      title="Close search and use your typed company name"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <div className="p-2 border-b bg-muted/30">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {nameSearchResults.length} result{nameSearchResults.length !== 1 ? "s" : ""} found — tap to select
                      </p>
                    </div>
                    {nameSearchResults.map((result, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left p-2.5 border-b last:border-b-0 hover-elevate cursor-pointer bg-transparent"
                        onClick={() => selectSearchResult(result)}
                        data-testid={`button-search-result-${i}`}
                      >
                        <div className="flex items-start gap-2">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{result.name}</p>
                            <div className="flex items-center gap-3 flex-wrap mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                {result.source}
                              </span>
                              {result.url && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[180px]">
                                  <Globe className="w-2.5 h-2.5 shrink-0" />
                                  {result.url}
                                </span>
                              )}
                              {result.phone && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Phone className="w-2.5 h-2.5 shrink-0" />
                                  {result.phone}
                                </span>
                              )}
                              {result.address && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[180px]">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {result.address}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t bg-muted/30 p-2">
                      <button
                        type="button"
                        className="w-full text-center p-2 text-xs text-primary bg-transparent cursor-pointer hover:bg-primary/10 transition-colors rounded border border-primary/20"
                        onClick={() => setShowNameResults(false)}
                        data-testid="button-use-my-input"
                      >
                        Use my typed company name instead
                      </button>
                      <button
                        type="button"
                        className="w-full text-center p-2 text-xs text-muted-foreground bg-transparent cursor-pointer hover:bg-muted/50 transition-colors mt-1"
                        onClick={() => setShowNameResults(false)}
                        data-testid="button-dismiss-search-results"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {duplicates.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20" data-testid="duplicate-warning">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-destructive">Possible duplicate{duplicates.length > 1 ? "s" : ""}</p>
                    <div className="mt-1.5 space-y-1">
                      {duplicates.slice(0, 3).map((dup) => (
                        <div key={dup.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate font-medium">{dup.companyName}</span>
                          {dup.websiteUrl && dup.websiteUrl !== "none" && (
                            <span className="truncate text-muted-foreground/70">({dup.websiteUrl})</span>
                          )}
                          <Badge variant="secondary" className="text-[10px] shrink-0">{dup.status}</Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      You can still add this lead if it's a different business
                    </p>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Full Address: 123 Main St, City, State 12345"
                        autoComplete="street-address"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!showMore && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground bg-transparent border-0 cursor-pointer p-0"
                  onClick={() => setShowMore(true)}
                  data-testid="button-show-more-fields"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  More details (optional)
                </button>
              )}

              {showMore && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground bg-transparent border-0 cursor-pointer p-0"
                    onClick={() => setShowMore(false)}
                    data-testid="button-hide-more-fields"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Hide extra fields
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Smith"
                              autoComplete="name"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-contact-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john@example.com"
                              autoComplete="email"
                              inputMode="email"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-contact-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 123-4567"
                              autoComplete="tel"
                              inputMode="tel"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-contact-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-industry">
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Restaurant">Restaurant</SelectItem>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Real Estate">Real Estate</SelectItem>
                              <SelectItem value="Legal">Legal</SelectItem>
                              <SelectItem value="Construction">Construction</SelectItem>
                              <SelectItem value="Fitness">Fitness</SelectItem>
                              <SelectItem value="Automotive">Automotive</SelectItem>
                              <SelectItem value="Beauty & Salon">Beauty & Salon</SelectItem>
                              <SelectItem value="Professional Services">Professional Services</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any initial observations..."
                            {...field}
                            value={field.value || ""}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-submit-lead"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {enriching ? "Analyzing..." : "Adding..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Add & Analyze
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/leads")}
                  disabled={isSubmitting}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>

              {isSubmitting && (
                <p className="text-xs text-muted-foreground">
                  Scraping website, extracting contacts, detecting technologies...
                </p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
