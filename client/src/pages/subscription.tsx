import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Crown,
  CreditCard,
  Search,
  Users,
  Zap,
  Shield,
  Clock,
  CircleCheck,
  CircleX,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Calendar,
  Mail,
  TrendingUp,
  Check,
  X,
  BarChart3,
  Globe,
} from "lucide-react";

interface SubscriptionInfo {
  planStatus: string;
  monthlyDiscoveriesUsed: number;
  discoveryLimit: number;
  leadLimit: number | null;
  totalLeads: number;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  isAdmin: boolean;
  usageResetDate: string | null;
  memberSince: string | null;
  stripe: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAt: string | null;
    priceAmount: number | null;
    priceInterval: string | null;
    cardBrand: string | null;
    cardLast4: string | null;
  } | null;
}

export default function SubscriptionPage() {
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
      setLocation("/subscription", { replace: true });
    }
    if (search.includes("canceled=true")) {
      toast({
        title: "Checkout canceled",
        description: "No changes were made to your account.",
        variant: "destructive",
      });
      setLocation("/subscription", { replace: true });
    }
  }, [search]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/checkout");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({ title: "Checkout failed", description: err.message || "Could not start checkout", variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/billing-portal");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Could not open billing portal", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/cancel");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({ title: "Subscription canceled", description: "You'll keep Pro access until the end of your billing period." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/resume");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resume");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({ title: "Subscription resumed", description: "Your Pro plan will continue as normal." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isPro = subscription?.planStatus === "pro";
  const stripe = subscription?.stripe;
  const isCanceling = stripe?.cancelAtPeriodEnd;

  const discoveryPercent = subscription
    ? Math.min(100, (subscription.monthlyDiscoveriesUsed / (subscription.discoveryLimit === 999 ? 300 : subscription.discoveryLimit)) * 100)
    : 0;
  const leadPercent = subscription?.leadLimit
    ? Math.min(100, ((subscription.totalLeads || 0) / subscription.leadLimit) * 100)
    : 0;

  const resetDate = subscription?.usageResetDate
    ? new Date(subscription.usageResetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const periodEnd = stripe?.currentPeriodEnd
    ? new Date(stripe.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const cancelDate = stripe?.cancelAt
    ? new Date(stripe.cancelAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  function getStatusBadge() {
    if (subscription?.isAdmin) {
      return <Badge variant="default" data-testid="badge-plan-admin"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
    }
    if (isCanceling) {
      return <Badge variant="secondary" className="text-orange-600 dark:text-orange-400" data-testid="badge-plan-canceling"><Clock className="w-3 h-3 mr-1" />Canceling</Badge>;
    }
    if (stripe?.status === "active") {
      return <Badge variant="default" data-testid="badge-plan-active"><CircleCheck className="w-3 h-3 mr-1" />Active</Badge>;
    }
    if (stripe?.status === "past_due") {
      return <Badge variant="destructive" data-testid="badge-plan-past-due"><AlertTriangle className="w-3 h-3 mr-1" />Past Due</Badge>;
    }
    if (isPro) {
      return <Badge variant="default" data-testid="badge-plan-pro"><Crown className="w-3 h-3 mr-1" />Pro</Badge>;
    }
    return <Badge variant="secondary" data-testid="badge-plan-free">Free</Badge>;
  }

  const freeFeatures = [
    { text: "25 leads / month", included: true },
    { text: "25 saved leads max", included: true },
    { text: "Basic website analysis", included: true },
    { text: "Pipeline management", included: true },
    { text: "All data sources", included: false },
    { text: "Gmail integration", included: false },
    { text: "Bulk actions & export", included: false },
    { text: "Full website scoring", included: false },
  ];

  const proFeatures = [
    { text: "300 leads / month", included: true },
    { text: "Unlimited saved leads", included: true },
    { text: "Full website analysis & scoring", included: true },
    { text: "Pipeline management", included: true },
    { text: "All data sources (BBB, Google, Yelp)", included: true },
    { text: "Gmail integration", included: true },
    { text: "Bulk actions & export", included: true },
    { text: "Technology detection (50+)", included: true },
  ];

  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-subscription-title">Subscription</h1>
        <p className="text-muted-foreground">Manage your plan, usage, and billing</p>
      </div>

      <Card className={isPro ? "border-primary/30" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              {isPro ? <Crown className="w-5 h-5 text-primary" /> : <CreditCard className="w-5 h-5" />}
              {isPro ? "Pro Plan" : "Free Plan"}
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {isPro && stripe?.priceAmount && (
                <span className="text-sm text-muted-foreground" data-testid="text-plan-price">
                  ${stripe.priceAmount}/{stripe.priceInterval || "month"}
                </span>
              )}
            </div>
          </div>
          {isCanceling && cancelDate && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-orange-500/10 text-sm mt-2">
              <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-600 dark:text-orange-400">Subscription ending</p>
                <p className="text-muted-foreground">
                  Your Pro access will end on {cancelDate}. You can resume anytime before then.
                </p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  Leads This Month
                </div>
                <span className="text-sm text-muted-foreground" data-testid="text-discovery-usage">
                  {subscription?.monthlyDiscoveriesUsed || 0} / {subscription?.discoveryLimit === 999 ? "Unlimited" : subscription?.discoveryLimit || 25}
                </span>
              </div>
              <Progress value={subscription?.discoveryLimit === 999 ? 5 : discoveryPercent} className="h-2" />
              {resetDate && (
                <p className="text-xs text-muted-foreground mt-1">Resets {resetDate}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  Saved Leads
                </div>
                <span className="text-sm text-muted-foreground" data-testid="text-lead-usage">
                  {subscription?.totalLeads || 0} / {subscription?.leadLimit === null ? "Unlimited" : subscription?.leadLimit || 25}
                </span>
              </div>
              {subscription?.leadLimit ? (
                <Progress value={leadPercent} className="h-2" />
              ) : (
                <Progress value={3} className="h-2" />
              )}
            </div>
          </div>

          {isPro && stripe && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Billing Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stripe.status && (
                    <div className="flex items-center gap-2 text-sm">
                      {stripe.status === "active" ? (
                        <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <CircleX className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium capitalize">{isCanceling ? "Canceling" : stripe.status.replace("_", " ")}</span>
                    </div>
                  )}
                  {periodEnd && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{isCanceling ? "Access until:" : "Next billing:"}</span>
                      <span className="font-medium">{periodEnd}</span>
                    </div>
                  )}
                  {stripe.cardBrand && stripe.cardLast4 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Payment:</span>
                      <span className="font-medium capitalize">{stripe.cardBrand} ending {stripe.cardLast4}</span>
                    </div>
                  )}
                  {subscription?.isAdmin && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">Admin - Permanent Pro access</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {isPro && subscription?.isAdmin && !stripe && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">Admin - Permanent Pro access</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {isPro && subscription?.stripeCustomerId && !subscription?.isAdmin && (
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                {portalMutation.isPending ? "Opening..." : "Manage Billing"}
              </Button>
            )}
            {isPro && !subscription?.isAdmin && !isCanceling && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="button-cancel-sub"
                  >
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You'll keep Pro access until the end of your current billing period{periodEnd ? ` (${periodEnd})` : ""}. After that, your account will switch to the Free plan with limited features.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-dialog-dismiss">Keep Pro</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => cancelMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-cancel"
                    >
                      {cancelMutation.isPending ? "Canceling..." : "Yes, Cancel"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isPro && !subscription?.isAdmin && isCanceling && (
              <Button
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                data-testid="button-resume-sub"
              >
                <Zap className="w-4 h-4 mr-1.5" />
                {resumeMutation.isPending ? "Resuming..." : "Resume Subscription"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3" data-testid="text-plan-comparison">Plan Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={!isPro ? "ring-1 ring-border" : ""}>
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-base">Free</CardTitle>
              <div className="mt-1">
                <span className="text-2xl font-bold">$0</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Basic lead discovery</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={f.included ? "" : "text-muted-foreground/60"}>{f.text}</span>
                  </li>
                ))}
              </ul>
              {!isPro && (
                <Badge variant="secondary" className="w-full justify-center py-1.5 no-default-hover-elevate no-default-active-elevate">Current Plan</Badge>
              )}
              {isPro && !subscription?.isAdmin && isCanceling && (
                <p className="text-xs text-center text-muted-foreground">
                  You'll switch to this plan after cancellation
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={isPro ? "ring-2 ring-primary" : "ring-1 ring-primary/30"}>
            <CardHeader className="text-center pb-3">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-base">Pro</CardTitle>
                <Badge variant="default" className="text-[10px]">
                  <Zap className="w-3 h-3 mr-0.5" />
                  Popular
                </Badge>
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold">$30</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Everything to find and win clients</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              {isPro ? (
                <Badge variant="default" className="w-full justify-center py-1.5 no-default-hover-elevate no-default-active-elevate">
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
                  {checkoutMutation.isPending ? "Redirecting..." : (
                    <>
                      Upgrade to Pro
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
