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
import { Plus, Loader2, Sparkles, AlertTriangle, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { insertLeadSchema } from "@shared/schema";
import type { Lead } from "@shared/schema";
import { useState, useMemo } from "react";

const formSchema = insertLeadSchema.pick({
  companyName: true,
  websiteUrl: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  industry: true,
  location: true,
  notes: true,
}).extend({
  companyName: z.string().min(1, "Company name is required"),
  websiteUrl: z.string().optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeForCompare(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
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

export default function AddLeadPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showMore, setShowMore] = useState(false);
  const [enriching, setEnriching] = useState(false);

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
    },
  });

  const watchedName = form.watch("companyName");
  const watchedUrl = form.watch("websiteUrl");

  const duplicates = useMemo(
    () => findDuplicates(watchedName || "", watchedUrl || "", existingLeads),
    [watchedName, watchedUrl, existingLeads]
  );

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
          Add a company and we'll automatically scrape their website for details
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 pb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Joe's Pizza"
                        autoComplete="organization"
                        {...field}
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="www.example.com (optional)"
                        autoComplete="url"
                        inputMode="url"
                        {...field}
                        data-testid="input-website-url"
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      Leave blank if they don't have one — that's a great lead
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        placeholder="City, State"
                        autoComplete="address-level2"
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
