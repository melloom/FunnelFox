import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Globe, Loader2, Search, Sparkles } from "lucide-react";
import { insertLeadSchema } from "@shared/schema";
import type { Lead } from "@shared/schema";
import { useState } from "react";

const formSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  websiteUrl: z.string().optional().default(""),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  status: z.enum(["new", "contacted", "interested", "not_interested", "converted"]).default("new"),
  notes: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  websiteScore: z.number().nullable().optional(),
  websiteIssues: z.array(z.string()).nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddLeadPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [analyzing, setAnalyzing] = useState(false);

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
      status: "new",
      notes: "",
      source: "manual",
      websiteScore: null,
      websiteIssues: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/leads", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead added successfully" });
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

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      setAnalyzing(true);
      const res = await apiRequest("POST", "/api/analyze-website", { url });
      return res.json();
    },
    onSuccess: (data: { score: number; issues: string[] }) => {
      form.setValue("websiteScore", data.score);
      form.setValue("websiteIssues", data.issues);
      toast({ title: "Website analyzed", description: `Score: ${data.score}/100` });
      setAnalyzing(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Analysis failed",
        description: err.message,
        variant: "destructive",
      });
      setAnalyzing(false);
    },
  });

  const onSubmit = (values: FormValues) => {
    const submitValues = {
      ...values,
      websiteUrl: values.websiteUrl?.trim() || "none",
    };
    createMutation.mutate(submitValues);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-add-lead-title">Add New Lead</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Enter a potential client's details to add them to your pipeline
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Acme Corp"
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
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="www.example.com (or leave blank)"
                            {...field}
                            data-testid="input-website-url"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const url = form.getValues("websiteUrl");
                            if (url) analyzeMutation.mutate(url);
                          }}
                          disabled={analyzing || !form.getValues("websiteUrl")}
                          data-testid="button-analyze-website"
                        >
                          {analyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Leave blank if they don't have one — that's a great lead</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("websiteScore") !== null && form.watch("websiteScore") !== undefined && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <p className="text-sm font-medium">Website Analysis</p>
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-primary">
                          {form.watch("websiteScore")}
                        </span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    </div>
                    {form.watch("websiteIssues") && form.watch("websiteIssues")!.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.watch("websiteIssues")!.map((issue, i) => (
                          <span
                            key={i}
                            className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-md"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="City, State"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any initial observations about this potential client..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-lead"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Add Lead
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/leads")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
