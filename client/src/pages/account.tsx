import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  User,
  Mail,
  Calendar,
  Crown,
  CreditCard,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Search,
  Users,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  CircleCheck,
  CircleX,
  Settings,
  ArrowRight,
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

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription"],
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/account");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot delete account",
        description: error.message,
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
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Could not open billing portal",
        variant: "destructive",
      });
    },
  });

  const hasActiveSubscription = subscription?.planStatus === "pro" && subscription?.stripeSubscriptionId;
  const canDelete = !hasActiveSubscription || subscription?.isAdmin;

  if (!user) return null;

  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "") || user.email[0]).toUpperCase();
  const memberSince = subscription?.memberSince
    ? new Date(subscription.memberSince).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Unknown";

  const isPro = subscription?.planStatus === "pro";
  const stripe = subscription?.stripe;
  const isCanceling = stripe?.cancelAtPeriodEnd;

  const discoveryPercent = subscription
    ? Math.min(100, (subscription.monthlyDiscoveriesUsed / (subscription.discoveryLimit === 999 ? 50 : subscription.discoveryLimit)) * 100)
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

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-account-title">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, subscription, and preferences</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </CardTitle>
          {getStatusBadge()}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-lg" data-testid="text-account-name">
                {user.firstName} {user.lastName || ""}
              </p>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate" data-testid="text-account-email">{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Member since {memberSince}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={isPro ? "border-primary/30" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              {isPro ? <Crown className="w-4 h-4 text-primary" /> : <CreditCard className="w-4 h-4" />}
              Subscription
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" data-testid="text-plan-name">
                {isPro ? "Pro Plan" : "Free Plan"}
              </span>
              {isPro && stripe?.priceAmount && (
                <span className="text-sm text-muted-foreground">
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
                  Your Pro access will end on {cancelDate}. You can resubscribe anytime from the billing portal.
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
                  Discoveries This Month
                </div>
                <span className="text-sm text-muted-foreground" data-testid="text-discovery-usage">
                  {subscription?.monthlyDiscoveriesUsed || 0} / {subscription?.discoveryLimit === 999 ? "Unlimited" : subscription?.discoveryLimit || 5}
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

          <Separator />

          {isPro && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Plan Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stripe?.status && (
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
                {stripe?.cardBrand && stripe?.cardLast4 && (
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
          )}

          {!isPro && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Upgrade to Pro</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>50 discoveries / month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Unlimited leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Gmail integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Full website scoring</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {!isPro && (
              <Button onClick={() => setLocation("/pricing")} data-testid="button-upgrade">
                <Crown className="w-4 h-4 mr-1.5" />
                Upgrade to Pro - $20/mo
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
            {isPro && subscription?.stripeCustomerId && !subscription?.isAdmin && (
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-billing"
              >
                <Settings className="w-4 h-4 mr-1.5" />
                {portalMutation.isPending ? "Opening..." : "Manage Billing"}
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
            {isPro && !subscription?.isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-cancel-sub"
              >
                {isCanceling ? "Resume Subscription" : "Cancel Subscription"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasActiveSubscription && !subscription?.isAdmin && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Active subscription detected</p>
                <p className="text-muted-foreground mt-1">
                  You must cancel your Pro subscription before deleting your account.
                  Go to the <button onClick={() => setLocation("/pricing")} className="underline text-primary cursor-pointer" data-testid="link-cancel-sub">Pricing page</button> to manage your subscription.
                </p>
              </div>
            </div>
          )}

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={!canDelete || deleteAccountMutation.isPending}
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">This will permanently delete your account and all your data including:</span>
                  <span className="block">- Your profile and login credentials</span>
                  <span className="block">- All saved leads and pipeline data</span>
                  <span className="block">- Your activity history and notes</span>
                  <span className="block font-medium mt-2">Type <span className="font-mono text-destructive">DELETE</span> to confirm:</span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="input-delete-confirm"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText("")} data-testid="button-cancel-delete">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteConfirmText !== "DELETE" || deleteAccountMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteAccountMutation.mutate();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
