import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import {
  Check,
  X,
  Zap,
  Crown,
  ArrowRight,
  Settings,
  Search,
  Users,
  Mail,
  Globe,
  BarChart3,
} from "lucide-react";

interface SubscriptionInfo {
  planStatus: string;
  monthlyDiscoveriesUsed: number;
  discoveryLimit: number;
  leadLimit: number | null;
  stripeSubscriptionId: string | null;
}

export default function PricingPage() {
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();

  const { data: subscription, isLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/sync-subscription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
    },
  });

  useEffect(() => {
    if (search.includes("success=true")) {
      syncMutation.mutate();
      toast({
        title: "Welcome to Pro!",
        description: "Your subscription is now active. Enjoy unlimited access.",
      });
      setLocation("/pricing", { replace: true });
    }
    if (search.includes("canceled=true")) {
      toast({
        title: "Checkout canceled",
        description: "No changes were made to your account.",
        variant: "destructive",
      });
      setLocation("/pricing", { replace: true });
    }
  }, [search]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Checkout failed",
        description: err.message || "Could not start checkout",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing-portal");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Could not open billing portal",
        variant: "destructive",
      });
    },
  });

  const isPro = subscription?.planStatus === "pro";

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const freeFeatures = [
    { text: "5 lead discoveries / month", included: true },
    { text: "25 saved leads max", included: true },
    { text: "Basic website analysis", included: true },
    { text: "Pipeline management", included: true },
    { text: "All data sources", included: false },
    { text: "Gmail integration", included: false },
    { text: "Bulk actions", included: false },
    { text: "Full website scoring", included: false },
  ];

  const proFeatures = [
    { text: "50 lead discoveries / month", included: true },
    { text: "Unlimited saved leads", included: true },
    { text: "Full website analysis & scoring", included: true },
    { text: "Pipeline management", included: true },
    { text: "All data sources (BBB, Google, Yelp)", included: true },
    { text: "Gmail integration", included: true },
    { text: "Bulk actions & export", included: true },
    { text: "Technology detection (50+)", included: true },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-pricing-title">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground">
          Find more clients with the right tools for your business
        </p>
      </div>

      {isPro && subscription && (
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Pro Plan Active</p>
                  <p className="text-xs text-muted-foreground">
                    {subscription.monthlyDiscoveriesUsed} / {subscription.discoveryLimit} discoveries used this month
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                <Settings className="w-3.5 h-3.5 mr-1" />
                {portalMutation.isPending ? "Opening..." : "Manage Billing"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={!isPro ? "ring-1 ring-border" : ""}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Free</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get started with basic lead discovery
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={feature.included ? "" : "text-muted-foreground/60"}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
            {!isPro && (
              <div className="pt-2">
                <Badge variant="secondary" className="w-full justify-center py-1.5">
                  Current Plan
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={isPro ? "ring-2 ring-primary" : "ring-1 ring-primary/30"}>
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2">
              <CardTitle className="text-lg">Pro</CardTitle>
              <Badge variant="default" className="text-[10px]">
                <Zap className="w-3 h-3 mr-0.5" />
                Popular
              </Badge>
            </div>
            <div className="mt-2">
              <span className="text-3xl font-bold">$20</span>
              <span className="text-muted-foreground text-sm">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Everything you need to find and win clients
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2.5">
              {proFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              {isPro ? (
                <Badge variant="default" className="w-full justify-center py-1.5">
                  <Crown className="w-3 h-3 mr-1" />
                  Current Plan
                </Badge>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                  data-testid="button-upgrade-pro"
                >
                  {checkoutMutation.isPending ? (
                    "Redirecting to checkout..."
                  ) : (
                    <>
                      Upgrade to Pro
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isPro && subscription && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Your Usage This Month</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Discoveries</p>
                  <p className="text-sm font-semibold">
                    {subscription.monthlyDiscoveriesUsed} / {subscription.discoveryLimit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Limit</p>
                  <p className="text-sm font-semibold">
                    {subscription.leadLimit ?? "Unlimited"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
